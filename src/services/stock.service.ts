import dayJS, { Dayjs } from "dayjs";
import { RedisClient } from "redis";
import {
    Op,
} from "sequelize";

import logger from "../util/logger";
import redis from "../util/redis";

import { IAvailableSite, IAvailableSpace } from "../interfaces/stock.interface";
import { SiteModel } from "../models/site.model";
import { SpaceModel } from "../models/space.model";
import { BookingModel } from "../models/booking.model";
import { BookingStatus, StockManagementType } from "../interfaces/app.enum";

const CLEANING_DAYS = 3;

interface ISpace extends IAvailableSpace {
    site_id: number;
    date_temp?: Dayjs;
}

const activeStatuses = [
    BookingStatus.ACTIVE,
    BookingStatus.CONFIRMED,
    BookingStatus.RESERVED,
];

interface IUpdateStockOptions {
    only_return?: boolean
}

interface IStockDataResp {
    date: string;
    data: ISpace;
    date_temp?: Dayjs;
}

interface IStockSiteData {
    [k: number]: IStockSiteDatesData;
}

interface IStockSiteDatesData {
    [k: string]: ISpace[];
}

export class StockService {
    private readonly redisClient: RedisClient;
    constructor() {
        this.redisClient = redis.client;
    }

    private getSiteKey(id: number, date: Dayjs | string): string {
        if (typeof date === "string") {
            return `site:${id}:${date}`;
        }

        return `site:${id}:${this.getKeyDate(date)}`;
    }

    private getKeyDate(date: Dayjs): string {
        return `${date.add(12, "hour").format("YYYYMMDD")}`;
    }

    public async filterStock(siteIds: number[], moveInDate: Date, moveOutDate?: Date): Promise<IAvailableSite[]> {
        logger.info(`[StockService]: Validate Stock ${moveInDate} - ${siteIds}`);

        const redisKeys = siteIds.map(id => this.getSiteKey(id, dayJS(moveInDate)));

        return new Promise((resolve, reject) => {
            this.redisClient.mget(...redisKeys, (err, sitesSpaces) => {
                if (err) {
                    console.log(err);
                    return reject(err);
                }

                //
                const sites = sitesSpaces
                    .filter(Boolean)
                    .map(this.formatSiteSpacesStock)
                    .map((singleSiteSpaces: ISpace[]) => {
                        const site: IAvailableSite = {
                            id: singleSiteSpaces[0]?.site_id,
                            spaces: singleSiteSpaces?.map((s: ISpace) => {
                                const { site_id, ...rest } = s;
                                return { ...rest };
                            }).filter(space => {
                                if (space.available_units <= 0) return false;
                                if (!space.available_until) return true;

                                if (dayJS(moveOutDate).isBefore(dayJS(space.available_until))) {
                                    return space;
                                }
                            }),
                        };
                        return site;
                    })
                    .filter(site => site.spaces.length)
                    ;
                //
                resolve(sites);
            });
        });
    }

    private formatSiteSpacesStock(spaces: string): IAvailableSpace[] {
        try {
            return JSON.parse(spaces).filter(Boolean);
        } catch {
            return [];
        }
    }

    public async updateSpaceStock(spaceId: number, siteId: number, type: StockManagementType = StockManagementType.SND, options: IUpdateStockOptions = {}): Promise<IStockDataResp[]> {
        logger.info(`[StockService]: Update Stock spaceId: ${spaceId}, ${siteId}, ${type}`);

        const today = dayJS();
        const dateAfterMonth = today.add(1, "month");
        const stocks: IStockDataResp[] = [];

        let space: SpaceModel;
        if (type !== StockManagementType.AFFILIATE) {
            space = await this.getSpaceToUpdateStock(spaceId, today, dateAfterMonth);
            if (!space || !space?.site) {
                logger.error(`[StockService]: Update Stock spaceId: ${spaceId} not found`);
                return;
            }
        }

        const promises = [];
        for (let date = today; date.isBefore(dateAfterMonth); date = date.add(1, "day")) {
            const availableUnits = this.getAvailableUnits(type, space, date);

            if (availableUnits <= 0) {
                continue;
            }

            let availableUntil = null;
            if (type != StockManagementType.AFFILIATE) {
                availableUntil = this.getLastStockAvailableDate(space, availableUnits, date);
            }


            stocks.push({
                date: this.getKeyDate(date),
                date_temp: date,
                data: {
                    id: spaceId,
                    site_id: siteId,
                    available_units: availableUnits,
                    available_until: availableUntil,
                }
            });

            if (!options?.only_return) {
                promises.push(this.upsertSpaceStock(siteId, spaceId, today, date, availableUnits, availableUntil));
            }
        }

        if (options?.only_return) {
            return stocks;
        }

        await Promise.all(promises);
        logger.info(`[StockService]: Update Stock spaceId: ${spaceId} COMPLETED`);
        return stocks;

    }

