import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, map } from "rxjs";
import { environment } from "../../environments/environment";

@Injectable({
    providedIn: 'root',
})
export class ToolChangeService {
    apiURL=environment.apiURL
    constructor(private http: HttpClient) {}

    getPartsList(factory: number=0): Observable<any>{
        const url = `${this.apiURL}/toolchange/parts?factory=${factory}`;
        return this.http.get<any>(url).pipe(
            map((res) => res as any)
        );
    }

    getLineNo(factory:number=0, parts_name:string=''): Observable<any>{
        const url = `${this.apiURL}/toolchange/line?factory=${factory}&parts_name=${parts_name}`;
        return this.http.get<any>(url).pipe(
            map((res) => res as any)
        );
    }

    getMachineAddress(factory:number=0, parts_name:string='', line_no:string=''): Observable<any>{
        const url = `${this.apiURL}/toolchange/address?factory=${factory}&parts_name=${parts_name}&line_no=${line_no}`;
        return this.http.get<any>(url).pipe(
            map((res) => res as any)
        );
    }
}
