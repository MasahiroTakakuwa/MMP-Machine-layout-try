// ==============================================================================
// src/app/tierra2/tierra2.component.ts
// 📄 tierra2.component.ts - 🇻🇳 Component hiển thị layout nhà máy tierra2 và các máy
//                          🇯🇵 tierra2工場のレイアウトと機械を表示するコンポーネント
//
// ✅ 🇻🇳 File này chịu trách nhiệm:
//       • Gọi API để lấy danh sách máy của nhà máy tierra2
//       • Vẽ các máy lên SVG layout tương ứng với tọa độ (x, y)
//       • Hiển thị trạng thái, hiệu suất, cho phép zoom, và chỉnh sửa vị trí
//       • Tự động cập nhật trạng thái máy mỗi 5 giây
//       • Hàm xử lý khi click vào SVG trong chế độ Edit mode, trả về tọa độ tại điểm click
//
// ✅ 🇯🇵 このファイルの主な役割：
//       • tierra2工場の機械データをAPIで取得
//       • 機械をSVGレイアウト上に配置（x, y座標）
//       • 稼働状態やパフォーマンスを表示、ズームや位置編集も対応
//       • 5秒ごとに状態を自動更新
//       • 編集モードでSVGをクリックしたときの処理関数。クリック地点の座標を返す
// ==============================================================================

import { Component, OnInit, OnDestroy } from '@angular/core';     // ⚠️ Nhớ thêm OnDestroy
import { MachineService } from '../services/machine.service';     // 🔁 Import service để gọi API
import { Machine } from '../models/machine.model';                // 📦 Import kiểu dữ liệu máy
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { StatusMachineDialogComponent } from '../shared/components/status-machine-dialog/status-machine-dialog.component';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Tooltip } from 'primeng/tooltip';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-tierra2',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, DialogModule, Tooltip, Toast], // ✅ 🇻🇳 Import các module cần thiết | 🇯🇵 必要なモジュールを読み込み
  templateUrl: './tierra2.component.html',
  styleUrls: ['./tierra2.component.scss'],
  providers: [DialogService, MessageService]
})
export class Tierra2Component implements OnInit, OnDestroy {
  // 🧠 🇻🇳 Mảng lưu danh sách máy được lấy từ API | 🇯🇵 APIから取得された機械のリスト
  machines: Machine[] = [];
  editMode: boolean = false; // ✅ 🇻🇳 Bật/tắt chế độ chỉnh sửa vị trí máy | 🇯🇵 位置編集モードのオン/オフ
  //variable data return of dialog
  ref_dialog!: DynamicDialogRef 
  //list shifts
  listShifts = [
    {
      id: 1,
      name: "Shift Day"
    },
    {
      id: 2,
      name: "Shift Night"
    }
  ]
  userPermissions:any[]=[] //mảng chứa quyền của user đang đăng nhập
  constructor(  //declare service used in this component
    private machineService: MachineService,
    public dialogService: DialogService,
    private messageService: MessageService,
    private userService: UsersService
  ) {}

  ngOnInit(): void {
    //gọi api lấy thông tin user
    this.userService.selectedUser.subscribe(
      res => {
        this.userPermissions = res.permissions //trích xuất quyền của user
      });
    // 📥 🇻🇳 Gọi API khi component khởi tạo | 🇯🇵 コンポーネント初期化時にAPIを呼び出す
    this.fetchMachines();

    // 🧱 🇻🇳 Tạo mảng tọa độ để hiển thị lưới layout (cách 100px) | 🇯🇵 レイアウトのグリッド座標（100px間隔）を生成
    this.gridX = Array.from({ length: this.svgWidth / 50 }, (_, i) => i * 100);
    this.gridY = Array.from({ length: this.svgHeight / 50 }, (_, i) => i * 100);

    // ✅ 🇻🇳 Tự động gọi lại API mỗi 5 giây để cập nhật trạng thái máy | 🇯🇵 機械の状態を定期的（5秒ごと）に更新
    this.refreshIntervalId = setInterval(() => {
      this.fetchMachines();
    }, 15000);
  }

