import { Request, Response } from "express";
import logger from "../util/logger";

export const index = (req: Request, res: Response) => {
    res.send({ health: "Healthy!" });
};