    public async updateSpaceStockBySites(siteIds: number[]): Promise<number[]> {
        logger.info(`[StockService]: Update Stock Sites: ${siteIds}`);

        const sites = await SiteModel.findAll({
            where: {
                id: { [Op.in]: siteIds },
            },
            include: [{
                model: SpaceModel,
                attributes: ["id"]
            }],
            logging: false
        });

        if (!sites || !sites?.length) {
            return [];
        }

        const affiliateSites = sites.filter(site => site.stock_management_type === StockManagementType.AFFILIATE);
        const otherSites = sites.filter(site => site.stock_management_type !== StockManagementType.AFFILIATE);

        const promises: any[] = [];
        for (const site of affiliateSites) {
            logger.info(`[StockService]: Update Affiliate Site: ${site.id}`);
            (site?.spaces || []).forEach(space => {
                promises.push(this.updateSpaceStock(space.id, site.id, site.stock_management_type, { only_return: true }));
            });

            logger.info(`[StockService]: END for site id: ${site.id} ==> Total: ${site?.spaces?.length}`);
            logger.info("==================================================================================");
        }

        const spacesStockAffiliateSites = (await Promise.all(promises)) as any as IStockDataResp[][];


        const spacesStockOtherSites = [];
        for (const site of otherSites) {
            logger.info(`[StockService]: Update Site: ${site.id}`);
            for (const space of (site?.spaces || [])) {
                const spacesStockOtherSite = await this.updateSpaceStock(space.id, site.id, site.stock_management_type, { only_return: true });
                spacesStockOtherSites.push(spacesStockOtherSite);
            }
            logger.info(`[StockService]: END for site id: ${site.id} ==> Total: ${site?.spaces?.length}`);
            logger.info("==================================================================================");
        }

        const spacesStockByDates = spacesStockAffiliateSites.concat(spacesStockOtherSites);

        const stockBySites: IStockSiteData = {};
        spacesStockByDates.forEach(spaces => {
            spaces?.forEach(space => {
                const sId = space?.data.site_id;
                stockBySites[sId] = stockBySites[sId] || {};
                stockBySites[sId][space?.date] = stockBySites[sId][space?.date] || [];
                stockBySites[sId][space?.date].push({
                    date_temp: space.date_temp,
                    ...space.data
                });
            });
        });

        await this.upsertSiteStock(stockBySites);

        logger.info(`[StockService]: COMPLETED UPDATING SITES STOCK: ${sites.map(s => s.id)}`);
        return stockBySites as any;
    }

    private async getSpaceToUpdateStock(id: number, today: Dayjs, dateAfterMonth: Dayjs) {
        return SpaceModel.findOne({
            where: {
                id,
                stock_management_type: { [Op.ne]: StockManagementType.AFFILIATE }
            },
            logging: false,
            include: [
                { model: SiteModel },
                {
                    model: BookingModel,
                    attributes: ["id", "move_in_date", "move_out_date"],
                    required: false,
                    where: {
                        status: { [Op.in]: activeStatuses },
                        [Op.or]: [
                            {
                                [Op.and]: [
                                    {
                                        move_in_date: { [Op.lte]: dateAfterMonth.toDate() },
                                    },
                                    {
                                        move_out_date: { [Op.gte]: today.toDate() },
                                    },
                                ],
                            },
                            {
                                [Op.and]: [
                                    {
                                        move_in_date: { [Op.lte]: dateAfterMonth.toDate() },
                                    },
                                    {
                                        move_out_date: { [Op.eq]: null },
                                    },
                                ],
                            },
                        ],
                    }
                }
            ],
            order: [
                [{ model: BookingModel, as: "bookings" }, "move_in_date", "ASC"],
            ]
        });
    }

