// ==============================================================================
// src/app/services/machine.service.ts
// 📄 machine.service.ts - 🇻🇳 Service gọi API để lấy dữ liệu máy từ backend
//                        🇯🇵 バックエンドから機械情報を取得するためのサービス
//
// ✅ 🇻🇳 File này định nghĩa một service Angular dùng `HttpClient` để:
//         - Gửi yêu cầu GET đến API máy
//         - Nhận dữ liệu JSON và chuyển thành danh sách Machine[]
//
// ✅ 🇯🇵 このファイルでは、Angularの `HttpClient` を使って：
//         - 機械データのAPIへGETリクエストを送信
//         - JSONレスポンスをMachine型配列に変換して返す
//
// 💡 🇻🇳 Service này được dùng trong các component để hiển thị máy trên layout.
//    🇯🇵 このサービスは、工場レイアウト上に機械を表示するために使用されます。
// ==============================================================================

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Machine } from '../models/machine.model';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { StatusStopMachine } from '../models/status-machine.model';

// 🇻🇳 Đánh dấu service này có thể được inject toàn cục trong toàn ứng dụng.
// 🇯🇵 このサービスはアプリ全体で依存性注入（DI）可能であることを示します。
@Injectable({
  providedIn: 'root',
})
export class MachineService {
  // 🇻🇳 Gốc API (không bao gồm query factory)
  // 🇯🇵 APIのベースURL（factoryのクエリパラメータは除外）
  // private baseUrl = 'http://192.168.10.8:3000/machine';
  apiURL=environment.apiURL

  constructor(private http: HttpClient) {}

  // ✅ 🇻🇳 Hàm lấy danh sách máy, truyền vào mã nhà máy (factory ID) động
  //    🇯🇵 工場ID（factory）を引数にして機械一覧を取得する関数です。
  getMachines(factory: number = 0): Observable<Machine[]> {
    const url = `${this.apiURL}/machine?factory=${factory}`;
    return this.http.get<any>(url).pipe(
      map((res) => res as Machine[])
      // 🇻🇳 Chuyển dữ liệu JSON nhận được thành danh sách kiểu Machine
      // 🇯🇵 JSONレスポンスをMachine型の配列に変換します
    );
  }

  getStatusCount(factory: number = 0) {
    return this.http.get<{ runningCount: number; stoppingCount: number; lineCount: number }>(
      `${this.apiURL}/machine/count?factory=${factory}`
      );
  }

  saveStatusMachine(data: StatusStopMachine): Observable<any>{
    return this.http.post(`${this.apiURL}/input-stop-machine/save-status-machine`, data)
  }

  runMachine(machine_id: number): Observable<any>{
    return this.http.put(`${this.apiURL}/input-stop-machine/run-machine/${machine_id}`, {})
  }

  getStatusMachine(machine_id: number): Observable<StatusStopMachine[]>{
    return this.http.get(`${this.apiURL}/input-stop-machine/history/${machine_id}`).pipe(
      map(res=> res as StatusStopMachine[])
    )
  }
}
