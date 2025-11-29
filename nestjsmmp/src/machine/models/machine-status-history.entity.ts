// ==============================================================================
// src/entities/machine-status-history.entity.ts
// 📄 machine-status-history.entity.ts - 🇻🇳 Entity ánh xạ bảng trạng thái máy
//                                      🇯🇵 設備の状態履歴テーブルへのエンティティ定義
//
// ✅ 🇻🇳 File này định nghĩa cấu trúc entity ánh xạ bảng dbo.DE_TBL_運転状態履歴
//       • Sử dụng bởi TypeORM để truy vấn dữ liệu máy từ SQL Server
//       • Bao gồm thông tin trạng thái, tọa độ, CT, sản lượng và thời gian cập nhật
//
// ✅ 🇯🇵 このファイルは、SQL Server の dbo.DE_TBL_運転状態履歴 テーブルに対応する
//       TypeORM エンティティ定義です。設備の稼働状態・座標・生産数などを取得します。
// ==============================================================================

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('machine_status_history')           // ✅ Bảng gốc trên MySQL
                                            // ✅ MySQL上の実テーブル名
export class MachineStatusHistory {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;
  // ✅ 🇻🇳 Số thứ tự tự tăng (primary key)
  // ✅ 🇯🇵 自動増分の連番（主キー）

  @Column({ name: 'factory_type' })
  factory_type: number;
  // ✅ 🇻🇳 Phân loại nhà máy (VD: 2 = Mercury)
  // ✅ 🇯🇵 工場の区分（例：2 = Mercury）

  @Column({ name: 'machine_no' })
  machine_no: number;
  // ✅ 🇻🇳 Mã thiết bị (số máy)
  // ✅ 🇯🇵 設備番号（マシン番号）

  @Column({ name: 'machine_type' })
  machine_type: number;
  // ✅ 🇻🇳 Phân loại thiết bị (VD: 40 = cuối line có counter)
  // ✅ 🇯🇵 設備の種類（例：40 = カウンター付きのライン終端）

  @Column({ name: 'line_no'})
  line_no: number;

  @Column({ name: 'parts_name'})
  parts_name: string;

  @Column({ name: 'status' })
  status: number;
  // ✅ 🇻🇳 Trạng thái hoạt động (1 = chạy, 0 = dừng)
  // ✅ 🇯🇵 稼働状態（1 = 稼働中、0 = 停止）

  @Column({ name: 'production' })
  counter: number;
  // ✅ 🇻🇳 Sản lượng lũy kế từ 08:00 trong ngày
  // ✅ 🇯🇵 当日08:00以降の累積生産数

  @Column({ name: 'CT', type: 'decimal', precision: 8, scale: 2 })
  ct: number;
  // ✅ 🇻🇳 Cycle Time chuẩn (đơn vị giây)
  // ✅ 🇯🇵 標準サイクルタイム（秒単位）

  @Column({ name: 'X' })
  x: number;
  // ✅ 🇻🇳 Tọa độ X trên sơ đồ layout
  // ✅ 🇯🇵 レイアウト上のX座標

  @Column({ name: 'Y' })
  y: number;
  // ✅ 🇻🇳 Tọa độ Y trên sơ đồ layout
  // ✅ 🇯🇵 レイアウト上のY座標

  @Column({ name: 'updated_at', type: 'datetime' })
  updated_at: Date;
  // ✅ 🇻🇳 Thời điểm cập nhật gần nhất
  // ✅ 🇯🇵 最新の更新日時（データ更新タイムスタンプ）
}