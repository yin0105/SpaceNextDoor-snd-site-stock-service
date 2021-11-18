import winston, { format } from "winston";

import appConfig from "../config";

const options: winston.LoggerOptions = {
    format: format.combine(
        format.timestamp({
            // format: "YYYY-MM-DD HH:mm:ss"
        }),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}` + (info.splat !== undefined ? `${info.splat}` : " "))
    ),
    transports: [
        new winston.transports.Console({
            level: "debug", // appConfig.env === "production" ? "error" : "debug",
        }),
        // new winston.transports.File({ filename: "debug.log", level: "debug" }),
    ],
};

const logger = winston.createLogger(options);

if (appConfig.env !== "production") {
    logger.debug("Logging initialized at debug level");
}

export default logger;
