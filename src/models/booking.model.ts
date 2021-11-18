import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  Model,
  PrimaryKey,
  UpdatedAt,
  CreatedAt,
  Sequelize,
  Table,
} from "sequelize-typescript";


import { SiteModel } from "./site.model";
import { SpaceModel } from "./space.model";
import { BookingStatus } from "../interfaces/app.enum";

@Table({
  modelName: "BookingModel",
  tableName: "bookings",
})
export class BookingModel extends Model<BookingModel> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  @Index
  id: number;

  @AllowNull(false)
  @Column(DataType.DATE)
  move_in_date: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  move_out_date: Date;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  auto_renewal: boolean;

  @AllowNull(false)
  @ForeignKey(() => SiteModel)
  @Column(DataType.INTEGER)
  site_id: number;

  @AllowNull(false)
  @ForeignKey(() => SpaceModel)
  @Column(DataType.INTEGER)
  space_id: number;

  @AllowNull(false)
  @Default(BookingStatus.RESERVED)
  @Column(
    DataType.ENUM(
      BookingStatus.ACTIVE,
      BookingStatus.CANCELLED,
      BookingStatus.COMPLETED,
      BookingStatus.CONFIRMED,
      BookingStatus.RESERVED,
      BookingStatus.TERMINATED,
    ),
  )
  status: BookingStatus;

  @CreatedAt
  @Default(Sequelize.fn("NOW"))
  @Column(DataType.DATE)
  created_at: Date;

  @UpdatedAt
  @Default(Sequelize.fn("NOW"))
  @Column(DataType.DATE)
  updated_at: Date;

  //
  // Relation/Association between the other tables

  @BelongsTo(() => SiteModel)
  site: SiteModel;

  @BelongsTo(() => SpaceModel)
  space: SpaceModel;
}
