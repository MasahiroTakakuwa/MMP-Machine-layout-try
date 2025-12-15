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

  getLineNo_type(factory: number =0,parts_no: string ='',type: number =0): Observable<any>{
    const url = `${this.apiURL}/kpi/lineno?factory=${factory}&parts_no=${parts_no}&type=${type}`;
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

  getForgingKpi(factory: number =0,parts_no: string='',machine_name: string='', date: string=''): Observable<any>{
    const url = `${this.apiURL}/kpi/forging?factory=${factory}&parts_no=${parts_no}&machine_name=${machine_name}&date=${date}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as any)    
    );
    
  }

  getMachiningKPI(factory: number =0,parts_no: string='',line_no: string='', date: string=''): Observable<any>{
    const url = `${this.apiURL}/kpi/machining?factory=${factory}&parts_no=${parts_no}&line_no=${line_no}&date=${date}`;
    return this.http.get<any>(url).pipe(
        map((res) => res as any)    
    );
    
  }

}