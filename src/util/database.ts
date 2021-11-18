import { Sequelize } from "sequelize-typescript";

import appConfig from "../config";
import { SiteModel } from "../models/site.model";
import { SpaceModel } from "../models/space.model";
import { BookingModel } from "../models/booking.model";

// Connect to DB
const sequelize = new Sequelize(
    appConfig.db.name,
    appConfig.db.username,
    appConfig.db.password,
    {
        dialect: "postgres",
        host: appConfig.db.host,
        port: appConfig.db.port,
        pool: {
            max: 100,
        },
    },
);

sequelize.addModels([SiteModel, SpaceModel, BookingModel]);

(async () => {
    await sequelize.sync();
})();

export default sequelize;
