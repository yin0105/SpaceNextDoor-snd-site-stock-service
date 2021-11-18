import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Index,
  Model,
  PrimaryKey,
  UpdatedAt,
  CreatedAt,
  Sequelize,
  Table,
} from "sequelize-typescript";

import { BookingModel } from "./booking.model";
import { SiteModel } from "./site.model";
import { SpaceStatus, StockManagementType } from "../interfaces/app.enum";


@Table({
  modelName: "SpaceModel",
  tableName: "spaces",
})
export class SpaceModel extends Model<SpaceModel> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  @Index
  id: number;

  // @AllowNull(true)
  // @Column(DataType.STRING)
  // name: string;

  // @AllowNull(true)
  // @Column(DataType.TEXT)
  // description: string;

  @AllowNull(false)
  @Default(SpaceStatus.DRAFT)
  @Column(
    DataType.ENUM(
      SpaceStatus.ACTIVE,
      SpaceStatus.ARCHIVED,
      SpaceStatus.DRAFT,
      SpaceStatus.IN_ACTIVE,
      SpaceStatus.READY_TO_REVIEW,
      SpaceStatus.REJECTED,
    ),
  )
  status: SpaceStatus;

  @AllowNull(false)
  @ForeignKey(() => SiteModel)
  @Column(DataType.INTEGER)
  site_id: number;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  total_units: number;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  available_units: number;

  @AllowNull(true)
  @Column(
    DataType.ENUM(
      StockManagementType.SND,
      StockManagementType.THIRD_PARTY,
      StockManagementType.AFFILIATE,
    ),
  )
  @Index
  stock_management_type: StockManagementType;

  @AllowNull(true)
  @Column(DataType.STRING)
  third_party_space_id: string;

  @CreatedAt
  @Default(Sequelize.fn("NOW"))
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Default(Sequelize.fn("NOW"))
  @Column(DataType.DATE)
  updated_at: Date;


  //
  @BelongsTo(() => SiteModel)
  site: SiteModel;

  @HasMany(() => BookingModel)
  bookings: BookingModel[];
}
