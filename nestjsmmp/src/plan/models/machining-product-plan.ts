import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('machining_product_plan')
export class MachiningProductPlan {
    @PrimaryColumn({name: 'factory_type' })
    factory_type: number;

    @PrimaryColumn({name: 'parts_no'})
    parts_no: string;

    @Column({ name: 'total'})
    total: number;

    @Column({name: 'target_prod'})
    target_prod: number;

    @Column({name: 'updated_at', type: 'datetime'})
    updated_at: Date;

}