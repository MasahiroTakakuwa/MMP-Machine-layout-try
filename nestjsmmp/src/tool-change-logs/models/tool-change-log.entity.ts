import { Column,Entity,PrimaryColumn } from "typeorm";

@Entity('tool_change_log')

export class ToolChangeLog {
  @Column({ name: 'factory_type'})
  factory_type: number;

  @PrimaryColumn({ name: 'machine_no'})
  machine_no: number;
  
  @PrimaryColumn({ name: 'side'})
  side: string;
  
  @PrimaryColumn({ name: 'tool_no'})
  tool_no: string;
  
  @Column({ name: 'setting_value'})
  setting_value: number;

  @Column({ name: 'changed_value'})
  changed_value: number;

  @Column({ name: 'cause'})
  cause: string;

  @PrimaryColumn({ name: 'updated_at'})
  updated_at: Date;

}