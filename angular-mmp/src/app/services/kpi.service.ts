// バックエンドから品番情報を取得するためのサービス
// 

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Kpi } from '../models/kpi.model';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class KpiService {
  apiURL=environment.apiURL

  constructor(private http: HttpClient) {}

  // 工場IDを引数にして品番一覧を取得する関数
  getPartsNo(factory: number =0): Observable<Kpi[]>{
    // Nestjsの該当するservice.tsを確認
    const url = `${this.apiURL}/kpi?factory=${factory}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as Kpi[])
    );
  }

  getLineNo(factory: number =0,parts_no: string =''): Observable<any>{
    const url = `${this.apiURL}/kpi/lineno?factory=${factory}&parts_no=${parts_no}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as any)    
    );
  }

  getProductHistory(factory: number =0,parts_no: string='',date: string=''): Observable<any>{
    const url = `${this.apiURL}/kpi/product?factory=${factory}&parts_no=${parts_no}&date=${date}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as any)    
    );
  }
}