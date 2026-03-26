import { Body,Controller, Get, ParseBoolPipe, Post, Query } from "@nestjs/common";
import { UpdateLineNamesDto } from "./models/update-toolchange.dto";
import { ToolChangeService } from "./tool-change-logs.service";
import { start } from "repl";

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

    @Get('search')
    searchToolChange(@Query('factory') factory:number,@Query('parts_name') parts_name:string,@Query('line_no') line_no:string,
                     @Query('start') start:string,@Query('end') end:string,@Query('isCheck',ParseBoolPipe) isCheck:boolean){
        return this.ToolChangeService.searchToolChangeLogs(factory,parts_name,line_no,start,end,isCheck)
    }

    @Post('update/logs/populate-line-name')
    async populateLineName(@Body() dto:UpdateLineNamesDto){
        const affected1 = await this.ToolChangeService.updateToolDetail(dto.factory);
        const affected2 = await this.ToolChangeService.updateGenMachineNo();
        const affected3 = await this.ToolChangeService.updateRegularToolChange(dto.factory);
        return {
            ok: true,
            results: {
                updateToolDetail:{affected: affected1},
                updateGenMachineNo:{affected: affected2},
                updateRegularToolChange:{affected: affected3},

            },

        };
        
    }

    @Post('update/logs/cause')
    async updateCause(@Body() body: { rows:any[]}){
        const affected = await this.ToolChangeService.updateCauseBulk(body.rows);
        return { ok:true, affected};
    }

}