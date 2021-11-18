export enum BookingStatus {
    RESERVED = "RESERVED",
    CONFIRMED = "CONFIRMED",
    ACTIVE = "ACTIVE",
    TERMINATED = "TERMINATED",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}

export enum SiteStatus {
    DRAFT = "DRAFT",
    REJECTED = "REJECTED",
    READY_TO_REVIEW = "READY_TO_REVIEW",
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE"
}

export enum StockManagementType {
    THIRD_PARTY = "THIRD_PARTY",
    SND = "SND",
    AFFILIATE = "AFFILIATE"
}

export enum SpaceStatus {
    ACTIVE = "ACTIVE",
    IN_ACTIVE = "IN_ACTIVE",
    ARCHIVED = "ARCHIVED",
    REJECTED = "REJECTED",
    READY_TO_REVIEW = "READY_TO_REVIEW",
    DRAFT = "DRAFT"
}
