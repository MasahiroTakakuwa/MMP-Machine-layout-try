import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity('machining_kpi')

export class MachiningKpi {
  @PrimaryColumn({ name: 'factory_type'})
  factory_type: number;

  @PrimaryColumn({ name: 'parts_no'})
  parts_no: string;

  @Column({ name: 'machine_name'})
  machine_name: string;

  @PrimaryColumn({ name: 'line_no'})
  line_no: string;

  @PrimaryColumn({ name: 'prod_date'})
  prod_date: Date;

  @Column({ name: 'good_prod'})
  good_prod: number;

  @Column({ name: 'inline_defect'})
  inline_defect: number;

  @Column({ name: 'visual_defect'})
  visual_defect: number;

}