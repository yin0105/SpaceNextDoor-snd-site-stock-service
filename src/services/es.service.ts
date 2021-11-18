import Axios from "axios";

import db from "../util/database";
import logger from "../util/logger";
import appConfig from "../config";
import {
    ISpacePrice,
    ISiteAddress,
    ISpace,
    ISpaceFeatureEntity,
    ISiteFeatureEntity,
    ISite,
    ISiteMapping,
} from "../interfaces/es.interface";
import { SpaceStatus } from "../interfaces/app.enum";

export class ElasticSearchService {
    constructor() {
        //
    }

    public async createUpdateSite(siteId: number, createSite = false): Promise<boolean> {
        try {
            const site: ISite = await this.getSite(siteId);
            const esSiteMapping: ISiteMapping = {
                id: site.id,
                name: {
                    en: site.name_en,
                    th: site.name_th,
                    kr: site.name_kr,
                    jp: site.name_jp,
                },
                description: {
                    en: site.description_en,
                    th: site.description_th,
                    kr: site.description_kr,
                    jp: site.description_jp,
                },
                property_type: site.property_type_id,
                images: site.images,
                stock_management_type: site.stock_management_type,
                is_featured: site.is_featured,
                status: site.status,
                address: {
                    country_id: site.address.country_id,
                    city_id: site.address.city_id,
                    district_id: site.address.district_id,
                    street: site.address.street,
                    postal_code: site.address.postal_code,
                    geo_location: {
                        lon: site.address.lng || 0,
                        lat: site.address.lat || 0,
                    },
                },
                features: site.features,
                total_active_spaces: site.spaces.filter(space=>!!space.price).
                                        filter(space=>space.status === SpaceStatus.ACTIVE).length,
                spaces: site.spaces.map(space => {
                    if (!space.price) {
                        return null;
                    }

                    return {
                        id: space.id,
                        name: space.name,
                        size: space.size,
                        height: space.height,
                        width: space.width,
                        length: space.length,
                        size_unit: space.size_unit,
                        description: space.description,
                        status: space.status,
                        available_units: space.available_units,
                        total_units: space.total_units,
                        space_type: space.platform_space_type_id,
                        price: {
                            pre_day: +space.price?.price_per_day || 0,
                            pre_week: +space.price?.price_per_week || 0,
                            pre_month: +space.price?.price_per_month || 0,
                            pre_year: +space.price?.price_per_year || 0,
                            currency: space.price?.currency,
                            currency_sign: space.price?.currency_sign,
                            type: space.price?.type,
                            start_date: space.price?.start_date,
                            end_date: space.price?.end_date,
                        },
                        features: space.features,
                    };
                }).filter(Boolean),
            };

            try {
                const query = { query: { match: { id: siteId } } };
                const result = await Axios.get(`${appConfig.elasticSearch.server}/sites/_search`, { data: query });

                if (result?.data?.hits?.total?.value >= 1) {
                    // update
                    await Axios.put(`${appConfig.elasticSearch.server}/sites/_doc/${result?.data?.hits?.hits[0]?._id}`, esSiteMapping);
                    logger.info(`Site updated for id: ${siteId}`);
                } else if (createSite) {
                    logger.info(`Adding site doc for id: ${siteId}`);
                    const createdDoc = await Axios.post(`${appConfig.elasticSearch.server}/sites/_doc`, esSiteMapping);
                    if (typeof createdDoc.data._id != "undefined") {
                        logger.info(`Site Doc Added for id: ${siteId} ==> ${createdDoc.data._id}`);
                    } else {
                        logger.error(`Error on site doc adding: ${siteId}`);
                        console.error(result.data);
                    }
                }

                return true;
            } catch (error) {
                console.error({
                    error: JSON.stringify(error.response.data.error),
                    code: error.response.status,
                    title: error.response.statusText,
                });
                return false;
            }

        } catch (err) {
            logger.error("Error on creating/updating site");
            console.error(err);
            return false;
        }
    }

    public async deleteSite(siteId: number): Promise<boolean> {
        try {
            const query = { query: { match: { id: siteId } } };
            const result = await Axios.get(`${appConfig.elasticSearch.server}/sites/_search`, { data: query });

            if (result?.data?.hits?.total?.value >= 1) {
                // delete
                await Axios.delete(`${appConfig.elasticSearch.server}/sites/_doc/${result?.data?.hits?.hits[0]?._id}`);
                logger.info(`Site deleted for id: ${siteId}`);
            } else {
                logger.info(`Site not found to delete: ${siteId}`);
            }

            return true;
        } catch (error) {
            console.error({
                error: JSON.stringify(error.response.data.error),
                code: error.response.status,
                title: error.response.statusText,
            });
            return false;
        }
    }

    public async updateSites(siteIds: number[]): Promise<boolean> {
        try {
            logger.info(`Updating bulk sites in ES: ${siteIds}`);

            let i, j, chunkSiteIds;
            const chunk = 20;
            for (i = 0, j = siteIds.length; i < j; i += chunk) {
                chunkSiteIds = siteIds.slice(i, i + chunk);
                await Promise.all(chunkSiteIds.map(id => this.createUpdateSite(id)));
            }

            logger.info("Sites updated in ES");
            return true;
        } catch (err) {
            logger.error("Error on updating bulk sites");
            console.error(err);
            return false;
        }
    }

    private async getSite(id: number): Promise<ISite> {
        const [results] = await db.query(`SELECT * from sites where id=${id}`);

        if (!results?.length) {
            throw new Error(`Site not found: ${id}`);
        }

        const site: ISite = results[0] as any;

        const featureIds = await this.getSiteFeatureIds(site.id);
        const address = await this.getSiteAddress(site.address_id);
        const spaces = await this.getSiteSpaces(site.id);
        return {
            ...site,
            features: featureIds,
            address,
            spaces,
        };

    }

    private async getSiteAddress(id: number): Promise<ISiteAddress> {
        const [results] = await db.query(`SELECT * from site_addresses where id=${id}`);

        if (results?.length) {
            return results[0] as any;
        }

        return {} as any;

        // throw new Error(`Address not found: ${id}`);
    }

    private async getSiteFeatureIds(siteId: number): Promise<number[]> {
        const [results] = await db.query(`SELECT * from site_features where site_id=${siteId}`);

        return results
            .filter((feature: ISiteFeatureEntity) => feature.site_id === siteId)
            .map((feature: ISiteFeatureEntity) => feature.feature_id);
    }

    private async getSiteSpaces(siteId: number): Promise<ISpace[]> {
        const [results] = await db.query(`SELECT * from spaces where site_id=${siteId}`);

        const features = await this.getSpaceFeatures(results.map((space: ISpace) => space?.id));
        const prices = await this.getSpacePrices(results.map((space: ISpace) => space?.id));

        return results.map((space: ISpace) => {
            const price: ISpacePrice = prices.find((price: ISpacePrice) => price.space_id === space.id);
            return {
                ...space,
                features: features
                    .filter((feature: ISpaceFeatureEntity) => feature.space_id === space.id)
                    .map((feature: ISpaceFeatureEntity) => feature.feature_id),
                price,
            };
        });
    }

    private async getSpaceFeatures(spaceIds: number[]) {
        if (!spaceIds.length) {
            return [];
        }

        const [results] = await db.query(`SELECT * from space_features where space_id IN (${spaceIds})`);

        return results;
    }

    private async getSpacePrices(spaceIds: number[]): Promise<ISpacePrice[]> {
        if (!spaceIds.length) {
            return [];
        }

        const [results] = await db.query(`SELECT * from prices where space_id IN (${spaceIds})`);

        return results as any;
    }
}