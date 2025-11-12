import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity('devices')

export class Devices {
  @PrimaryColumn({ name: 'factory_type'})
  factory_type: number;

  @PrimaryColumn({ name: 'machine_no'})
  machine_no: number;

  @Column({ name: 'device_type'})
  device_type: number;

  @Column({ name: 'parts_no'})
  parts_no: string;
  
  @Column({ name: 'line_no'})
  line_no: string;
  
}