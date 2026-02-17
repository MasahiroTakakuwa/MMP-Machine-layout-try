import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity('parts')

export class Parts {
  @PrimaryColumn({ name: 'factory_type'})
  factory_type: number;

  @PrimaryColumn({ name: 'parts_no'})
  parts_no: string;

  @Column({ name: 'parts_name'})
  parts_name: string;
  
}