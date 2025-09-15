// ==============================================================================
// src/machine/machine.service.ts
// 📄 machine.service.ts - 🇻🇳 Service xử lý nghiệp vụ và truy vấn dữ liệu máy
//                        🇯🇵 設備情報の取得と稼働率計算を行うサービスロジック
//
// ✅ 🇻🇳 File này chịu trách nhiệm:
//       • Truy vấn dữ liệu từ bảng trạng thái thiết bị (DE_TBL_運転状態履歴)
//       • Tính toán hiệu suất máy (performance) theo thời gian thực
//       • Tách xử lý riêng cho máy loại 40 (cuối line) để tính hiệu suất
//       • Phân biệt ngày/giờ theo ca làm việc (ca từ 08:00)
//
// ✅ 🇯🇵 このファイルでは以下の処理を担当：
//       • 設備状態履歴テーブルからデータ取得
//       • ライン末端機械（タイプ40）に対する稼働率の算出ロジック
//       • シフトの開始時間（08:00）に基づく日付・時間の補正処理
//       • 各機械の座標・状態・生産数を含む一覧を返す
// ==============================================================================

import { Injectable } from '@nestjs/common';
import { EntityManager, In, Repository } from 'typeorm';
import { ScheduleStopMachineCurrent } from 'src/input-stop-machine/models/schedule-stop-machine-current.entity';
import { MachineStatusHistory } from './models/machine-status-history.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class MachineService {
  constructor(
    private entityManager: EntityManager,
    @InjectRepository(MachineStatusHistory)
    private readonly machineRepo: Repository<MachineStatusHistory>, // ✅ Truy cập entity từ DB
                                                                    // ✅ データベースのエンティティにアクセス
  ) {}

  // ============================================================================
  // 📊 Tính hiệu suất các máy thuộc một nhà máy cụ thể (factory)
  // 📈 指定された工場の設備一覧と稼働率を取得する
  // Addition schedule stop machine
  // When use this function, uncomment at above 'constructor' and uncomment in file app.module.ts, machine.module.ts
  // ============================================================================
  async getMachinePerformanceSummary(factory: number) {
    const now = new Date();
    const today0800 = new Date(now);
    today0800.setHours(8, 0, 0, 0); // ✅ Cố định thời gian bắt đầu ca
                                    // ✅ シフト開始時刻を08:00に固定

  //   // ==========================================================================
  //   // 🧮 Truy vấn dữ liệu mới nhất từ bảng DE_TBL_運転状態履歴 (group theo máy)
  //   // 🗂️ 設備ごとの最新情報を取得（GROUP BYで集約）
  //   // ==========================================================================
    const result = await this.machineRepo
      .createQueryBuilder('m')
      .select([
        'm.id AS id',
        'm.factory_type AS factory_type',
        'm.machine_no AS machine_no',
        'm.machine_type AS machine_type',
        'MAX(m.updated_at) AS last_updated',
        'MAX(m.status) AS status',
        'MAX(m.counter) AS counter',
        'MAX(m.ct) AS ct',
        'MAX(m.x) AS x',
        'MAX(m.y) AS y'
      ])
      .where('m.factory_type = :factory', { factory })
      // .andWhere('m.updated_at >= :startTime', { startTime: today0800 })
      .groupBy('m.factory_type, m.machine_no, m.machine_type')
      .getRawMany();

  //   // ==========================================================================
  //   // ⏱️ Chuẩn bị thời gian để tính performance
  //   // 🕒 稼働率の計算に必要な時間情報を取得
  //   // ==========================================================================
    const nowTime = now.getTime();
    const shiftStart = today0800.getTime();

    //get data schedule stop machine current with above machines
    let dataScheduleStopMachine= await this.entityManager.find(ScheduleStopMachineCurrent,{
      where: {
        machine_status_history_id: In(result.filter(m=>m.machine_type==40).map(m=>m.id))
      }
    })

    return result.map(row => {
      if (row.machine_type === 40) {
        // ✅ Tính số giây thực tế từ 08:00 đến hiện tại
        // ✅ 08:00 から現在までの経過秒数を計算
        const runningSec = (nowTime - shiftStart) / 1000;

        // ✅ Công thức: counter / (thời gian chạy thực tế / CT)
        // ✅ 式： 生産数 ÷（経過時間 / サイクルタイム）
        let performance = row.ct > 0 ? row.counter / (runningSec / row.ct) : 0;
        if (performance > 1) {performance = 1}  // ✅ Giới hạn hiệu suất tối đa là 1 (100%)
                                                // ✅ 最大パフォーマンスを1（100%）に制限

        return {
          id: row.id,
          machine_no: row.machine_no,
          x: row.x,
          y: row.y,
          status: row.status,
          ct: row.ct,
          machine_type: row.machine_type,
          hour: now.getHours(),
          counter: row.counter,
          performance: parseFloat(performance.toFixed(4)),
          // ✅ Làm tròn performance đến 4 chữ số thập phân
          // ✅ パフォーマンスを小数点以下4桁までに丸める
          schedule_stop_machine: dataScheduleStopMachine.find(e=> e.machine_status_history_id==row.id)||null  //match schedule for each machine
        };
      } else {
        // ✅ Các máy không phải loại 40 thì không tính hiệu suất
        // ✅ タイプ40以外の機械は稼働率を計算しない
        return {
          id: row.id,
          machine_no: row.machine_no,
          x: row.x,
          y: row.y,
          status: row.status,
          ct: null,
          machine_type: row.machine_type,
          hour: null,
          counter: null,
          performance: null,
        };
      }
    });
  }

  // async getMachinePerformanceSummaryDemo(factory: number){
  //   //this is demo data of machine
  //   let listMachines= [
  //     {
  //       id:1,
  //       machine_no:1,
  //       x:3120,
  //       y:857,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:2,
  //       machine_no:2,
  //       x:3018,
  //       y:825,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:3,
  //       machine_no:3,
  //       x:2911,
  //       y:782,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:4,
  //       machine_no:4,
  //       x:3134,
  //       y:1157,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:40,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:5,
  //       machine_no:5,
  //       x:2886,
  //       y:1037,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:6,
  //       machine_no:6,
  //       x:2778,
  //       y:954,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:7,
  //       machine_no:7,
  //       x:2686,
  //       y:907,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:8,
  //       machine_no:8,
  //       x:2968,
  //       y:1308,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:40,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:9,
  //       machine_no:9,
  //       x:2459,
  //       y:1064,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:10,
  //       machine_no:10,
  //       x:2557,
  //       y:1101,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:11,
  //       machine_no:11,
  //       x:2669,
  //       y:1169,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:12,
  //       machine_no:12,
  //       x:2751,
  //       y:1453,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:40,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:13,
  //       machine_no:13,
  //       x:2248,
  //       y:1196,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:14,
  //       machine_no:14,
  //       x:2335,
  //       y:1248,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:15,
  //       machine_no:15,
  //       x:2437,
  //       y:1311,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:16,
  //       machine_no:16,
  //       x:2537,
  //       y:1615,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:40,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:17,
  //       machine_no:17,
  //       x:2038,
  //       y:1356,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:18,
  //       machine_no:18,
  //       x:2123,
  //       y:1408,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:19,
  //       machine_no:19,
  //       x:2228,
  //       y:1453,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:20,
  //       machine_no:20,
  //       x:2335,
  //       y:1520,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:21,
  //       machine_no:21,
  //       x:2422,
  //       y:1829,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:40,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:22,
  //       machine_no:22,
  //       x:1814,
  //       y:1505,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:23,
  //       machine_no:23,
  //       x:1904,
  //       y:1545,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:24,
  //       machine_no:24,
  //       x:2018,
  //       y:1602,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:25,
  //       machine_no:25,
  //       x:2128,
  //       y:1655,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:26,
  //       machine_no:26,
  //       x:2223,
  //       y:1949,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:40,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:27,
  //       machine_no:27,
  //       x:1612,
  //       y:1650,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:28,
  //       machine_no:28,
  //       x:1692,
  //       y:1699,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:29,
  //       machine_no:29,
  //       x:1797,
  //       y:1762,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:30,
  //       machine_no:30,
  //       x:1909,
  //       y:1802,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:10,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //     {
  //       id:31,
  //       machine_no:31,
  //       x:2021,
  //       y:2098,
  //       status:Math.round(Math.random()),
  //       ct: null,
  //       machine_type:40,
  //       hour: null,
  //       counter: null,
  //       performance: Math.random()
  //     },
  //   ]
  //   //get data schedule stop machine current with above machines
  //   let dataScheduleStopMachine= await this.entityManager.find(ScheduleStopMachineCurrent,{
  //     where: {
  //       machine_status_history_id: In(listMachines.map(m=>m.id))
  //     }
  //   })
  //   // stack schedule stop machine to each machine (because there is not relationship)
  //   listMachines.forEach(machine=>{
  //     machine['schedule_stop_machine'] = dataScheduleStopMachine.find(e=> e.machine_status_history_id==machine.id)||null
  //   })
  //   //demo for mercury
  //   if(factory==2) return listMachines
  //   else return []
  // }
}
