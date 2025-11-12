import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity('product_history')

export class ProductHistory {
  @Column({ name: 'factory_type'})
  factory_type: number;

  @PrimaryColumn({ name: 'machine_no'})
  machine_no: number;

  @Column({ name: 'parts_no'})
  parts_no: string;
  
  @Column({ name: 'production'})
  line_no: number;

  @PrimaryColumn({ name: 'prod_date'})
  prod_date: Date;
  
}