    /**
     * Update stock in Redis for one space of a site
     */
    private async upsertSpaceStock(siteId: number, spaceId: number, today: Dayjs, date: Dayjs, availableUnits: number, availableUntil: Date | null) {
        const spaceStockUnit: ISpace = {
            id: spaceId,
            site_id: siteId,
            available_units: availableUnits,
            available_until: availableUntil,
        };

        return new Promise((resolve, reject) => {
            this.redisClient.get(this.getSiteKey(siteId, date), (err, result) => {
                if (err) {
                    logger.error(`Error on fetching site key data ${siteId}`);
                    return resolve(true);
                }

                const spaceStock = this.formatSiteSpacesStock(result).filter(obj => obj.id !== spaceId);
                spaceStock.push(spaceStockUnit);

                // set expiry date one day after the key date
                const expDate = date.add(1, "day");
                const expMS = expDate.diff(today, "seconds");

                this.redisClient.setex(this.getSiteKey(siteId, date), expMS, JSON.stringify(spaceStock), (err, reply) => {
                    if (err) {
                        logger.error(`Error on setting site key data ${siteId}`);
                        return resolve(true);
                    }

                    return resolve(true);
                });
            });
        });
    }

    /**
     * Update stock in Redis for all sites/spaces provided
     */
    private async upsertSiteStock(stockBySites: IStockSiteData) {
        const promises: any = [];
        const today = dayJS();
        for (const siteId in stockBySites) {
            const sId = Number(siteId);
            const stockByDate = stockBySites[sId];
            for (const dateStr in stockByDate) {
                const spacesStock = stockByDate[dateStr];
                promises.push(new Promise((resolve, reject) => {
                    this.redisClient.get(this.getSiteKey(sId, dateStr), (err, result) => {
                        if (err) {
                            logger.error(`Error on fetching site key data ${sId}`);
                            return resolve(true);
                        }

                        // const spaceIds = spacesStock.map(s => s.id);
                        if (spacesStock.length) {

                            const stockWODate = spacesStock.map(s => {
                                const { date_temp, ...rest } = s;
                                return {
                                    ...rest
                                };
                            });
                            // const spaceStock = this.formatSiteSpacesStock(result).filter(obj => !spaceIds.find(id => id === obj.id)).concat(stockWODate);
                            const spaceStock = stockWODate;

                            // set expiry date one day after the key date
                            const expDate = spacesStock[0].date_temp.add(1, "day");
                            const expMS = expDate.diff(today, "seconds");

                            this.redisClient.setex(this.getSiteKey(sId, dateStr), expMS, JSON.stringify(spaceStock), (err, reply) => {
                                if (err) {
                                    logger.error(`Error on setting site key data ${sId}`);
                                    return resolve(true);
                                }

                                return resolve(true);
                            });
                        } else {
                            resolve(true);
                        }
                    });
                }));
            }
        }

        return promises;
    }

    private getAvailableUnits(type: StockManagementType, space: SpaceModel, date: Dayjs): number {
        let stock = space?.available_units;

        if (type === StockManagementType.SND) {
            const activeBookingsOnDate = this.getActiveBookingsByDate(space, date);
            const units = space.total_units - activeBookingsOnDate?.length;
            stock = isNaN(units) || units < 0 ? 0 : units;
        } else if (type === StockManagementType.AFFILIATE) {
            // IMPORTANT: hardcode it 10(more than 0) so it can show in listings
            stock = 10;
        }

        return stock;
    }

    private getActiveBookingsByDate(space: SpaceModel, date: Dayjs) {        
        return space.bookings.filter(booking => {
            if (booking.move_out_date) {
                // We need to make unavailable booked units for 72h from the date of move out so 
                // we can clean the facilities
                const withCleaningDays = dayJS(booking.move_out_date).add(CLEANING_DAYS, "days");
                if (dayJS(booking.move_in_date).isBefore(date) && date.isBefore(withCleaningDays)) {
                    return true;
                }
            } else {
                if (dayJS(booking.move_in_date).isBefore(date)) {
                    return true;
                }
            }
            return false;
        });
    }

    public getLastStockAvailableDate(
        space: SpaceModel,
        availableUnits: number,
        date: Dayjs,
    ): Date {
        if (availableUnits <= 0) {
            return null;
        }


        // If space has 4 units in total and only 3 are booked, 1 unit can still be freely
        // booked, we return null for the stock available date
        const activeBookingsOnDate = this.getActiveBookingsByDate(space, date);
        if (space.total_units > activeBookingsOnDate?.length) {
            return null;
        }

        const veryNextBooking = space.bookings.find(booking => dayJS(booking.move_in_date).isAfter(date));

        return veryNextBooking
            ? dayJS(veryNextBooking.move_in_date).subtract(1, "day").toDate()
            : null;
    }
}