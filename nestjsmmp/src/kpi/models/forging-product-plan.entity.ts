import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity('forging_product_plan')

export class ForgingPlan {
  @Column({ name: 'factory_type'})
  factory_type: number;

  @PrimaryColumn({ name: 'parts_no'})
  parts_no: string;

  @PrimaryColumn({ name: 'machine_name'})
  machine_name: string;

  @PrimaryColumn({ name: 'day'})
  day: number;

  @Column({ name: 'target_prod'})
  target_prod: number;

  @Column({ name: 'updated_at'})
  updated_at: Date;

}