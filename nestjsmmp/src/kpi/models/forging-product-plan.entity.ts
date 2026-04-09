import { Entity, Unique, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('forging_product_plan')
@Unique('UQ_parts_machine_day',['parts_no','machine_name','day'])
export class ForgingProductPlan {
    @PrimaryGeneratedColumn({name: 'id'})
    id:number;

    @Column({name: 'factory_type'})
    factory_type: number;

    @Column({name: 'parts_no'})
    parts_no: string;

    @Column({name: 'machine_name'})
    machine_name: string;

    @Column({name: 'day'})
    day: number;

    @Column({name: 'target_prod'})
    target_prod: number;

    @Column({name: 'updated_at', type: 'datetime'})
    updated_at: Date;

}