import { Request, Response } from "express";
import Joi from "joi";

import { IAvailableSite } from "../interfaces/stock.interface";
import { StockService } from "../services/stock.service";
import { ElasticSearchService } from "../services/es.service";

export const filterByAvailableStock = async (req: Request, res: Response): Promise<IAvailableSite> => {
    try {
        // validate payload
        const schema = Joi.object({
            site_ids: Joi.array().items(Joi.number()).required().min(1),
            move_in_date: Joi.date().required(),
            move_out_date: Joi.date().optional(),
        }).required();

        const { error, value } = schema.validate(req.body);
        if (error) {
            res.status(400).send({ error: "Bad Request", message: "Invalid data" });
            return;
        }

        const stockService = new StockService();
        const filteredSites = await stockService.filterStock(value?.site_ids, value.move_in_date);
        res.send({ sites: filteredSites });
    } catch (err) {
        res.statusCode = 500;
        res.send({ status: "fail", error: err?.message });
    }
};

export const updateSpaceStock = async (req: Request, res: Response): Promise<{ status: string }> => {
    try {
        // validate payload
        const schema = Joi.object({
            space_id: Joi.number().required(),
            site_id: Joi.number().required(),
            stock_management_type: Joi.string().required(),
        }).required();

        const { error } = schema.validate(req.body);
        if (error) {
            res.status(400).send({ error: "Bad Request", message: "Invalid data" });
            return;
        }

        const stockService = new StockService();
        await stockService.updateSpaceStock(req.body?.space_id, req.body?.site_id, req.body?.stock_management_type);
        res.send({ status: "success" });
    } catch (err) {
        res.statusCode = 500;
        res.send({ status: "fail", error: err?.message });
    }
    return;
};

export const updateSpaceStockBySites = async (req: Request, res: Response): Promise<{ status: string }> => {
    try {
        const stockService = new StockService();
        const updatedSites = await stockService.updateSpaceStockBySites(req.body?.site_ids || []);
        res.send({ status: "success", updatedSites: updatedSites });
    } catch (err) {
        res.statusCode = 500;
        res.send({ status: "fail", error: err?.message });
    }
    return;
};

export const updateESBySite = async (req: Request, res: Response): Promise<{ status: string }> => {
    if (!req.body?.site_id && !req.body?.site_ids) {
        res.send({ status: "fail", data: "Invalid request" });
        return;
    }

    try {
        const service = new ElasticSearchService();

        let data;
        if (req.body?.site_id) {
            data = await service.createUpdateSite(req.body?.site_id, req.body?.create_site);
        } else if (req.body?.site_ids) {
            data = await service.updateSites(req.body?.site_ids);
        }
        res.send({ status: "success", data });
    } catch (err) {
        res.statusCode = 500;
        res.send({ status: "fail", error: err?.message });
    }
    return;
};
