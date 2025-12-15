import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity('forging_kpi')

export class ForgingKpi {
  @PrimaryColumn({ name: 'factory_type'})
  factory_type: number;

  @PrimaryColumn({ name: 'parts_no'})
  parts_no: string;

  @PrimaryColumn({ name: 'machine_name'})
  machine_name: string;

  @PrimaryColumn({ name: 'prod_date'})
  prod_date: Date;

  @Column({ name: 'good_prod'})
  good_prod: number;

  @Column({ name: 'waste_prod'})
  waste_prod: number;

  @Column({ name: 'setup_prod'})
  setup_prod: number;

  @Column({ name: 'inline_defect'})
  inline_defect: number;

}