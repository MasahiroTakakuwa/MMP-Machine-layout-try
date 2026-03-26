export interface ToolChangeRow{
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