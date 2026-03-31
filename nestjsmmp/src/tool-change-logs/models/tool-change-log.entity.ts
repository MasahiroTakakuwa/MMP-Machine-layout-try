import { Column,Entity,PrimaryColumn } from "typeorm";

@Entity('tool_change_log')

export class ToolChangeLog {
  @PrimaryColumn({ name: 'id'})
  id: number;

  @Column({ name: 'factory_type'})
  factory_type: number;

  @Column({ name: 'machine_no'})
  machine_no: number;
  
  @Column({ name: 'side'})
  side: string;
  
  @Column({ name: 'tool_no'})
  tool_no: string;
  
  @Column({ name: 'setting_value'})
  setting_value: number;

  @Column({ name: 'changed_value'})
  changed_value: number;

  @Column({ name: 'cause'})
  cause: string;

  @Column({ name: 'updated_at'})
  updated_at: Date;

}