  // 🎨 🇻🇳 Hàm trả về màu tương ứng với trạng thái máy | 🇯🇵 機械の状態に応じた色を返す関数
  getStatusColor(status: number): string {
    switch (status) {
      case 2:   return '#ccc';          // ❌ ERROR: xám - エラー
      case 1:   return '#84ff00ff';   // ✅ RUNNING: xanh lá - 稼働中
      case 0:   return '#ff0000ff';   // ⛔ STOP: đỏ - 停止
      case 3:   return '#ff9800';     // 🔧 MAINTENANCE: cam - メンテナンス
      case 4:   return '#2196f3';     // 💤 IDLE: xanh dương - 待機中
      case 5:   return '#9c27b0';     // ⚠️ WARNING: tím - 警告
      default:  return '#9e9e9e';    // ❓ Không xác định - 不明
    }
  }

  // ✅ 🇻🇳 Bật/tắt trạng thái chỉnh sửa | 🇯🇵 編集モードのON/OFF切り替え
  toggleEditMode(): void {
    this.editMode = !this.editMode;
  }

  // 📐 Kích thước SVG layout tương ứng với file tierra2-layout.svg
  svgWidth = 3840;
  svgHeight = 2400;

  // 🧱 Create array for Grid view
  gridX: number[] = [];
  gridY: number[] = [];

  // 🔍 Zoom config
  zoom: number = 1; // 🔍 Mức zoom ban đầu (1 = 100%) | 初期ズーム倍率（1 = 100%）

// 📌 Xử lý sự kiện lăn chuột, chỉ zoom nếu giữ Ctrl | マウスホイールイベント処理（Ctrlキーを押している場合のみズーム）
onWheel(event: WheelEvent): void {
  if (!event.ctrlKey) return; // ⛔ Bỏ qua nếu không giữ Ctrl | Ctrlキーを押していない場合は無視する
  event.preventDefault(); // ✅ Ngăn cuộn trang mặc định của trình duyệt | ブラウザのデフォルトスクロールを無効にする
  const zoomStep = 0.1; // 🔧 Mỗi lần cuộn thay đổi 10% | ズーム倍率の増減ステップ（10%）
  if (event.deltaY < 0) {
    // 🔼 Cuộn lên → phóng to | 上方向スクロール → ズームイン
    this.zoom = Math.min(this.zoom + zoomStep, 5); // Tối đa 500% | 最大500%
  } else {
    // 🔽 Cuộn xuống → thu nhỏ | 下方向スクロール → ズームアウト
    this.zoom = Math.max(this.zoom - zoomStep, 1); // Tối thiểu 100% | 最小100%
  }
}

