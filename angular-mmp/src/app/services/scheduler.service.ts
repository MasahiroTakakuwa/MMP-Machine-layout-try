import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

}