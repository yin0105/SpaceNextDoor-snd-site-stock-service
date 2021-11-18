
import express from "express";
import cors from "cors";
import compression from "compression";  // compresses requests
import bodyParser from "body-parser";
import { Sequelize } from "sequelize-typescript";

import * as healthController from "./controllers/health";
import * as siteController from "./controllers/site";
import { SiteModel } from "./models/site.model";
import { SpaceModel } from "./models/space.model";
import { BookingModel } from "./models/booking.model";


import appConfig from "./config";

// initiate redis client
import redisInstance from "./util/redis";
import QListenerService from "./services/listener.service";


// Create Express server
const app = express();

app.use(cors());

// connect redis
redisInstance.connect();

// subscribe rabbit mq
QListenerService.subscribe();



// Connect to DB
const sequelize = new Sequelize(appConfig.db.name,
    appConfig.db.username,
    appConfig.db.password,
    {
        dialect: "postgres",
        host: appConfig.db.host,
        port: appConfig.db.port,
    }
);

sequelize.addModels([SiteModel, SpaceModel, BookingModel]);

(async () => {
    await sequelize.sync();
})();


// Express configuration
app.set("port", appConfig.port);
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Primary app routes.
 */
app.get("/health", healthController.index);
app.post("/api/sites/filter-by-stock", siteController.filterByAvailableStock);
app.post("/api/sites/update-stock", siteController.updateSpaceStock);
app.post("/api/sites/update-stock-by-sites", siteController.updateSpaceStockBySites);
app.post("/api/sites/update-es-by-site", siteController.updateESBySite);


export default app;