  // 🧹 🇻🇳 Dọn dẹp khi component bị hủy (ngOnDestroy) | 🇯🇵 コンポーネントが破棄されるときに実行される処理
  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
  }

  // 📥 🇻🇳 Hàm gọi API để lấy danh sách máy | 🇯🇵 機械のリストを取得するためのAPI呼び出し関数
  fetchMachines(): void {
    // truyền vào tham số factory = 6 cho api lấy dữ liệu nhà máy tierra2
    // APIにパラメータ factory = 6 を渡して、tierra2工場のデータを取得する
    this.machineService.getMachines(6).subscribe({
      next: (data) => {
        this.machines = data.map(element=>{
          if(element.schedule_stop_machine){
            return {
              ...element,
              schedule_stop_machine: {
                ...element.schedule_stop_machine,
                shift: element.schedule_stop_machine?.shift?this.listShifts.find(e=>e.id==element.schedule_stop_machine?.shift)?.name:'All day', //if shift is not null, get shift name. Else, set to all day
                date_end: element.schedule_stop_machine?.date_end??'Undetermined'  //if date_end is null, set to Undetermined
              }
            }
          }else{
            return element
          }
          
        })
      },
      error: (err) => {
        console.error('Lỗi khi gọi API:', err);
      },
    });
  }

  // ✅ Biến dùng cho việc cập nhật dữ liệu tự động | データを自動更新するための変数
  private refreshIntervalId: any;

  // 🇻🇳 Phân loại máy dựa theo machine_type để xử lý riêng | 🇯🇵 機械タイプによって処理を分けるためのgetter
  get machinesTypeNot40() {
  return this.machines.filter(m => m.machine_type !== 40);
  }

  get machinesType40() {
    return this.machines.filter(m => m.machine_type === 40);
  }

  // 💡 🇻🇳 Trả về màu tương ứng với hiệu suất máy (performance) | 🇯🇵 機械のパフォーマンス値に応じた色を返す
  getPerformanceColor(performance: number | null): string {
    if (performance == null)  return '#ccc';          // ❓ no data
    if (performance >= 0.875) return '#2cd7f5ff';   // very high
    if (performance >= 0.8)   return '#59df5eff';   // high
    if (performance >= 0.5)   return '#ffeb3b';     // low
                              return '#f44336';     // very low
  }

  // 📌 Hàm xử lý khi click vào SVG trong chế độ Edit mode, trả về tọa độ tại điểm click
  // 📌 編集モードでSVGをクリックしたときの処理関数。クリック地点の座標を返す
  onSvgClick(event: MouseEvent): void {
    if (!this.editMode) return;

    const svgElement = event.currentTarget as SVGSVGElement;
    const pt = svgElement.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;

    const svgP = pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
    const x = Math.round(svgP.x);
    const y = Math.round(svgP.y);

    console.log('📍 座標をクリック / Click tại tọa độ:', { x, y });
    alert(`📍 設備の座標 / Tọa độ máy: x=${x}, y=${y}`);
  }

  // ✅ Biến dùng cho việc pan layout
  // ✅ レイアウトをパン（移動）するための変数
  isPanning: boolean = false;
  startX: number = 0;
  startY: number = 0;
  panX: number = 0;
  panY: number = 0;

  // 📌 Khi nhấn chuột phải → bắt đầu pan
  // 📌 右クリックでパン開始
  onMouseDown(event: MouseEvent): void {
    if (event.button === 2) { // 2 = chuột phải / 右クリック
      this.isPanning = true;
      this.startX = event.clientX;
      this.startY = event.clientY;
      event.preventDefault();
    }
  }

  // 📌 Khi di chuyển chuột → nếu đang pan thì cập nhật tọa độ
  // 📌 パン中にマウスを動かすと、座標を更新
  onMouseMove(event: MouseEvent): void {
    if (this.isPanning) {
      const dx = event.clientX - this.startX;
      const dy = event.clientY - this.startY;
      this.panX += dx;
      this.panY += dy;
      this.startX = event.clientX;
      this.startY = event.clientY;
    }
  }

  // 📌 Khi nhả chuột phải → kết thúc pan
  // 📌 マウス右ボタンを離したらパン終了
  onMouseUp(event: MouseEvent): void {
    if (event.button === 2) {
      this.isPanning = false;
    }
  }

  inputDowntime(machine: Machine){
    //open dialog to input information of Schedule Stop Machine. This dialog is used to save schedule stop machine and set machine to Run status
    this.ref_dialog = this.dialogService.open(StatusMachineDialogComponent, {
      header: `Update status machine (id: ${machine.id})`,  //header of dialog
      closable: true,  //display symbol X on top right of dialog
      modal: true,   //blur area outside dialog
        data: {  // data passed to dialog
            machine
        },
      width: '40%',  //width of dialog
      height: '70%',  //height of dialog
      contentStyle: { overflow: 'auto' }, //if content overflow, a scrollbar appears
    });

    this.ref_dialog.onClose.subscribe(
      {
        next: (data)=>{
          if(data){
            if(data.type=='save-status-machine'){ //save schedule stop machine
              this.machineService.saveStatusMachine(data.value).subscribe({
                next: (res)=>{
                  this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Save successfully' }); //show notify success
                  this.fetchMachines() //reload data after save schedule stop machine
                },
                error: (error)=>{
                  this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Save error' }); //show notify error
                }
              })
            }else if(data.type=='run-machine'){ //set machine to Run status
              this.machineService.runMachine(data.value).subscribe({
                next: (res)=>{
                  this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Set run machine successfully' }); //show notify success
                  this.fetchMachines() //reload data after set Run status of machine
                },
                error: (error)=>{
                  this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Run machine error' }); //show notify error
                }
              })
            }
            
          }
          
        }
      }
    )
  }
}
