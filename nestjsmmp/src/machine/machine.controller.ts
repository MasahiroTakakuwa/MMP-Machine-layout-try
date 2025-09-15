// ==============================================================================
// src/machine/machine.controller.ts
// 📄 machine.controller.ts - 🇻🇳 Controller cung cấp API truy vấn hiệu suất máy
//                           🇯🇵 設備の稼働率を取得するためのAPIコントローラー
//
// ✅ 🇻🇳 File này chịu trách nhiệm:
//       • Định nghĩa route API: GET /machine?factory=2
//       • Gọi đến service để lấy danh sách máy và hiệu suất
//
// ✅ 🇯🇵 このファイルでは：
//       • APIルート GET /machine?factory=2 を定義
//       • サービスを呼び出して設備一覧と稼働率を取得
// ==============================================================================

import { Controller, Get, Query } from '@nestjs/common';
import { MachineService } from './machine.service';

@Controller('machine')
export class MachineController {
  constructor(private readonly machineService: MachineService) {}

  // ============================================================================
  // 🛠️ API GET /machine?factory=2
  // 📌 Truy vấn danh sách máy + hiệu suất theo nhà máy
  // 📌 工場コードに基づいて設備リストと稼働率を取得する
  // ============================================================================
  @Get()
  getSummary(@Query('factory') factory: number) {
    //use getMachinePerformanceSummaryDemo for demo
    //use getMachinePerformanceSummary for actual in MMP
    return this.machineService.getMachinePerformanceSummary(factory);
  }
}
