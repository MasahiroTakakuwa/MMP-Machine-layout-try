import { Component, OnInit, OnDestroy } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { FluidModule } from 'primeng/fluid';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '../layout/service/layout.service';
import { KpiService } from '../services/kpi.service';

import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectButtonChangeEvent } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { DropdownItem, DropdownModule } from 'primeng/dropdown';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { DatePicker } from 'primeng/datepicker';

// interfaceはクラスの外側に記述する事
export interface FactoryOption {
    name: string;
    code: number;
}
export interface DateOption {
    name: string;
    code: number;
}
export interface Dropdownitem {
    name: string;
    code: string;
}
export interface Dropdownitem2 {
    name: string;
    code: string;
}
export interface Kpi {
    factory_type: number;
    parts_no: string;
}


@Component({
    selector: 'app-test',
    standalone: true,
    imports: [ChartModule,DatePicker,DropdownModule,FluidModule,FormsModule,SelectButtonModule,ToggleButtonModule],
    templateUrl: './test.component.html',
    styleUrls: ['./test.component.scss']

})

export class Test implements OnInit, OnDestroy{

    subscription: Subscription;
    selectedDate!: Date;
    maxDate!: Date;
    constructor(
        private layoutService: LayoutService,
        private kpiService: KpiService,
        // private primengConfig: PrimeNGConfigType
        ) {
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25)).subscribe(() => {
            // this.initCharts();
        });
    }
    // 初期設定
    ngOnInit() {
        const now = new Date();
        this.maxDate = new Date(
            now.getFullYear(),
            now.getMonth()+1,0
        );
    }
    
    get year(): number {
    return this.selectedDate?.getFullYear();
    }

    get month(): number {
    return this.selectedDate ? this.selectedDate.getMonth() + 1 : 0;
    }

        
    // ユーザーがトグルを押した時のハンドラ（必要なら）
    onToggleChange(val: boolean): void {
        // code=5 以外では disabled なので変更イベントは来ない想定
        // ログ出力や他処理があればここに
        // console.log('toggle changed:', val);
    }

    // ブラウザ終了時
    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    
    }

}
