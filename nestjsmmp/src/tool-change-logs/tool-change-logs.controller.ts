import { Controller, Get, Query } from "@nestjs/common";
import { ToolChangeService } from "./tool-change-logs.service";

@Controller('toolchange')
export class ToolChangeController{
    constructor(private readonly ToolChangeService:ToolChangeService){}
    @Get('parts')
    getFactoryParts(@Query('factory') factory:number){
        return this.ToolChangeService.getPartsList(factory)
    }

    @Get('line')
    getLine(@Query('factory') factory:number,@Query('parts_name') parts_name:string){
        return this.ToolChangeService.getLineNo(factory,parts_name)
    }

    @Get('address')
    getAddress(@Query('factory') factory:number,@Query('parts_name') parts_name:string, @Query('line_no') line_no:string){
        return this.ToolChangeService.getMachineAddress(factory,parts_name,line_no)
    }

}