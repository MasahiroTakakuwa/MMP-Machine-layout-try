export interface IMachinelist{
    parts_name: string,
    line_no: number,
    header_machine: number,
    footer_machine: number
}

export interface IFooter{
    header_machine: number,
    footer_machine: number
}

export interface IToolprogerss{
    machine_no: number,
    op: string,
    side: string,
    tool_no: string,
    minutes_left: number
}

export interface IMinutesleftTop{
    minutes_left: number,
    machine_no: number,
    tool_no: string,
    machineData: string
}

export interface MachineRow{
    minutes_left: number,
    tool_no: string,
    machineData: string
}

export interface ColumnDef{
    field: keyof MachineRow,
    header: string,
    width?: string
}

export interface Grouplist{
    parts_name: string,
    group_no: number,
    line_no: number
}

export interface LineItems{
    line_name: string,
    header: number,
    footer: number
}