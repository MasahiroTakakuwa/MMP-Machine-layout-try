import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity('factory_formar')
export class Formar {
  @Column({ name: 'factory_type'})
  factory_type: number;

  @PrimaryColumn({ name: 'machine_name'})
  machine_name: string;

}