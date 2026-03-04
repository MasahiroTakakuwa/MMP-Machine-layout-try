import { Controller,Get,Query } from "@nestjs/common";
import { SchedulerService } from "./scheduler.service";

@Controller('scheduler')
export class SchedulerController{
    constructor(private readonly SchedulerService:SchedulerService){}
    @Get('list')
    getLineList(@Query('factory') factory:number){
        return this.SchedulerService.getLineNoSummary(factory)
    }

    @Get('footer')
    getFooter(@Query('factory') factory:number,@Query('header') header:number){
        return this.SchedulerService.getFooterMachine(factory,header)
    }

    @Get('minutes')
    getMinutes(@Query('factory') factory:number,@Query('header') header:number,@Query('footer') footer:number){
        return this.SchedulerService.getMinutesLeft(factory,header,footer)
    }

    @Get('asc')
    getTop10Left(@Query('factory') factory:number,@Query('headers') headers:number[],@Query('footers') footers:number[]){
        return this.SchedulerService.getTop10MinutesLeft(factory,headers,footers)
    }

}