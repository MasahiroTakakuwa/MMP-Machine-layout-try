import { Controller, Get, Query } from "@nestjs/common";
import { KpiService } from "./kpi.service";

// KPI表示に関係するデータを取得するAPI
@Controller('kpi')
export class KpiController {
    constructor(private readonly KpiService: KpiService) {}
    // 工場ごとの品番一覧取得
    @Get()
    getSummary(@Query('factory') factory: number) {
      return this.KpiService.getPartsNoSummary(factory);

    }

    // 生産品番ごとのラインNoを取得
    @Get('lineno')
    getLineNo(@Query('factory') factory: number,
              @Query('parts_no') parts_no: string
    ){
      return this.KpiService.getLineNoSummary(factory,parts_no)
    }
    // 過去の出来高を工場・品番ごとに取得
    @Get('product')
    getProductHistory(@Query('factory') factory: number,
                      @Query('parts_no') parts_no: string,
                      @Query('date') date: string
    ){
      return this.KpiService.getproductSummary(factory,parts_no,date)
    }

}