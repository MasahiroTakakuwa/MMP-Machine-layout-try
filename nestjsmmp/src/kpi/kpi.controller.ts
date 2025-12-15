import { Controller, Get, Query } from "@nestjs/common";
import { KpiService } from "./kpi.service";
import { machine } from "os";

// KPI表示に関係するデータを取得するAPI
@Controller('kpi')
export class KpiController {
    constructor(private readonly KpiService: KpiService) {}
    @Get()
    getSummaryType(@Query('factory') factory: number,
                   @Query('type') type:number
    ){
      return this.KpiService.getPartsNoSummary_type(factory,type);
    }
    
    @Get('lineno')
    getLineNo(@Query('factory') factory: number,
              @Query('parts_no') parts_no: string,
              @Query('type') type: number
    ){
      return this.KpiService.getLineNoSummary_type(factory,parts_no,type)
    }

    // 過去の出来高を工場・品番ごとに取得
    @Get('product')
    getProductHistory(@Query('factory') factory: number,
                      @Query('parts_no') parts_no: string,
                      @Query('date') date: string
    ){
      return this.KpiService.getproductSummary(factory,parts_no,date)
    }

    @Get('forging')
    async getForgingKpi(@Query('factory') factory: number,
                  @Query('parts_no') parts_no: string,
                  @Query('machine_name') machine_name: string,
                  @Query('date') date: string
    ){
      const ForgingPlan = await this.KpiService.getForgingPlan(factory,parts_no,machine_name);
      const ForgingProg = await this.KpiService.getForgingProgress(factory,parts_no,machine_name,date);

      return{
        ForgingPlan,
        ForgingProg
      };
      
    }

    @Get('machining')
    async getMachiningKpi(@Query('factory') factory: number,
                  @Query('parts_no') parts_no: string,
                  @Query('line_no') line_no: string,
                  @Query('date') date: string
    ){
      const MachiningPlan = await this.KpiService.getMachiningPlan(factory,parts_no,line_no);
      const MachiningProg = await this.KpiService.getMachiningProgress(factory,parts_no,line_no,date);

      return{
        MachiningPlan,
        MachiningProg
      };
      
    }

}