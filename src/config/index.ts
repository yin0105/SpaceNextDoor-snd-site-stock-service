import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

export default {
  port: process.env.PORT || 4002,
  env: process.env.NODE_ENV || "development",
  host: process.env.HOST || "localhost",
  redis: {
    url: process.env.RDS_URL,
  },
  db: {
    dialect: process.env.DB_DIALECT,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    exchange: process.env.SND_EXCHANGE,
    update_es_key: process.env.SND_UPDATE_ES_KEY,
    update_es_q: process.env.SND_UPDATE_ES_QUEUE,
    update_stock_key: process.env.SND_UPDATE_STOCK_KEY,
    update_stock_q: process.env.SND_UPDATE_STOCK_QUEUE,
  },
  elasticSearch: {
    server: process.env.ES_SERVER_STR,
  }
};
