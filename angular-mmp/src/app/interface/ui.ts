export interface FactoryOption {
    name: string;
    code: number;
}
export interface DateOption {
    name: string;
    code: number;
}
export interface Dropdownitem {
    name: string;
    code: string;
}
export interface Dropdownitem2 {
    name: string;
    code: string;
}
export interface Kpi {
    factory_type: number;
    parts_no: string;
}
export interface PartsList {
    parts_no: string;
    parts_name: string;
}
export interface LineList {
    name: string;
    code: number;
}
export interface LineListGroup {
    values: LineList[];
    value: LineList | null;
}
export interface ChartDataGroup {
    Data: any | null;
    Options: any | null;
}
export interface LastUpdatedPlan {
    updated_at: Date;
}
export interface LastUpdatedProd {
    prod_date: Date;
}