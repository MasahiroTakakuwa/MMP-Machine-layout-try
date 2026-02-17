import { Component, OnInit, OnDestroy,viewChild, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { ButtonModule } from "primeng/button";
import { ChartModule, UIChart } from "primeng/chart";
import { DropdownModule } from "primeng/dropdown";
import { FluidModule } from "primeng/fluid";
import { ToastModule } from "primeng/toast";
import { ToggleButtonModule } from "primeng/togglebutton";
import { MessageService } from "primeng/api";
import { MessageModule } from "primeng/message";

import { debounceTime, Subscription } from 'rxjs';

import { LayoutService } from "../../layout/service/layout.service";
import { KpiService } from "../../services/kpi.service";

import { getFirstDayOfCurrentMonthInJST, getWeekendDaysOfCurrentMonth } from "../../shared/utils";

import { FactoryOption,Dropdownitem,Dropdownitem2,Kpi,PartsList } from "../../interface/ui";
import { ForgingPlanItem,ForgingProgItem,ForgingResponse } from "../../interface/forging";
import { MachiningPlanItem,MachiningProgItem,MachiningBaseCTItem,MachiningResponse } from "../../interface/machining";

import Chart, {
  Chart as ChartJS,         // クラス本体
  ChartType,               // 'bar' | 'line' | ...
  Plugin,                  // プラグイン型
}
 from 'chart.js/auto';

// --- (1) プラグインのオプション型を定義 ---
export interface LegendLikeTextOptions {
  lines?: string[];
  align?: 'left' | 'right';
  position?: 'top' | 'bottom';
  color?: string;
  font?: { size?: number; weight?: string };
  margin?: number;
}

// --- (2) Chart.js へプラグインオプションを「認識」させる（モジュール拡張） ---
declare module 'chart.js' {
  // すべてのチャートタイプ(TType)に対して legendLikeText オプションを追加
  // 必要に応じて個別の TType ごとに分けてもOK
  interface PluginOptionsByType<TType extends ChartType = ChartType> {
    legendLikeText?: LegendLikeTextOptions;
  }
}

// --- (3) カスタムプラグイン本体（型付き） ---
const LegendLikeTextPlugin: Plugin<ChartType> = {
  id: 'legendLikeText',
  // afterLayout/afterDraw/afterRender など好みで
  afterDraw(chart: ChartJS, args: unknown, opts?: LegendLikeTextOptions) {
    // console.log('LegendLikeTextPlugin fired');
    const { ctx, chartArea, width } = chart;
    if (!ctx || !chartArea) return;
    if (!opts?.lines || opts.lines.length === 0) return;

    const lines = opts?.lines ?? ['注記: サンプル'];
    const color = opts?.color ?? '#333';
    const size = opts?.font?.size ?? 12;
    const weight = opts?.font?.weight ?? 'normal';
    const margin = opts?.margin ?? 6;
    const align = opts?.align ?? 'right';
    const position = opts?.position ?? 'top';

    // 外側の座標（キャンバス端基準）
    // const x = align === 'right' ? width - margin : chartArea.left + margin;
    // const yBase = position === 'top' ? chartArea.top - margin : chartArea.bottom + margin;

    const x = chartArea.right - 8;
    const yBase = chartArea.top + 28;
    ctx.save();
    ctx.fillStyle = color;
    ctx.textAlign = align === 'right' ? 'right' : 'left';
    ctx.textBaseline = position === 'top' ? 'bottom' : 'top';
    ctx.font = `${weight} ${size}px sans-serif`;

    const lineHeight = size + 4;
    lines.forEach((text, idx) => {
      const y =
        position === 'top'
          ? yBase - (lines.length - 1 - idx) * lineHeight
          : yBase + idx * lineHeight;
      ctx.fillText(text, x, y);
    });
    ctx.restore();
  },
};

// （A）グローバル登録で使う場合
Chart.register(LegendLikeTextPlugin);

// グラフY軸の1000の単位をk表記にするフォーマッタ
function formatK(n: number): string {
  if (Math.abs(n) >= 1000) {
    // 小数を丸めたい場合は toFixed(1) などに変更
    const v = n / 1000;
    return Number.isInteger(v) ? `${v}k` : `${v.toFixed(1)}k`;
  }
  return String(n);
}

@Component({
    selector: 'app-utility-kpi',
    standalone:true,
    imports:[ButtonModule,CommonModule,ChartModule,DropdownModule,FormsModule,FluidModule,MessageModule,
             ToastModule,ToggleButtonModule],
    templateUrl: './kpi.component.html',
    styleUrl: './kpi.component.scss',
    providers:[MessageService],
})

export class UtilityKpiComponent {

    @ViewChild('prodChart') prodChart?:UIChart;

    factory = '';
    subscription: Subscription;
    constructor(
        private route: ActivatedRoute,
        private layoutService: LayoutService,
        private kpiService: KpiService,
        private messageService: MessageService
        ) {
        // ページのルートパラメータが変わるたびに更新する様に設定。
        this.route.paramMap.subscribe(params => {
        this.factory = params.get('factory') ?? '';
        });
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25)).subscribe(() => {
            
        });
    }

    // ルーターパラメータ(工場名)と工場区分の紐づけ
    factoryNo: number = 0;
    factoryCode: FactoryOption[] = [
    { name: 'jupiter', code: 1 },
    { name: 'mercury', code: 2 },
    { name: 'tierra',  code: 4 },
    { name: 'tierra2', code: 6 },
    { name: 'saturn',  code: 5 }
    ];
    
    // 加工
    toggleValue: boolean = true;            // true:切削・false:鍛造
    toggleDisabled: boolean = false;        // ボタン動作の許可(STN以外はどちらかのみのため不許可)
    // 品番
    partslistValues:  Dropdownitem[] = [];
    partslistValue: Dropdownitem | null = null;
    // ラインNo・設備名
    machinelistValues: Dropdownitem2[] = [];
    machinelistValue: Dropdownitem2 | null = null;
    // 鍛造生産計画・進捗データ格納
    formarplans: ForgingPlanItem[] = [];
    formarprogs: ForgingProgItem[] = [];
    // 切削生産計画・進捗データ格納
    machiningplans: MachiningPlanItem[] = [];
    machiningprogs: MachiningProgItem[] = [];
    machiningbaseCTs: MachiningBaseCTItem[] = [];
    // filterplan: MPlanItem[] = []; 
    // filterprod: MProdCountItem[] = [];
    weekendDays: number[] = [];     // 休日の日付を格納用
    // 生産勝ち負け表示
    judge: string = '〇';       // 生産進捗
    delta: number = 0;          // 差分

    // Chartの初期設定
    // Chartの横軸ラベル
    labels_day: string[] = ['1','2','3','4','5','6','7','8','9','10',
                            '11','12','13','14','15','16','17','18','19','20',
                            '21','22','23','24','25','26','27','28','29','30','31'    
                            ];

    // 生産実績
    ProdChartData: any;
    ProdChartOptions: any;
    // 可動率
    OperatingRateData: any;
    OperatingRateOptions: any;
    // 不良率
    DefectRateData: any;
    DefectRateOptions: any;

    // ブラウザ立上げ時
    ngOnInit(){
        this.route.paramMap.subscribe(params => {
            const name = params.get('factory');
            this.factoryNo = this.factoryCode.find(x => x.name === name)?.code ?? 0;
            this.loadDropdownItems(this.factoryNo);
            this.updateToggleState(this.factoryNo);
            this.initCharts();
            
        });
        
    }

    // ビュー初期設定後処理
    ngAfterViewInit() {
        this.initCharts();
    }

    // ブラウザ終了時
    ngOnDestroy(){
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

    }

    // UI表示関連
    // 品番リスト読み込み
    loadDropdownItems(factoryCode: number) {
        // 固定項目として全品番を宣言
        const fixedItem = {name: '全品番', code: 'all'}
        const type = this.toggleValue ? 1 : 0;              // 加工方法 1:切削　0:鍛造
        // 加工方法で分岐
        if(type == 1){
            // this.kpiService.getPartsNo_type(factoryCode,type).subscribe((items: Kpi[]) =>
            // {
            //     const dynamicItems = items.map(item => ({
            //         name: item.parts_no,
            //         code: item.parts_no
            //     }));
            //     this.partslistValues = [fixedItem, ...dynamicItems];
                                
            // });
            this.kpiService.getPartslist(factoryCode).subscribe((items: PartsList[]) =>
            {
                const dynamicItems = items.map(item => ({
                    name: item.parts_name,
                    code: item.parts_no
                }));
                this.partslistValues = [fixedItem, ...dynamicItems];
                                
            });

        }
        else if(type == 0){
            this.partslistValues = [fixedItem];

        }
        // 先頭のインデックスを固定項目に設定
        this.partslistValue = null;
        
    }

    // 設備リスト読み込み
    loadDropdownItems2(factoryCode: number, partsCode: string) {
        // ここでは 0/1 に統一（例：1=切削, 0=鍛造）
        const type = this.toggleValue ? 1 : 0;
        type OptionItem = {name:string;code:string};
        // 呼び出し前ガード
        if (!this.partslistValue || this.partslistValue.code === undefined) {
            // 必要なら初期化やログ
            return;
        }
        // 'all' かつ切削の場合は固定項目のみ
        if (this.partslistValue.code === 'all' && type == 1) {
            // 固定項目として全ラインを宣言
            const fixedItem = { name: '全ライン', code: 'all' };
            this.machinelistValues = [fixedItem];
            this.machinelistValue = this.machinelistValues[0]; // ここで確実にセット
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
            // 固定 + 動的
            this.machinelistValues = [fixedItem, ...dynamicItems];
            // 先頭をデフォルト選択（配列が空でも fixedItem が入るため安全）
            this.machinelistValue = this.machinelistValues[0];
            },
            error: (err) => {
            console.error('getLineNo_type error:', err);
            // エラー時も安全に初期化
            this.machinelistValues = [fixedItem];
            this.machinelistValue = this.machinelistValues[0];
            }
        });
        }
    
    }

    // 加工切替の更新
    updateToggleState(code: number): void {
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

    // 品番選択後の設備リスト再読み込み
    onPartsNoSelect() {        
    if (this.partslistValue && this.partslistValue.code !== undefined) {
        this.loadDropdownItems2(this.factoryNo, this.partslistValue.code);
        }

    }
    // ユーザーがトグルを押した時のハンドラ（必要なら）
    onToggleChange(): void {
        this.loadDropdownItems(this.factoryNo);
    }

    // グラフエリア初期設定
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
                },
                legendLikeText: {    
                    lines: [`進捗:${this.judge} 計画比:${this.delta}`],
                    align: 'right',   // 'left' も可
                    position: 'top',  // 'bottom' も可
                    color: '#444',
                    font: { size: 30, weight: 'normal' },
                    margin: 8,
                }
            },
            layout: { padding:{top:0}},
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
                        display:false,
                        text: '[個]',
                        font: {size:18},
                        padding: {top:0,bottom: 8}
                    },
                    ticks: {
                        callback: (value: number | string) => formatK(Number(value)),
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
                    label: '目標',
                    backgroundColor: '#b0b0b0ff',
                    borderColor: '#b0b0b0ff',
                    data: [60, 60, 60, 60, 60, 0, 0],
                    yAxisID: 'y-axis-1'
                },
                {
                    type: 'bar',
                    label: '実績',
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
                        display:false,
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
                        display:false,
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

    // グラフ描画
    displayCharts(){
        // UIに入力されているデータを格納
        const factory = this.factoryNo | 0;
        const type = this.toggleValue ? 1 : 0;              // 加工方法 1:切削　0:鍛造
        const machine = this.machinelistValue?.code;        // 設備
        const date = getFirstDayOfCurrentMonthInJST();      // 今月1日をstring型で生成
        let parts = this.partslistValue?.code;              // 品番
        // 切削の場合、あいまい検索用に品番を成形
        // 末尾の'-1'を削除
        if(type == 1 && parts?.endsWith('-1')){
            parts = parts.slice(0,-2);
        }
        // 末尾の'ＣＫＤ'を削除
        if(type == 1 && parts?.endsWith('CKD')){
            parts = parts.slice(0,-3);
        }
        let daycount = 0;       // 稼働日数(生産進捗表示に使用)
        let PlanTotal = 0;      // 累積計画
        let ProgTotal = 0;      // 累積良品
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
                    // 鍛造の生産実績の累積を格納
                    ProgTotal=Number(ProgTotal)+Number(this.formarprogs[n].good_prod);
                    daycount++;

                }
                for(let m=0;m<daycount;m++){
                    // 鍛造の生産計画の累積を格納
                    PlanTotal = Number(PlanTotal)+Number(this.formarplans[m].target_prod);
                    
                }

                // データセットに値を代入。
                this.ProdChartData.datasets[0].data = planByDay;    // 生産計画
                this.ProdChartData.datasets[1].data = progByDay;    // 生産実績
                
                this.OperatingRateData.datasets[0].data = targetPerplan;  // 目標稼働率
                this.OperatingRateData.datasets[1].data = progPerplan;    // 実績稼働率

                this.DefectRateData.datasets[0].data = inlinedefByDay;  // 工程内不良
                this.DefectRateData.datasets[1].data = wastedefByDay;   // 捨て打ち
                this.DefectRateData.datasets[2].data = setupdefByDay;   // 段取り
                // グラフエリアを更新
                this.ProdChartData = { ...this.ProdChartData };
                this.OperatingRateData = { ...this.OperatingRateData};
                this.DefectRateData = { ...this.DefectRateData };

                // 工場全体の生産進捗勝ち負け表示
                this.displayProdResult(PlanTotal,ProgTotal);
            },
            error: (err) => console.error(err),
            });

        }
        // 切削
        else if(type === 1){
            this.kpiService.getMachiningKPI(factory, parts, machine, date).subscribe({
            next: (res: MachiningResponse) => {
                // --- アクセス方法 ---
                this.machiningplans = Array.isArray(res.MachiningPlan) ? res.MachiningPlan : [];
                this.machiningprogs = Array.isArray(res.MachiningProg) ? res.MachiningProg : [];
                this.machiningbaseCTs = Array.isArray(res.MachiningBaseCT) ? res.MachiningBaseCT : [];                
                // グラフ用データを生成
                // 生産計画(切削の生産計画は品番ごとのため、1ライン当たりの生産数を算出)
                let lines = this.machinelistValues.length -1 ;    // 全ラインを除外
                if(machine === 'all'){
                    lines = 1;  // 全ラインが選択されている場合
                }
                const orderByMonth = this.machiningplans[0].total;    //月の切削指示数
                const planPerline = Math.ceil(this.machiningplans[0].target_prod / lines);
                let planByDay: number[] = new Array(31).fill(0);      //日ごと生産計画数
                // 100%稼働時の生産数を基準CT+24h稼働で計算(結果はMath.floorで整数にする)
                let prodByBaseCT = 0
                for(let i=0;i<this.machiningbaseCTs.length;i++){
                    prodByBaseCT += Math.floor(3600 * 24 / this.machiningbaseCTs[i].CT);

                }
                // 100%稼働時の生産数を計算
                const baseByDay: number[] = new Array(31).fill(prodByBaseCT);
                // 休日を除外
                this.weekendDays = getWeekendDaysOfCurrentMonth();
                for(let c=0;c<this.weekendDays.length;c++){
                    const index = this.weekendDays[c];
                    planByDay[index-1] = 0;
                    baseByDay[index-1] = 0;
                }
                
                // 生産実績
                for(let n=0;n<this.machiningprogs.length;n++){
                    // 日付部分をintに変換
                    const day = parseInt(this.machiningprogs[n].prod_date.split('-')[2], 10); 
                    progByDay[day-1] = this.machiningprogs[n].good_prod;       // 良品数
                    planByDay[day-1] = planPerline;     // 生産指示数
                    // 工程内不良は以下の部分に処理を追加
                    // progPerplan[day-1] =(progByDay[day-1]/planByDay[day-1])*100;  // 可動率
                    progPerplan[day-1] =(progByDay[day-1]/baseByDay[day-1])*100;  // 稼働率
                    targetPerplan[day-1] = 85;                                    // 目標可動率
                    inlinedefByDay[day-1] = (this.machiningprogs[n].inline_defect/this.machiningprogs[n].good_prod)*100;      // 工程内不良
                    visualdefByDay[day-1] = (this.machiningprogs[n].visual_defect/this.machiningprogs[n].good_prod)*100;         // 外観不良(捨て打ち)            
                    // 切削稼働日を格納
                    daycount = daycount+1;
                    // 生産計画と生産実績の累積を格納
                    // Number()で囲わなかった際にstring型と認識されてしまったため、Number()を適用
                    PlanTotal = Number(PlanTotal+planPerline);
                    ProgTotal = Number(ProgTotal)+Number(this.machiningprogs[n].good_prod);
                    
                }
                // データセットに値を代入。                
                this.ProdChartData.datasets[0].data = planByDay;    // 生産計画
                this.ProdChartData.datasets[1].data = progByDay;    // 生産実績

                this.OperatingRateData.datasets[0].data = targetPerplan;    // 目標稼働率
                this.OperatingRateData.datasets[1].data = progPerplan;      // 実稼働率
                
                this.DefectRateData.datasets[0].data = inlinedefByDay;  // 工程内不良
                this.DefectRateData.datasets[1].data = visualdefByDay;  // 外観不良
                // グラフエリアを更新
                this.ProdChartData = { ...this.ProdChartData };
                this.OperatingRateData = { ...this.OperatingRateData};
                this.DefectRateData = { ...this.DefectRateData };
                
                // 切削の場合、月の生産指示数とグラフ表示される日当たり生産数の累積を比較。
                // 生産指示数を超えた場合、月の生産指示数に値を置き換え
                if(orderByMonth < PlanTotal){
                    PlanTotal = orderByMonth;
                }
                // 工場全体の生産進捗勝ち負け表示
                this.displayProdResult(PlanTotal,ProgTotal);
            },
            error: (err) => console.error(err),
            });
        }

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

    // 生産勝ち負け表示
    displayProdResult(PlanTotal:number,ProgTotal:number){
        if(PlanTotal>ProgTotal){
            this.judge = '✖';
            this.delta = Math.floor(PlanTotal-ProgTotal);
        }
        else{
            this.judge = '〇';
            this.delta = Math.floor(ProgTotal - PlanTotal);
        }

        // グラフエリア内の凡例風文字列を変更
        const value = new Intl.NumberFormat('ja-JP').format(this.delta);
        const lines = [`進捗:${this.judge} 計画比:${value}`];
        let color;
        if(this.judge === '〇'){
            color='#2563ecff'
        }
        else if(this.judge === '✖'){
            color='#dc2626'
        }
        // オプション再生成（参照を変える）
        this.ProdChartOptions = {
            ...this.ProdChartOptions,
            plugins: {
            ...this.ProdChartOptions.plugins,
            legendLikeText: {
                ...this.ProdChartOptions.plugins?.legendLikeText,
                lines,color
            }
            }
        };
        // 反映が弱いときは refresh
        this.prodChart?.refresh();
    
    }

}

