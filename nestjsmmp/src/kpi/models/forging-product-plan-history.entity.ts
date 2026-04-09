import { Entity, Unique, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('forging_product_plan_history')
// @Unique('UQ_machine_day_year_month',['machine_name','day','year','month'])
export class ForgingPastPlan {
    @PrimaryGeneratedColumn({name: 'id'})
    id: number;

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

    @Column({name: 'year'})
    year: number;

    @Column({name: 'month'})
    month: number;

}