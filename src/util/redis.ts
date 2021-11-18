import redis, { RedisClient } from "redis";

import logger from "../util/logger";
import appConfig from "../config";


class RedisService {
    public client: RedisClient;
    constructor() {
        //
    }

    public connect(): void {
        if (!this.client) {
            this.client = redis.createClient(appConfig.redis.url);
            this.client.on("connect", this.log("Redis connected"));
            this.client.on("ready", this.log("Redis ready"));
            this.client.on("reconnecting", this.log("Redis reconnecting"));
            this.client.on("error", this.log("Redis error"));
            this.client.on("end", this.log("Redis end"));
        }
    }

    private log(type: string) {
        return function () {
            // eslint-disable-next-line prefer-rest-params
            logger.log("info", type, arguments);
        };
    }
}

export default new RedisService();