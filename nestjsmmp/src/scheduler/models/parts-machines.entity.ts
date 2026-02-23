import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity('parts_machines')

export class PartsMachines {
  @PrimaryColumn({ name: 'factory_type'})
  factory_type: number;

  @PrimaryColumn({ name: 'parts_no'})
  parts_no: string;

  @Column({ name: 'parts_name'})
  parts_name: string;
  
  @PrimaryColumn({ name: 'line_no'})
  line_no: number;

  @Column({ name: 'header_machine'})
  header_machine: number;

  @Column({ name: 'footer_machine'})
  footer_machine: number;

}