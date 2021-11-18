import logger from "../util/logger";
import appConfig from "../config";
import { StockService } from "./stock.service";
import broker from "../util/rabbitmq";
import { IStockListenerEvent } from "../interfaces/stock.interface";
import { ElasticSearchService } from "./es.service";

//
const CONSUMER = "snd-stock-service-consumer";

interface IQueueData {
    space_id?: number;
    site_id?: number;
    site_ids?: number[];
    is_created?: boolean;
    is_deleted?: boolean;
}

class QListenerService {
    constructor() {
        //
    }

    public async subscribe(): Promise<void> {
        try {
            await broker.connect();
            const ch = broker.channel;

            // Subscribe to sites/spaces related updates queue
            await ch.consume(appConfig.rabbitmq.update_es_q, (msg) => {
                logger.info(`Message on queue: "${appConfig.rabbitmq.update_es_q}"`);

                try {
                    const data: IQueueData = JSON.parse(msg.content.toString());
                    logger.info(msg.content.toString());
                    const service = new ElasticSearchService();

                    if (data?.site_id && data?.is_created) {
                        // add timeout just for create site, to make sure the transaction is created form the API side
                        setTimeout(() => {
                            logger.info(`Add site to ES:: ${data?.site_id}`);
                            service.createUpdateSite(data?.site_id, data?.is_created);
                        }, 10000);
                    } else if (data?.site_id && data?.is_deleted) {
                        service.deleteSite(data?.site_id);
                    } else if (data?.site_id) {
                        service.createUpdateSite(data?.site_id);
                    } else {
                        logger.info(`Q "${appConfig.rabbitmq.update_stock_q}" not entertained ${JSON.stringify(data)}`);
                    }
                } catch (err) {
                    logger.error(err);
                }

                ch.ack(msg);
                // ch.cancel(CONSUMER);
            }, { consumerTag: `${CONSUMER}-es` });


            // Subscribe to bookings related updates queue
            await ch.consume(appConfig.rabbitmq.update_stock_q, (msg) => {
                logger.info(`Message on queue: "${appConfig.rabbitmq.update_stock_q}"`);
                try {
                    const data: IStockListenerEvent = JSON.parse(msg.content.toString());
                    logger.info(msg.content.toString());
                    const stockService = new StockService();

                    if (data?.site_ids) {
                        stockService.updateSpaceStockBySites(data?.site_ids);
                    } else if (data?.space_id) {
                        stockService.updateSpaceStock(data?.space_id, data?.site_id, data?.stock_management_type);
                    } else {
                        logger.info(`Q "${appConfig.rabbitmq.update_stock_q}" not entertained ${JSON.stringify(data)}`);
                    }

                } catch (err) {
                    logger.error(err);
                }

                // todo: send ack after operation completes
                ch.ack(msg);
            }, { consumerTag: `${CONSUMER}-stock` });
        } catch (err) {
            logger.error("Failed to subscribe", err);
            throw new Error(err);
        }
    }
}

export default new QListenerService();
