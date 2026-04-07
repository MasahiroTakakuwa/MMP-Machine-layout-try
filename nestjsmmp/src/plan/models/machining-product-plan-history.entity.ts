import { Entity, Unique, Column } from 'typeorm';

@Entity('machining_product_plan_history')
@Unique('UQ_factory_parts_year_month',['factory_type','parts_no','year','month'])
export class MachiningPastPlan {
    @Column({name: 'factory_type' })
    factory_type: number;

    @Column({name: 'parts_no'})
    parts_no: string;

    @Column({ name: 'total'})
    total: number;

    @Column({name: 'year'})
    year: number;

    @Column({name: 'month'})
    month: number;

}