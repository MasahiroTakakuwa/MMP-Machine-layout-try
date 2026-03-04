import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { IMachinelist } from '../interface/scheduler';

@Injectable({
  providedIn: 'root',
})
export class SchedulerService {
  apiURL=environment.apiURL
  constructor(private http: HttpClient) {}

  getLineNoSummary(factory:number): Observable<any>{
    const url = `${this.apiURL}/scheduler/list?factory=${factory}`;
        return this.http.get<any>(url).pipe(
            map((res) => res as any)
        );

  }

  getFooterMachine(factory:number,header:number): Observable<any>{
    const url = `${this.apiURL}/scheduler/footer?factory=${factory}&header=${header}`;
        return this.http.get<any>(url).pipe(
            map((res) => res as any)
        );

  }

  getMinutesLeft(factory:number,header:number,footer:number): Observable<any>{
    const url = `${this.apiURL}/scheduler/minutes?factory=${factory}&header=${header}&footer=${footer}`;
        return this.http.get<any>(url).pipe(
            map((res) => res as any)
        );

  }

  // numberを配列で渡すためHttpParamsを使用
  getTop10MinutesLeft(factory:number,headers:number[],footers:number[]): Observable<any>{
    let params = new HttpParams().set('factory',factory);
      headers.forEach(h => params = params.append('headers', h));
      footers.forEach(f => params = params.append('footers', f));
      return this.http.get<any>(`${this.apiURL}/scheduler/asc`,{ params });

  }

}