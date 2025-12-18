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
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { parse } from 'date-fns';

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

export interface ForgingPlanItem {
  day: number;         // 1..31
  target_prod: number; // 例: 45000
}

export interface ForgingProgItem {
  prod_date: string;   // "yyyy-MM-dd"（JST）
  good_prod: number;
  waste_prod: number;
  setup_prod: number;
  inline_defect: number;
}

export interface ForgingResponse {
  ForgingPlan: ForgingPlanItem[];
  ForgingProg: ForgingProgItem[];
}

export interface MachiningPlanItem {
  target_prod: number; // 例: 45000
}

export interface MachiningProgItem {
  prod_date: string;   // "yyyy-MM-dd"（JST）
  good_prod: number;
  inline_defect: number;
  visual_defect: number;
}

export interface MachiningResponse {
  MachiningPlan: MachiningPlanItem[];
  MachiningProg: MachiningProgItem[];
}

// 今月1日を生成
export function getFirstDayOfCurrentMonthInJST(): string {
  const now = new Date();
  // 日本時間での年と月を取得（ローカルタイムに依存しない）
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);

  const year = Number(parts.find(p => p.type === 'year')?.value);
  const month = Number(parts.find(p => p.type === 'month')?.value);

  // "yyyy-MM-dd" を手動で組み立て
  const yyyy = String(year);
  const mm = String(month).padStart(2, '0');
  const dd = '01';

  return `${yyyy}-${mm}-${dd}`;

}

// 今月の土曜・日曜になる日付をnumberで取得
export function getWeekendDaysOfCurrentMonth(): number[] {
  const today = new Date();                  // ローカルタイムゾーン（例: JST）で取得
  const year = today.getFullYear();
  const month = today.getMonth();            // 0=Jan, 1=Feb, ...
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // 月末日(0)から日数取得

  const weekendDays: number[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const dayOfWeek = dt.getDay();           // 0=日, 6=土
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDays.push(d);                   // 「日にち（1..31）」を格納
    }
  }

  return weekendDays;
}


@Component({
    selector: 'app-kpi',
    standalone: true,
    imports: [ChartModule,DropdownModule,FluidModule,FormsModule,SelectButtonModule,ToggleButtonModule,ButtonModule,MessageModule,ToastModule],
    templateUrl: './kpi.component.html',
    styleUrls: ['./kpi.component.scss'],
    providers: [MessageService],

})

export class KpiComponent implements OnInit, OnDestroy{
    // chartの横軸ラベル
    labels_day: string[] = ['1','2','3','4','5','6','7','8','9','10',
                                          '11','12','13','14','15','16','17','18','19','20',
                                          '21','22','23','24','25','26','27','28','29','30','31'    
                                        ];

    // 鍛造生産計画・進捗データ格納
    formarplans: ForgingPlanItem[] = [];
    formarprogs: ForgingProgItem[] = [];
    // 切削生産計画・進捗データ格納
    machiningplans: MachiningPlanItem[] = [];
    machiningprogs: MachiningProgItem[] = [];
    weekendDays: number[] = [];     // 休日の日付を格納用
    // selectButtonの初期設定
    // 工場選択
    selectButtonValues: FactoryOption[] = [
        { name: 'Jupiter',code:1},
        { name: 'Mercury',code:2},
        { name: 'Tierra',code:4},
        { name: 'Luna',code:6},
        { name: 'Saturn',code:5}
    ];    
    selectButtonValue: FactoryOption = this.selectButtonValues[1];
    selectedNode: any = null;

    // toggleswitchの初期設定
    // 切削・鍛造の切替
    toggleValue: boolean = true;            // true:切削・false:鍛造
    toggleDisabled: boolean = false;        // ボタン動作の許可(STN以外はどちらかのみのため不許可)

    // dropdownlistの初期設定
    // 品番
    dropdownValues:  Dropdownitem[] = [];
    dropdownValue: Dropdownitem | null = null;
    // ラインNo・設備名
    dropdown2Values: Dropdownitem2[] = [];
    dropdown2Value: Dropdownitem2 | null = null;

    // Chartの初期設定
    // 生産実績
    ProdChartData: any;
    ProdChartOptions: any;
    // 可動率
    OperatingRateData: any;
    OperatingRateOptions: any;
    // 不良率
    DefectRateData: any;
    DefectRateOptions: any;

