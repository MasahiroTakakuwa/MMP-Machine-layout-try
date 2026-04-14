import { Entity, Unique, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('machining_product_plan_history')
// @Unique('UQ_factory_parts_year_month',['factory_type','parts_no','year','month'])
export class MachiningPastPlan {
    @PrimaryGeneratedColumn({name: 'id' })
    id: number;

    @Column({name: 'factory_type' })
    factory_type: number;

    @Column({name: 'parts_no'})
    parts_no: string;

    @Column({ name: 'total'})
    total: number;

    @Column({ name: 'target_prod'})
    target_prod: number;

    @Column({name: 'ym_int'})
    ym_int: number;

    @Column({name: 'year'})
    year: number;

    @Column({name: 'month'})
    month: number;

}