export interface ToolChangeRow{
    id:number,
    line_name:string,
    side:string,
    tool_no:string,
    setting_value:number,
    changed_value:number,
    cause:string,
    otherCause:string,
    updated_at:Date,
    editing:boolean
}

export interface ToolChangeColumn{
    field: keyof ToolChangeRow,
    header: string,
    width?: string
}

export interface ToolChangePlotData{
    line_name:string,
    side:string,
    tool_no:string,
    setting_value:number,
    changed_value:number,
    updated_at:Date
}