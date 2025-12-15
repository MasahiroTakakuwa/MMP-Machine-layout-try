import { Entity, Unique,PrimaryColumn, Column } from 'typeorm';

@Entity('forging_product_plan')
export class ForgingProductPlan {
    @Column({name: 'factory_type'})
    factory_type: number;

    @Column({name: 'parts_no'})
    parts_no: string;

    @PrimaryColumn({name: 'machine_name'})
    machine_name: string;

    @Column({name: 'day'})
    day: number;

    @Column({name: 'target_prod'})
    target_prod: number;

    @Column({name: 'updated_at', type: 'datetime'})
    updated_at: Date;

}