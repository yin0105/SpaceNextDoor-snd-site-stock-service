import Amqp, { Channel } from "amqplib";

import logger from "../util/logger";
import appConfig from "../config";

const EXCHANGE_TYPE = "direct";

class RabbitMQService {
    public channel: Channel;
    constructor() {
        //
    }

    public async connect(): Promise<void> {
        try {
            const connection = await Amqp.connect(appConfig.rabbitmq.url);

            await connection.on("close", function (event) {
                logger.info(`Rabbit mq connection close: ${event}`);
            });
            await connection.on("error", function (err) {
                logger.error(`Rabbit mq connection error: ${err}`);
            });
            await connection.on("blocked", function (reason) {
                logger.error(`Rabbit mq connection blocked: ${reason}`);
            });
            await connection.on("unblocked", function (reason) {
                logger.info(`Rabbit mq connection unblocked: ${reason}`);
            });

            logger.info(`Successfully connected to rabbit mq url ==> ${appConfig.rabbitmq.url}`);
            try {
                this.channel = await connection.createChannel();

                const channel = await connection.createChannel();
                await channel.assertExchange(appConfig.rabbitmq.exchange, EXCHANGE_TYPE);
                await channel.assertQueue(appConfig.rabbitmq.update_stock_q);
                channel.bindQueue(appConfig.rabbitmq.update_stock_q, appConfig.rabbitmq.exchange, appConfig.rabbitmq.update_stock_key);

                await channel.assertQueue(appConfig.rabbitmq.update_es_q);
                channel.bindQueue(appConfig.rabbitmq.update_es_q, appConfig.rabbitmq.exchange, appConfig.rabbitmq.update_es_key);

                logger.info("Successfully created rabbit mq channel");
            } catch (err) {
                logger.error(`Failed to create a new channel for the rabbitmq connection with this url ==> ${appConfig.rabbitmq.url}`, err);
            }
        } catch (err) {
            logger.error(`Failed to connect with the rabbitmq url ==> ${appConfig.rabbitmq.url}`, err);
            throw new Error(err);
        }
    }
}

export default new RabbitMQService();