    subscription: Subscription;
    constructor(
        private messageService: MessageService,
        private layoutService: LayoutService,
        private kpiService: KpiService
        ) {
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25)).subscribe(() => {
            this.initCharts();
        });
    }
    // 初期設定
    ngOnInit() {
        this.loadDropdownItems(this.selectButtonValue.code);       
        // 初期選択に基づいてトグルの状態・可否を反映
        this.updateToggleState(this.selectButtonValue.code);

    }
    
    // 工場区分変更後
    onFactoryChange(event: SelectButtonChangeEvent) {
        const selected = event.value as FactoryOption | undefined;
        if (!selected) {
            return;
        }
        this.selectButtonValue = selected;
        this.updateToggleState(selected.code);
        this.loadDropdownItems(this.selectButtonValue.code);

    }
    // 品番選択後
    onPartsNoSelect() {        
    if (this.dropdownValue && this.dropdownValue.code !== undefined) {
        this.loadDropdownItems2(this.selectButtonValue.code, this.dropdownValue.code);
        }

    }
        
    // 工場区分によって切削・鍛造が自動で変化
    private updateToggleState(code: number): void {
        if (code === 1) {
        // code=1 → false に固定、以降変更不可
        this.toggleValue = false;
        this.toggleDisabled = true;
        } else if (code === 5) {
        // code=5 → 変更可能（値は強制しない）
        this.toggleDisabled = false;
        // ここで値を初期化したい場合は以下を使う（任意）
        // this.toggleValue = this.toggleValue; // 現状維持
        } else {
        // その他 → true に固定、以降変更不可
        this.toggleValue = true;
        this.toggleDisabled = true;
        }
    }

    // ユーザーがトグルを押した時のハンドラ（必要なら）
    onToggleChange(): void {
        this.loadDropdownItems(this.selectButtonValue.code);
    }

    // グラフ描画
    displayCharts(){
        // UIに入力されているデータを格納
        const factory = this.selectButtonValue.code | 0;
        const type = this.toggleValue ? 1 : 0;              // 加工方法 1:切削　0:鍛造
        let parts = this.dropdownValue?.code;               // あいまい検索用に品番の末尾の'-1'を削除
        if(parts?.endsWith('-1')){
            parts = parts.slice(0,-2);
        }
        const machine = this.dropdown2Value?.code;
        const date = getFirstDayOfCurrentMonthInJST();      //今月1日をstring型で生成
        
        // グラフ用データの格納先(1日から31日で固定)
        const progByDay: number[] = new Array(31).fill(0);      //生産実績
        
        const progPerplan: number[] = new Array(31).fill(0);    //可動率
        const targetPerplan: number[] = new Array(31).fill(0);  //目標可動率
        const inlinedefByDay: number[] = new Array(31).fill(0); //工程内不良
        const visualdefByDay: number[] = new Array(31).fill(0); //外観不良
        const wastedefByDay: number[] = new Array(31).fill(0);  //捨て打ち
        const setupdefByDay: number[] = new Array(31).fill(0);  //段取り
        
        this.chengeDefectLegend();                              //不良率グラフの凡例を変更
        // 1)条件漏れ確認
        // 工場・品番・設備の全てが選択されているか確認
        if(factory === 0){
            this.messageService.add({key: 'test', severity: 'warn', summary: 'Warning', detail: '工場が選択されていません。' });
            return;
        }
        if(parts === undefined){
            this.messageService.add({key: 'test', severity: 'warn', summary: 'Warning', detail: '品番が選択されていません。' });
            return;
        }
        if(machine === undefined){
            this.messageService.add({key: 'test', severity: 'warn', summary: 'Warning', detail: '設備・ラインが選択されていません。' });
            return;
        }
        // 2)生産計画と生産実績を取得
        // 鍛造
        if(type === 0){
        const planByDay: number[] = new Array(31).fill(0);      //日ごと生産計画数
        this.kpiService.getForgingKpi(factory, parts, machine, date).subscribe({
            next: (res: ForgingResponse) => {
                // --- アクセス方法 ---
                this.formarplans = Array.isArray(res.ForgingPlan) ? res.ForgingPlan : [];
                this.formarprogs = Array.isArray(res.ForgingProg) ? res.ForgingProg : [];
                // 確認ログ
                console.table(this.formarplans);
                console.table(this.formarprogs);
                // 3)グラフ用データを生成
                // 生産計画
                for(let i=0;i<this.formarplans.length;i++){
                    const index = this.formarplans[i].day;
                    planByDay[index-1] = this.formarplans[i].target_prod;

                }
                // 生産実績
                for(let n=0;n<this.formarprogs.length;n++){
                    // 日付部分をintに変換
                    const day = parseInt(this.formarprogs[n].prod_date.split('-')[2], 10); 
                    progByDay[day-1] = this.formarprogs[n].good_prod;       // 良品数
                    // 工程内不良は以下の部分に処理を追加
                    progPerplan[day-1] = (progByDay[day-1]/planByDay[day-1])*100 ;  // 可動率
                    targetPerplan[day-1] = 85;                                      // 目標可動率
                    inlinedefByDay[day-1] = (this.formarprogs[n].inline_defect/this.formarprogs[n].good_prod)*100;      // 工程内不良
                    wastedefByDay[day-1] = (this.formarprogs[n].waste_prod/this.formarprogs[n].good_prod)*100;         // 捨て打ち
                    setupdefByDay[day-1] = (this.formarprogs[n].setup_prod/this.formarprogs[n].good_prod)*100;         // 段取り
                }

                // データセットに値を代入。
                this.ProdChartData.datasets[0].data = planByDay;    // 生産計画
                this.ProdChartData.datasets[1].data = progByDay;    // 生産実績
                
                this.OperatingRateData.datasets[0].data = targetPerplan;  // 可動率
                this.OperatingRateData.datasets[1].data = progPerplan;  // 可動率

                this.DefectRateData.datasets[0].data = inlinedefByDay;  // 工程内不良
                this.DefectRateData.datasets[1].data = wastedefByDay;   // 捨て打ち
                this.DefectRateData.datasets[2].data = setupdefByDay;   // 段取り
                // グラフエリアを更新
                this.ProdChartData = { ...this.ProdChartData };
                this.OperatingRateData = { ...this.OperatingRateData};
                this.DefectRateData = { ...this.DefectRateData };
            },
            error: (err) => console.error(err),
            });

        //const day = parseInt(item.prod_date.split('-')[2], 10); // 日付部分をintに変換
        }
        // 切削
        else if(type === 1){
            this.kpiService.getMachiningKPI(factory, parts, machine, date).subscribe({
            next: (res: MachiningResponse) => {
                // --- アクセス方法 ---
                this.machiningplans = Array.isArray(res.MachiningPlan) ? res.MachiningPlan : [];
                this.machiningprogs = Array.isArray(res.MachiningProg) ? res.MachiningProg : [];
                // 確認ログ
                console.table(this.machiningplans);
                console.table(this.machiningprogs);       
                // 3)グラフ用データを生成
                // 生産計画(切削の生産計画は品番ごとのため、1ライン当たりの生産数を算出)
                let lines = this.dropdown2Values.length -1 ;    // 全ラインを除外
                if(machine === 'all'){
                    lines = 1;  // 全ラインが選択されている場合
                }
                const planPerline = Math.ceil(this.machiningplans[0].target_prod / lines);
                const planByDay: number[] = new Array(31).fill(planPerline);      //日ごと生産計画数
                // 休日を除外
                this.weekendDays = getWeekendDaysOfCurrentMonth();
                for(let c=0;c<this.weekendDays.length;c++){
                    const index = this.weekendDays[c];
                    planByDay[index-1] = 0;
                }
                
                // 生産実績
                for(let n=0;n<this.machiningprogs.length;n++){
                    // 日付部分をintに変換
                    const day = parseInt(this.machiningprogs[n].prod_date.split('-')[2], 10); 
                    progByDay[day-1] = this.machiningprogs[n].good_prod;       // 良品数
                    // 工程内不良は以下の部分に処理を追加
                    progPerplan[day-1] =(progByDay[day-1]/planByDay[day-1])*100;  // 可動率
                    targetPerplan[day-1] = 85;                                    // 目標可動率
                    inlinedefByDay[day-1] = (this.machiningprogs[n].inline_defect/this.machiningprogs[n].good_prod)*100;      // 工程内不良
                    visualdefByDay[day-1] = (this.machiningprogs[n].visual_defect/this.machiningprogs[n].good_prod)*100;         // 外観不良(捨て打ち)            
                }
                // データセットに値を代入。                
                this.ProdChartData.datasets[0].data = planByDay;    // 生産計画
                this.ProdChartData.datasets[1].data = progByDay;    // 生産実績

                this.OperatingRateData.datasets[0].data = targetPerplan;
                this.OperatingRateData.datasets[1].data = progPerplan;
                
                this.DefectRateData.datasets[0].data = inlinedefByDay;  // 工程内不良
                this.DefectRateData.datasets[1].data = visualdefByDay;  // 外観不良
                // グラフエリアを更新
                this.ProdChartData = { ...this.ProdChartData };
                this.OperatingRateData = { ...this.OperatingRateData};
                this.DefectRateData = { ...this.DefectRateData };

            },
            error: (err) => console.error(err),
            });
        }
    }
 
    // チャート初期設定
    initCharts() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
        const type = this.toggleValue ? 1 : 0;              // 加工方法 1:切削　0:鍛造
        
        // 生産実績
        this.ProdChartData = {
            labels: this.labels_day,
            datasets: [
                {
                    type: 'bar',
                    label: '計画',
                    backgroundColor: '#b0b0b0ff',
                    borderColor: '#b0b0b0ff',
                    data: [6000, 6000, 6000, 6000, 6000, 0, 0],
                    yAxisID: 'y-axis-1'
                },
                {
                    type: 'bar',
                    label: '実績',
                    backgroundColor: '#0022ffff',
                    borderColor: '#0022ffff',
                    data: [6100, 5800, 5500, 6200, 6000, 0, 0],
                    yAxisID: 'y-axis-1'
                }
                
            ]
        };

        this.ProdChartOptions = {
            maintainAspectRatio: false,
            aspectRatio: 1.0,
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: textColor,
                        font: {
                            size:20
                        }
                    }
                }
            },
            scales: {
                x: {
                    title:{
                        display:true,
                        text: '[日]',
                        font: {size:18},
                        padding: {top:8,bottom: 0}
                    },
                    ticks: {
                        color: textColorSecondary,
                        font: {
                            weight: 500,
                            size: 20
                        }
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                },
                // Y軸の設定
                'y-axis-1': {
                    type: 'linear',
                    position: 'left',
                    title:{
                        display:true,
                        text: '[個]',
                        font: {size:18},
                        padding: {top:0,bottom: 8}
                    },
                    ticks: {
                        color: textColorSecondary,
                        beginAtZero: true,
                        font:{
                            size: 20
                        }
                        
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                },
                
            }
        };

        // 可動率
        this.OperatingRateData = {
            labels: this.labels_day,
            datasets: [
                {
                    type: 'bar',
                    label: '目標可動率',
                    backgroundColor: '#b0b0b0ff',
                    borderColor: '#b0b0b0ff',
                    data: [60, 60, 60, 60, 60, 0, 0],
                    yAxisID: 'y-axis-1'
                },
                {
                    type: 'bar',
                    label: '可動率',
                    backgroundColor: '#0022ffff',
                    borderColor: '#0022ffff',
                    data: [102, 97, 91, 103, 10],
                    yAxisID: 'y-axis-1'
                },
                
            ]

        };

        this.OperatingRateOptions = {
            maintainAspectRatio: false,
            aspectRatio: 1.0,
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: textColor,
                        font: {
                            size:20
                        }
                    }
                }
            },
            scales: {
                x: {
                    title:{
                        display:true,
                        text: '[日]',
                        font: {size:18},
                        padding: {top:8,bottom: 0}
                    },
                    ticks: {
                        color: textColorSecondary,
                        font: {
                            weight: 500,
                            size: 20
                        }
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                },
                // Y軸の設定
                'y-axis-1': {
                    type: 'linear',
                    position: 'left',
                    title:{
                        display:true,
                        text: '[％]',
                        font: {size:18},
                        padding: {top:0,bottom: 8}
                    },
                    ticks: {
                        color: textColorSecondary,
                        beginAtZero: true,
                        font: {
                            size:20
                        }
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                }                
            }
        }

        // 不良率
        if(type === 0){
            this.DefectRateData = {
            labels: this.labels_day,
            datasets: [
                {
                type: 'bar',
                label: '工程内不良',
                backgroundColor: '#ff0000ff',
                data: [0.25, 0.19, 0.40, 0.1, 0.3],
                yAxisID: 'y-axis-1'
                },
                
                {
                type: 'bar',
                label: '捨て打ち',
                backgroundColor: '#b0b0b0ff',
                data: [0.28, 0.28, 0.20, 0.2, 0.2],
                yAxisID: 'y-axis-1'
                },
                {
                type: 'bar',
                label: '段取り',
                backgroundColor: '#fed70fff',
                data: [0.28, 0.28, 0.20, 0.2, 0.2],
                yAxisID: 'y-axis-1'
                }
                
            ]

        };

        }
        else if(type === 1){
            this.DefectRateData = {
            labels: this.labels_day,
            datasets: [
                {
                type: 'bar',
                label: '工程内不良',
                backgroundColor: '#ff0000ff',
                data: [0.25, 0.19, 0.40, 0.1, 0.3],
                yAxisID: 'y-axis-1'
                },
                
                {
                type: 'bar',
                label: '外観不良',
                backgroundColor: '#66BB6A',
                data: [0.28, 0.28, 0.20, 0.2, 0.2],
                yAxisID: 'y-axis-1'
                },
                // {
                // type: 'line',
                // label: '目標不良率',
                // //backgroundColor: '#de2f2fff',
                // borderColor: '#000000ff',
                // data: new Array(31).fill(0.5),
                // yAxisID: 'y-axis-1'
                // }
                
            ]

            };

        }
        

        this.DefectRateOptions = {
            maintainAspectRatio: false,
            aspectRatio: 1.0,
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: textColor,
                        font: {
                            size:20
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title:{
                        display:true,
                        text: '[日]',
                        font: {size:18},
                        padding: {top:8,bottom: 0}
                    },
                    ticks: {
                        font: {
                            weight: 500,
                            size: 20
                        }
                    },
                },
                // Y軸の設定
                'y-axis-1': {
                    type: 'linear',
                    position: 'left',
                    stacked: true,
                    title:{
                        display:true,
                        text: '[％]',
                        font: {size:18},
                        padding: {top:0,bottom: 8}
                    },
                    ticks: {
                        color: textColorSecondary,
                        beginAtZero: false,
                        font: {
                            size:20
                        },
                        max: 2.0
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                },
                
            }

        };

    }

    // 不良率凡例変更
    chengeDefectLegend(){
        const type = this.toggleValue ? 1 : 0;              // 加工方法 1:切削　0:鍛造
        // 不良率
        if(type === 0){
            this.DefectRateData = {
            labels: this.labels_day,
            datasets: [
                {
                type: 'bar',
                label: '工程内不良',
                backgroundColor: '#ff0000ff',
                yAxisID: 'y-axis-1'
                },
                
                {
                type: 'bar',
                label: '捨て打ち',
                backgroundColor: '#b0b0b0ff',
                yAxisID: 'y-axis-1'
                },
                {
                type: 'bar',
                label: '段取り',
                backgroundColor: '#fed70fff',
                yAxisID: 'y-axis-1'
                }
                
            ]

        };

        }
        else if(type === 1){
            this.DefectRateData = {
            labels: this.labels_day,
            datasets: [
                {
                type: 'bar',
                label: '工程内不良',
                backgroundColor: '#ff0000ff',
                yAxisID: 'y-axis-1'
                },
                
                {
                type: 'bar',
                label: '外観不良',
                backgroundColor: '#66BB6A',
                yAxisID: 'y-axis-1'
                },
                // {
                // type: 'line',
                // label: '目標不良率',
                // //backgroundColor: '#de2f2fff',
                // borderColor: '#000000ff',
                // data: new Array(31).fill(0.5),
                // yAxisID: 'y-axis-1'
                // }
                
            ]

            };

        }
    }

    // Chartデータ生成
    createChartData(factoryCode: number, partsCode: string){
        // DB検索用の日時(yyyy-MM-dd形式)を生成。※日にちは1日に固定
        const today = new Date();
        const firstDayofMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const formatted = firstDayofMonth.toISOString().split('T')[0]
        // 生産実績グラフ更新(日付で合算)        
        this.kpiService.getProductHistory(factoryCode, partsCode, formatted)
        .subscribe((items: any[]) => {
            // 配列を初期化(31日分で0埋めした状態で宣言)
            const totalsByDay: number[] = new Array(31).fill(0);
            const cumulativeProd: number[] = new Array(31).fill(0);
            const totalsByDay2: number[] = new Array(31).fill(0);
            const cumulativeProd2: number[] = new Array(31).fill(0);
            // 日ごとの生産数をtotalsByDayに格納
            items.forEach(item => {              
                const day = parseInt(item.prod_date.split('-')[2], 10); // 日付部分をintに変換
                totalsByDay[day-1] = item.total_production; // dayをインデックスにして格納
                totalsByDay2[day-1] = item.total_production-800; // dayをインデックスにして格納
            });
            // 累計生産数をcumulativeProdに格納
            let cumulativeSum = 0;
            let cumulativeSum2 = 0;
            for (let i = 0; i < totalsByDay.length; i++) {
                cumulativeSum += Number(totalsByDay[i]);
                cumulativeProd[i] = cumulativeSum;
                cumulativeSum2 += Number(totalsByDay2[i]);
                cumulativeProd2[i] = cumulativeSum2;

            }

            // データセットに値を代入。
            this.ProdChartData.datasets[0].data = totalsByDay2;
            this.ProdChartData.datasets[1].data = totalsByDay;
            this.ProdChartData.datasets[2].data = cumulativeProd2;
            this.ProdChartData.datasets[3].data = cumulativeProd;
            // グラフエリアを更新
            this.ProdChartData = { ...this.ProdChartData };
            
        });

    }

    // 品番ドロップダウンリスト更新(工場選択後)
    loadDropdownItems(factoryCode: number) {
        // 固定項目として全品番を宣言
        const fixedItem = {name: '全品番', code: 'all'}
        const type = this.toggleValue ? 1 : 0;              // 加工方法 1:切削　0:鍛造
        // 加工方法で分岐
        if(type == 1){
            this.kpiService.getPartsNo_type(factoryCode,type).subscribe((items: Kpi[]) =>
            {
                const dynamicItems = items.map(item => ({
                    name: item.parts_no,
                    code: item.parts_no
                }));
                this.dropdownValues = [fixedItem, ...dynamicItems];
                                
            });

        }
        else if(type == 0){
            this.dropdownValues = [fixedItem];

        }
        // 先頭のインデックスを固定項目に設定
        this.dropdownValue = null;
        
    }

    loadDropdownItems2(factoryCode: number, partsCode: string) {
    
    // ここでは 0/1 に統一（例：1=切削, 0=鍛造）
    const type = this.toggleValue ? 1 : 0;
    type OptionItem = {name:string;code:string};
    // 呼び出し前ガード
    if (!this.dropdownValue || this.dropdownValue.code === undefined) {
        // 必要なら初期化やログ
        return;
    }
    // 'all' かつ切削の場合は固定項目のみ
    if (this.dropdownValue.code === 'all' && type == 1) {
        // 固定項目として全ラインを宣言
        const fixedItem = { name: '全ライン', code: 'all' };
        this.dropdown2Values = [fixedItem];
        this.dropdown2Value = this.dropdown2Values[0]; // ここで確実にセット
        return;
    }
    // それ以外の場合はAPI 呼び出し（items が null の場合に備えて正規化）
    else{
        // 固定項目として全設備を宣言
        const fixedItem = { name: '全設備', code: 'all' };
        this.kpiService.getLineNo_type(factoryCode, partsCode, type).subscribe({
        next: (items: any[]) => {
        const list = Array.isArray(items) ? items : [];
        let dynamicItems: OptionItem[] = [];
        if (type === 0) {
            // 鍛造なら machine_name
            dynamicItems = list.map(item => ({
            name: item?.machine_name ?? '',
            code: item?.machine_name ?? ''
            }));
        } else if (type === 1) {
            // 切削なら line_no
            dynamicItems = list.map(item => ({
            name: item?.line_no ?? '',
            code: item?.line_no ?? ''
            }));
        } else {
            // 予期しない type のフォールバック
            dynamicItems = [];
        }
        //   console.log(dynamicItems);
        // 固定 + 動的
        this.dropdown2Values = [fixedItem, ...dynamicItems];

        // 先頭をデフォルト選択（配列が空でも fixedItem が入るため安全）
        this.dropdown2Value = this.dropdown2Values[0];
        },
        error: (err) => {
        console.error('getLineNo_type error:', err);
        // エラー時も安全に初期化
        this.dropdown2Values = [fixedItem];
        this.dropdown2Value = this.dropdown2Values[0];
        }
    });
    }
    
    }

    // ビュー初期設定後処理
    ngAfterViewInit() {
        this.initCharts();
    }

    // ブラウザ終了時
    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

    }

}
