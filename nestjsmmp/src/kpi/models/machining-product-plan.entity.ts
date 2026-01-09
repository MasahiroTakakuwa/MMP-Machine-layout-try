import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity('machining_product_plan')

export class MachiningPlan {
  @Column({ name: 'factory_type'})
  factory_type: number;

  @PrimaryColumn({ name: 'parts_no'})
  parts_no: string;

  @Column({ name: 'total'})
  total: number;

  @Column({ name: 'target_prod'})
  target_prod: number;

  @Column({ name: 'updated_at'})
  updated_at: Date;

}