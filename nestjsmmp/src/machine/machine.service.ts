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

    // 指定された工場の稼働中の設備台数をカウント
  async getRunningMachineCount(factory: number){
    const result = await this.machineRepo
      .createQueryBuilder('m')
      .select('COUNT(*)','count')
      .where('m.factory_type = :factory',{factory})
      .andWhere('m.machine_type = 10')
      .andWhere('m.status = 1')
      .getRawOne();

    return Number(result.count)
  }
  // 指定された工場の停止中の設備台数をカウント
  async getStoppingMachineCount(factory: number){
    const result = await this.machineRepo
      .createQueryBuilder('m')
      .select('COUNT(*)','count')
      .where('m.factory_type = :factory',{factory})
      .andWhere('m.machine_type = 10')
      .andWhere('m.status = 0')
      .getRawOne();

    return Number(result.count)
  }
  
}
