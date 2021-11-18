import {
  AllowNull,
  AutoIncrement,
  Column,
  DataType,
  Default,
  Index,
  Model,
  PrimaryKey,
  UpdatedAt,
  CreatedAt,
  Sequelize,
  Table,
  HasMany,
} from "sequelize-typescript";

import { SpaceModel } from "./space.model";
import { SiteStatus, StockManagementType } from "../interfaces/app.enum";

interface ISiteEntity {
  id: number
}

@Table({
  modelName: "SiteModel",
  tableName: "sites",
})
export class SiteModel extends Model<ISiteEntity> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  @Index
  id: number;

  // @AllowNull(true)
  // @Column(DataType.STRING)
  // name_en: string;


  // @AllowNull(true)
  // @Column(DataType.TEXT)
  // description_en: string;

  @AllowNull(false)
  @Default(SiteStatus.DRAFT)
  @Column(
    DataType.ENUM(
      SiteStatus.ACTIVE,
      SiteStatus.DRAFT,
      SiteStatus.INACTIVE,
      SiteStatus.READY_TO_REVIEW,
      SiteStatus.REJECTED,
    ),
  )
  status: SiteStatus;


  @AllowNull(false)
  @Index
  @Default(StockManagementType.SND)
  @Column(
    DataType.ENUM(
      StockManagementType.SND,
      StockManagementType.THIRD_PARTY,
      StockManagementType.AFFILIATE,
    ),
  )
  stock_management_type: StockManagementType;

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

  @HasMany(() => SpaceModel)
  spaces: SpaceModel[];
}
