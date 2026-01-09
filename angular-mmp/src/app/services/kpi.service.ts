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

  // 工場IDと加工方法を引数にして品番一覧を取得
  getPartsNo_type(factory: number =0,type: number =0): Observable<Kpi[]>{
    const url = `${this.apiURL}/kpi?factory=${factory}&type=${type}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as Kpi[])
    );
  }

  // 工場ID、加工方法、品番から設備情報(鍛造：設備名、切削：ラインNo)を取得
  getLineNo_type(factory: number =0,parts_no: string ='',type: number =0): Observable<any>{
    const url = `${this.apiURL}/kpi/lineno?factory=${factory}&parts_no=${parts_no}&type=${type}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as any)    
    );
  }

  // 現行未使用
  getProductHistory(factory: number =0,parts_no: string='',date: string=''): Observable<any>{
    const url = `${this.apiURL}/kpi/product?factory=${factory}&parts_no=${parts_no}&date=${date}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as any)    
    );
  }

  // 鍛造のKPIデータ取得
  getForgingKpi(factory: number =0,parts_no: string='',machine_name: string='', date: string=''): Observable<any>{
    const url = `${this.apiURL}/kpi/forging?factory=${factory}&parts_no=${parts_no}&machine_name=${machine_name}&date=${date}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as any)    
    );
    
  }

  // 鍛造の工場全体での生産勝ち負け
  getForgingTotal_factory(factory: number =0,day: number=0,firstday: string='', today: string=''): Observable<any>{
    const url = `${this.apiURL}/kpi/forging_factory?factory=${factory}&day=${day}&firstday=${firstday}&today=${today}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as any)    
    );
    
  }

  // フィルタリングした鍛造の生産勝ち負け
  getForgingTotal_filter(factory: number =0,machine: string='',day: number=0,firstday: string='',today: string=''): Observable<any>{
    const url = `${this.apiURL}/kpi/forging_filter?factory=${factory}&machine=${machine}&day=${day}&firstday=${firstday}&today=${today}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as any)    
    );
    
  }

  // 切削のKPIデータ取得
  getMachiningKPI(factory: number =0,parts_no: string='',line_no: string='', date: string=''): Observable<any>{
    const url = `${this.apiURL}/kpi/machining?factory=${factory}&parts_no=${parts_no}&line_no=${line_no}&date=${date}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as any)    
    );
    
  }

  //切削の工場全体での生産勝ち負け
  getMachiningTotal_factory(factory: number =0,firstday: string ='',today: string=''): Observable<any>{
    const url = `${this.apiURL}/kpi/machining_factory?factory=${factory}&firstday=${firstday}&today=${today}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as any)    
    );
    
  }

  //フィルタリングした切削の生産勝ち負け
  getMachiningTotal_filter(factory: number =0,parts: string ='',line: string ='',firstday: string ='',today: string=''): Observable<any>{
    const url = `${this.apiURL}/kpi/machining_filter?factory=${factory}&parts=${parts}&line=${line}&firstday=${firstday}&today=${today}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as any)    
    );
    
  }

}