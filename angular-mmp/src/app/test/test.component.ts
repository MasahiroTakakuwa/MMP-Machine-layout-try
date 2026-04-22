import { Component, OnInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { DropdownModule } from 'primeng/dropdown';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { Popover,PopoverModule } from 'primeng/popover';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '../layout/service/layout.service';
import { KpiService } from '../services/kpi.service';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { ToggleButtonModule } from 'primeng/togglebutton';

// interfaceはクラスの外側に記述する事

@Component({
    selector: 'app-test',
    standalone: true,
    imports: [ButtonModule,ChartModule,CommonModule,DialogModule,DropdownModule,FluidModule,FormsModule,InputTextModule,PopoverModule,SelectButtonModule,TagModule,ToggleButtonModule],
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

    get year(): number {
    return this.selectedDate?.getFullYear();
    }

    get month(): number {
    return this.selectedDate ? this.selectedDate.getMonth() + 1 : 0;
    }

    // リール式時刻選択UIトライ
    @ViewChildren('popover') popovers!: QueryList<Popover>;

    currentTarget: 'from' | 'to' = 'from';

    from = {hour: 9, minute: 0 };
    to =   {hour: 18, minute: 0 };

    hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0')
    );

    minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, '0')
    );
    itemHeight = 40;

    
    // ===== input表示 =====
    // 開始時刻
    get fromValue(): string {
        return this.format(this.from);
    }

    set fromValue(v: string) {
        const m = v.match(/^(\d{2}):(\d{2})$/);
        if(!m){
            return;
        }
        const h = Number(m[1]);
        const mm = Number(m[2]);

        if(h >= 0 && h < 24){
            this.from.hour = h;
        }
        if(mm >= 0 && mm < 60){
            this.from.minute = mm;
    
        }

    }

    // 終了時刻
    get toValue(): string {
        return this.format(this.to);
    }
    
    set toValue(v: string) {
        const m = v.match(/^(\d{2}):(\d{2})$/);
        if(!m){
            return;
        }
        const h = Number(m[1]);
        const mm = Number(m[2]);

        if(h >= 0 && h < 24){
            this.to.hour = h;
        }
        if(mm >= 0 && mm < 60){
            this.to.minute = mm;
        }
    }

    
    get currentHourIndex(): number {
    return this.currentTarget === 'from'
        ? this.from.hour
        : this.to.hour;
    }

    get currentMinuteIndex(): number {
    return this.currentTarget === 'from'
        ? this.from.minute
        : this.to.minute;
    }

    
    format(t: { hour: number; minute: number }): string {
    return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
    }

    toggle(event: Event, target: 'from' | 'to') {
        this.currentTarget = target;

        const index = target === 'from' ? 0 : 1;
        this.popovers.toArray()[index].toggle(event);
    }


    // 表示用
    // get selectedTime(): string {
    // return `${this.hours[this.hourIndex]}:${this.minutes[this.minuteIndex]}`;
    // }

    // hourUp() {
    // this.hourIndex = (this.hourIndex + 1) % 24;
    // }

    // hourDown() {
    // this.hourIndex = (this.hourIndex + 23) % 24;
    // }

    // minuteUp() {
    // this.minuteIndex = (this.minuteIndex + 1) % 60;
    // }

    // minuteDown() {
    // this.minuteIndex = (this.minuteIndex + 59) % 60;
    // }

    // マウスホイール操作
    onHourWheel(e: WheelEvent) {
        e.preventDefault();
        const t = this.currentTarget === 'from' ? this.from : this.to;
        t.hour = e.deltaY > 0 ? (t.hour + 1) % 24 : (t.hour + 23) % 24;
    }

    onMinuteWheel(e: WheelEvent) {
        e.preventDefault();
        const t = this.currentTarget === 'from' ? this.from : this.to;
        t.minute = e.deltaY > 0 ? (t.minute + 1) % 60 : (t.minute + 59) % 60;
    }


    // ここまで
    // 初期設定
    ngOnInit() {
        const now = new Date();
        this.maxDate = new Date(
            now.getFullYear(),
            now.getMonth()+1,0
        );
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
