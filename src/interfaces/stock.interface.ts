import { StockManagementType } from "./app.enum";

export interface IAvailableSpace {
    id: number;
    available_units: number;
    available_until?: Date;
}
export interface IAvailableSite {
    id: number;
    spaces: IAvailableSpace[]
}

export interface IStockListenerEvent {
    site_ids?: number[];

    // to update single spaces' stock
    space_id?: number;
    site_id?: number;
    stock_management_type?: StockManagementType
}