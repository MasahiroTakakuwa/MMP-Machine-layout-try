
// plan.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { ForgingRowDto,ForgingUploadDto,MachiningUploadDto } from './models/plan-upload.dto';
import { PlanService } from './plan.service';

@Controller('plan')
export class PlanController {
  constructor(private readonly planservice: PlanService){}
  // 鍛造生産計画受け取り
  @Post('upload/forging')
  upload_forging(@Body() body: ForgingUploadDto) {
    this.planservice.CheckForgingProductPlanning(body);
    return { ok: true };
  }

  // 切削生産計画受け取り
  @Post('upload/machining')
  upload_machining(@Body() body: MachiningUploadDto) {
    this.planservice.CheckMachiningProductPlanning(body);
    return { ok: true}
  }

}