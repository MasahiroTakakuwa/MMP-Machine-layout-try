// ==============================================================================
// src/app/models/machine.model.ts
// 📄 machine.model.ts - 🇻🇳 Interface định nghĩa cấu trúc dữ liệu máy trong ứng dụng
//                      🇯🇵 アプリ内で使用される機械データのインターフェース定義
//
// ✅ 🇻🇳 File này giúp định nghĩa các thuộc tính dữ liệu của từng máy,
//         được dùng trong việc hiển thị vị trí, trạng thái, hiệu suất,... trên layout.
//
// ✅ 🇯🇵 各機械の位置、状態、パフォーマンスなどを表示するために、
//         必要なデータ構造を定義しています。
// ==============================================================================


// 🇻🇳 Đây là interface định nghĩa cấu trúc dữ liệu máy
// 🇯🇵 このインターフェースは機械データの構造を定義します
export interface Machine {
  id: number

  machine_no: number;       // 🇻🇳 Tên hoặc mã máy
                            // 🇯🇵 機械の名前または番号

  x: number;                // 🇻🇳 Tọa độ X trên layout
                            // 🇯🇵 レイアウト上のX座標

  y: number;                // 🇻🇳 Tọa độ Y trên layout
                            // 🇯🇵 レイアウト上のY座標

  status: number;           // 🇻🇳 Trạng thái máy: 0 (dừng), 1 (chạy), 2 (lỗi)
                            // 🇯🇵 機械の状態: 0（停止）、1（稼働）、2（異常）

  ct: number | null;        // 🇻🇳 Thời gian chu kỳ (cycle time) của máy
                            // 🇯🇵 機械のサイクルタイム（ct）

  machine_type: number;     // 🇻🇳 Loại máy (VD: 10 - máy OP1, 40 - máy cuối line)
                            // 🇯🇵 機械タイプ（例：10=OP1、40=ライン末端の機械）

  hour: number | null;      // 🇻🇳 Giờ liền trước của máy, dùng để truy vấn sản lượng
                            // 🇯🇵 前の時刻（生産量の取得に使用）

  counter: number | null;   // 🇻🇳 Số lượng sản phẩm đã sản xuất (tính đến giờ đó)
                            // 🇯🇵 生産された製品数（その時点まで）

  performance: number | null; // 🇻🇳 Hiệu suất máy (tính theo thời gian thực)
                              // 🇯🇵 機械のパフォーマンス（リアルタイムで算出）

  line_no: number | null;     // 設備のラインNo
  
  parts_name: string | null;  // 製品名
  
  schedule_stop_machine: any | null;
}
