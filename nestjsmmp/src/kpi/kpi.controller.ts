import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { KpiService } from "./kpi.service";
import { machine } from "os";
import { AuthGuard } from "src/userManagement/auth/auth.guard";

// KPI表示に関係するデータを取得するAPI
@UseGuards(AuthGuard)
@Controller('kpi')
export class KpiController {
    constructor(private readonly KpiService: KpiService) {}
    @Get()
    getSummaryType(@Query('factory') factory: number,
                   @Query('type') type:number
    ){
      return this.KpiService.getPartsNoSummary_type(factory,type);
    }
    
    // 対象製品の加工設備・ラインNoを取得
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

    // 鍛造のKPIデータ取得
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

    // 切削のKPIデータ取得
    @Get('machining')
    async getMachiningKpi(@Query('factory') factory: number,
                  @Query('parts_no') parts_no: string,
                  @Query('line_no') line_no: string,
                  @Query('date') date: string
    ){
      const MachiningPlan = await this.KpiService.getMachiningPlan(factory,parts_no,line_no);
      const MachiningProg = await this.KpiService.getMachiningProgress(factory,parts_no,line_no,date);
      const MachiningBaseCT = await this.KpiService.getMachiningBaseCT(factory,parts_no,line_no);
      //console.log(MachiningBaseCT);
      return{
        MachiningPlan,
        MachiningProg,
        MachiningBaseCT
      };
      
    }

    // 鍛造の工場全体の生産勝ち負け
    @Get('forging_factory')
    async getForgingTotal_factory(@Query('factory') factory: number,
                                  @Query('day') day: number,
                                  @Query('firstday') firstday: string,
                                  @Query('today') today: string

    ){
      const ForgingPlan_factory = await this.KpiService.getTotalForginPlan_factory(factory,day);
      const ForgingProg_factory = await this.KpiService.getTotalForgingProgress_factory(factory,firstday,today);

      return{
        ForgingPlan_factory,
        ForgingProg_factory
      }

    }

    // 切削の工場全体の生産勝ち負け
    @Get('machining_factory')
    async getMachiningTotal_factory(@Query('factory') factory: number,
                                    @Query('firstday') firstday: string,
                                    @Query('today') today: string

    ){
      const MachiningPlan_factory = await this.KpiService.getTotalMachiningPlan_factory(factory);
      const MachiningProg_factory = await this.KpiService.getTotalMachiningProgress_factory(factory,firstday,today);
      
      return{
        MachiningPlan_factory,
        MachiningProg_factory
      };

    }

}