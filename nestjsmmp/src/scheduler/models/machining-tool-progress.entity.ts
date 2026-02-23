import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity('machining_tool_progress')

export class MachiningTool {
  @PrimaryColumn({ name: 'factory_type'})
  factory_type: number;

  @PrimaryColumn({ name: 'machine_no'})
  machine_no: number;

  @Column({ name: 'op'})
  op: string;

  @Column({ name: 'CT', type: 'decimal', precision: 4, scale: 2})
  CT: number;
  
  @PrimaryColumn({ name: 'side'})
  side: string;

  @PrimaryColumn({ name: 'tool_no'})
  tool_no: string;

  @Column({ name: 'tool_change'})
  tool_change: number;

  @Column({ name: 'current'})
  current: number;

  @Column({ name: 'count_left'})
  count_left: number;

  @Column({ name: 'minutes_left'})
  minutes_left: number;

  @Column({ name: 'offset_x', type: 'decimal', precision: 6, scale: 3})
  offset_x: number;

  @Column({ name: 'offset_z', type: 'decimal', precision: 6, scale: 3})
  offset_z: number;

  @Column({ name: 'updated_at', type: 'datetime'})
  updated_at: Date;

}