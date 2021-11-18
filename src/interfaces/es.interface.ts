import { StockManagementType } from "./app.enum";

export interface ISpacePrice {
    id: number;
    space_id: number;
    price_per_day?: number;
    price_per_week?: number;
    price_per_month: number;
    price_per_year?: number;
    currency: string;
    currency_sign: string;
    type: string;
    start_date?: Date;
    end_date?: Date;
}

export interface ISiteAddress {
    id: number;
    lat: number;
    lng: number;
    country_id: number;
    city_id: number;
    district_id: number;
    postal_code: string;
    street: string;
    flat?: string;
}

export interface ISpace {
    id: number;
    name?: string;
    size: number;
    height: number;
    width: number;
    length: number;
    size_unit: string;
    price: ISpacePrice;
    status: string;
    total_units: number;
    available_units?: number;
    stock_available_until?: Date;
    images?: string[];
    features: number[];
    space_type?: string;
    description?: string;
    platform_space_type_id?: number;
}

export interface ISpaceFeatureEntity {
    space_id: number;
    feature_id: number;
}

export interface ISiteFeatureEntity {
    site_id: number;
    feature_id: number;
}

export interface ISite {
    id: number;
    name?: string;
    name_en?: string;
    name_th?: string;
    name_jp?: string;
    name_kr?: string;
    description?: string;
    description_en?: string;
    description_th?: string;
    description_jp?: string;
    description_kr?: string;
    floor?: number;
    is_featured: boolean;
    property_type_id: number;

    stock_management_type: StockManagementType;
    provider_type: string;
    distance?: number;
    address?: ISiteAddress;
    images?: string[];
    spaces: ISpace[];
    features: number[];
    address_id: number;
    status: string;
}

export interface INameMapping {
    en: string;
    th: string;
    kr: string;
    jp: string;
}
export interface ISiteMapping {
    id: number;
    name: INameMapping;
    description: INameMapping;
    property_type: number;
    total_active_spaces: number;
    images: string[];
    is_featured: boolean;

    stock_management_type: StockManagementType;
    address: IAddressMapping;
    features: number[];
    spaces: ISpaceMapping[];
    status: string;
}

export interface IAddressMapping {
    country_id: number;
    city_id: number;
    district_id: number;
    street: string;
    postal_code: string;
    geo_location: {
        lon: number;
        lat: number;
    }
}

export interface ISpaceMapping {
    id: number;
    name: string;
    size: number;
    height: number;
    width: number;
    length: number;
    size_unit: string;
    // dimensions_unit: string;
    description: string;
    status: string;
    available_units?: number;
    total_units: number;
    space_type: number;
    price: IPriceMapping;
    features: number[];
}

export interface IPriceMapping {
    pre_day?: number;
    pre_week?: number;
    pre_month: number;
    pre_year?: number;
    currency: string;
    currency_sign: string;
    type: string;
    start_date?: Date;
    end_date?: Date;
}