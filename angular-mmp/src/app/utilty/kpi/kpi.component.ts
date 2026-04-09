import { Component, OnInit, OnDestroy, ViewChild, HostListener } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IonicModule } from '@ionic/angular';
import { PickerController } from "@ionic/angular";
import { ButtonModule } from "primeng/button";
import { ChartModule, UIChart } from "primeng/chart";
import { DropdownModule } from "primeng/dropdown";
import { FluidModule } from "primeng/fluid";
import { ToastModule } from "primeng/toast";
import { ToggleButtonModule } from "primeng/togglebutton";
import { MessageService } from "primeng/api";
import { MessageModule } from "primeng/message";
import { debounceTime, Subscription, Subject, takeUntil } from 'rxjs';

import { LayoutService } from "../../layout/service/layout.service";
import { KpiService } from "../../services/kpi.service";
import { formatK,getFirstDayOfCurrentMonthInJST, getWeekendDaysOfCurrentMonth } from "../../shared/utils";
import { averageNonZero1D, addArrays, addManyArrays } from "../../shared/utils";
import { FactoryOption,Dropdownitem,PartsList,LastUpdatedPlan, LastUpdatedProd } from "../../interface/ui";
import { ForgingPlanItem,ForgingProgItem,ForgingResponse } from "../../interface/forging";
import { MachiningPlanItem,MachiningProgItem,MachiningBaseCTItem,MachiningResponse } from "../../interface/machining";
import { HtmlLegendOptions,LegendLikeTextOptions } from "../../interface/chartoption";

import Chart, {
  Chart as ChartJS,         // クラス本体
  ChartType,               // 'bar' | 'line' | ...
  Plugin,                  // プラグイン型
  LegendItem
}
 from 'chart.js/auto';

//拡張後のプラグインのオプション型を定義 
// type LegendLikeTextAlign = 'left' | 'right';
// type LegendLikeTextPosition = 'top' | 'bottom';

// interface LegendLikeTextOptions {
//   /** 表示する行（上からの順） */
//   lines?: string[];
//   /** 文字色 */
//   color?: string;
//   /** フォント */
//   font?: {
//     size?: number;
//     weight?: string; // 'normal' | 'bold' など
//     family?: string; // 追加: 任意フォント（デフォルトは sans-serif）
//   };
//   /** 行間（px）。未指定なら size+4 */
//   lineHeight?: number;
//   /** 右寄せ/左寄せ（textAlign に反映） */
//   align?: LegendLikeTextAlign;
//   /** 上側/下側（textBaseline の初期値と積み上げ方向に影響） */
//   position?: LegendLikeTextPosition;
//   /** 余白（従来の外側配置に使う） */
//   margin?: number;

//   /** ★ 追加: 座標指定（キャンバスの左上原点、px） */
//   x?: number;
//   y?: number;
// }

// // 外部凡例用オプション
// interface HtmlLegendOptions {
//   containerId: string;                    // 右側凡例のDOMコンテナID
//   colorMap?: Record<string, string>;      // ラベル -> 色
//   order?: string[];                       // 表示順（先頭が上に）
//   fontSize?: number;                      // 凡例ラベルのフォントサイズ（px）
//   boxSize?: number;                       // カラースウォッチの一辺（px）
// }

// --- Chart.js へプラグインオプションを「認識」させる（モジュール拡張） ---
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
  // afterDraw/afterDatasetsDraw/afterRender など好みでOK。ここでは afterDraw。
  afterDraw(chart: ChartJS, _args: unknown, opts?: LegendLikeTextOptions) {
    const { ctx, chartArea, width } = chart;
    if (!ctx || !chartArea) return;
    if (!opts?.lines || opts.lines.length === 0) return;

    // === Options（デフォルト） ===
    const lines = opts.lines ?? ['注記: サンプル'];
    const color = opts.color ?? '#333';
    const size = opts.font?.size ?? 12;
    const weight = opts.font?.weight ?? 'normal';
    const family = opts.font?.family ?? 'sans-serif';
    const margin = opts.margin ?? 6;
    const align = opts.align ?? 'right';     // 'left' | 'right'
    const position = opts.position ?? 'top'; // 'top' | 'bottom'
    const lineHeight = opts.lineHeight ?? size + 4;

    // === 描画前準備 ===
    ctx.save();
    ctx.fillStyle = color;
    ctx.textAlign = align === 'right' ? 'right' : 'left';
    ctx.textBaseline = position === 'top' ? 'bottom' : 'top';
    ctx.font = `${weight} ${size}px ${family}`;

    // === 基準座標の決定 ===
    // 1) opts.x/opts.y が与えられていれば、その座標を使用（キャンバス座標）
    // 2) 未指定なら、従来の外側配置ロジックで近い位置に置く
    //    - align = 'right' の場合は右端
    //    - position = 'top' の場合は上側
    let baseX: number;
    let baseY: number;

    if (typeof opts.x === 'number' && typeof opts.y === 'number') {
      baseX = opts.x;
      baseY = opts.y;
    } else {
      // 旧動作に近い配置（凡例風：右上外側寄り）
      baseX = align === 'right' ? (width - margin) : (chartArea.left + margin);
      baseY = position === 'top' ? (chartArea.top - margin) : (chartArea.bottom + margin);
    }

    // === 行の描画 ===
    // position='top' の場合：基準Yから上に積む（textBaseline='bottom'）
    // position='bottom' の場合：基準Yから下に積む（textBaseline='top'）
    lines.forEach((text, idx) => {
      const y =
        position === 'top'
          ? baseY - (lines.length - 1 - idx) * lineHeight
          : baseY + idx * lineHeight;
      ctx.fillText(text, baseX, y);
    });

    ctx.restore();
  },
};

// （A）グローバル登録で使う場合
Chart.register(LegendLikeTextPlugin);

@Component({
    selector: 'app-utility-kpi',
    standalone:true,
    imports:[ButtonModule,CommonModule,ChartModule,DropdownModule,FormsModule,FluidModule,MessageModule,
             ToastModule,ToggleButtonModule,IonicModule],
    templateUrl: './kpi.component.html',
    styleUrl: './kpi.component.scss',
    providers:[MessageService],
})

export class UtilityKpiComponent implements OnInit,OnDestroy{

    @ViewChild('prodChart') prodChart?:UIChart;

    private destroy$ = new Subject<void>();

    factory = '';
    type = '';
    subscription: Subscription;

    // 右側外部凡例のプラグイン
    public htmlLegendPlugin = {
        id: 'htmlLegend',
        afterUpdate(chart: Chart, _args: any, options: HtmlLegendOptions) {
            const { containerId, colorMap = {}, order = [], fontSize = 12, boxSize = 10 } = options || {};
            if (!containerId) return;

            const container = document.getElementById(containerId);
            if (!container) return;

            // 右側コンテナを空にする
            while (container.firstChild) container.firstChild.remove();

            // 既定の凡例項目を取得
            const items: LegendItem[] = Chart.defaults.plugins.legend.labels.generateLabels(chart);

            // 色適用
            items.forEach((item) => {
            const text = item.text ?? '';
            const color = colorMap[text] ?? '#666';
            item.fillStyle = color;
            item.strokeStyle = color;
            item.lineWidth = 0;
            });

            // 並び順（指定があれば適用）
            if (order.length) {
            const orderIndex = new Map(order.map((k, i) => [k, i]));
            items.sort((a, b) => {
                const ai = orderIndex.get(a.text ?? '') ?? Number.MAX_SAFE_INTEGER;
                const bi = orderIndex.get(b.text ?? '') ?? Number.MAX_SAFE_INTEGER;
                return ai - bi;
            });
            }

            // HTML生成（クリックで表示/非表示トグルの既定挙動を再現）
            items.forEach((item) => {
            const li = document.createElement('div');
            li.className = 'legend-item';
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.gap = '6px';
            li.style.whiteSpace = 'nowrap';
            li.style.fontSize = `${fontSize}px`;
            li.style.cursor = 'pointer';

            const swatch = document.createElement('span');
            swatch.className = 'legend-swatch';
            swatch.style.width = `${boxSize}px`;
            swatch.style.height = `${boxSize}px`;
            swatch.style.borderRadius = '2px';
            swatch.style.background = (item.fillStyle as string) || '#666';

            const label = document.createElement('span');
            label.textContent = item.text ?? '';

            // クリックで可視/不可視を切替
            // li.onclick = () => {
            //     const type = chart.config.type;
            //     if (type === 'pie' || type === 'doughnut') {
            //     chart.toggleDataVisibility(item.index!);
            //     } else {
            //     const dsMeta = chart.getDatasetMeta(item.datasetIndex!);
            //     dsMeta.hidden = dsMeta.hidden === null
            //         ? !chart.data.datasets[item.datasetIndex!].hidden
            //         : null;
            //     }
            //     chart.update();
            // };

            li.appendChild(swatch);
            li.appendChild(label);
            container.appendChild(li);
            });
        },
    };

    constructor(
        private route: ActivatedRoute,
        private layoutService: LayoutService,
        private kpiService: KpiService,
        private messageService: MessageService
        ) {
        // ページのルートパラメータが変わるたびに更新する様に設定。
        this.route.paramMap.subscribe(params => {
        this.factory = params.get('factory') ?? '';
        this.type = params.get('type') ?? '';
        });
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25)).subscribe(() => {
            
        });
    }

    // ルートパラメータ(工場名)と工場区分の紐づけ
    factoryNo: number = 0;
    factoryCode: FactoryOption[] = [
    { name: 'jupiter', code: 1 },
    { name: 'mercury', code: 2 },
    { name: 'tierra',  code: 4 },
    { name: 'tierra2', code: 6 },
    { name: 'saturn',  code: 5 }
    ];

    // 加工方法(切削・鍛造)のルートパラメータの格納先を宣言(number)
    typeNum: number = 0;
    // 品番
    partslistValues:  Dropdownitem[] = [];
    partslistValue: Dropdownitem | null = null;
    // ラインNo・設備名
    machinelistValues: Dropdownitem[] = [];
    machinelistValue: Dropdownitem | null = null;
    // 鍛造生産計画・進捗データ格納
    formarplans: ForgingPlanItem[] = [];
    formarprogs: ForgingProgItem[] = [];
    // 切削生産計画・進捗データ格納
    machiningplans: MachiningPlanItem[] = [];
    machiningprogs: MachiningProgItem[] = [];
    machiningbaseCTs: MachiningBaseCTItem[] = [];
    weekendDays: number[] = [];     // 休日の日付を格納用
    // 生産勝ち負け表示
    judge: string = '〇';       // 生産進捗
    delta: string = '0';          // 差分
    // アップデート日時
    updated_plan: Date = new Date;
    updated_prod: Date = new Date;

    // Chartの初期設定
    chartHeight = 280;
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
    OperatingAve: number | null=null;
    // 不良率
    DefectRateData: any;
    DefectRateOptions: any;
    DefectSum: number[] = [];
    DefectAve: number | null=null;

    // ブラウザ立上げ時
    ngOnInit(){
        this.route.paramMap.subscribe(params => {
            const name = params.get('factory');
            const type = params.get('type');
            this.factoryNo = this.factoryCode.find(x => x.name === name)?.code ?? 0;
            this.typeNum = Number(type);
            this.loadDropdownItems(this.factoryNo,this.typeNum);
            this.initCharts();
            this.loadLastupdated();
            
        });
        
    }

    // ビュー初期設定後処理
    ngAfterViewInit() {
        this.initCharts();
        this.updateChartHeight();
    }

    // ブラウザ終了時
    ngOnDestroy(){
        this.destroy$.next();
        this.destroy$.complete();
    }

    // p-chartのheightをウインドウサイズを基に自動調整
    @HostListener('window:resize')
    onResize(){
        this.updateChartHeight();
    }

    updateChartHeight(){
        const h = window.innerHeight;
        this.chartHeight = Math.max(200,Math.floor(h*0.23));
    }
    // ここまで
    // UI表示関連
    // 品番リスト読み込み
    loadDropdownItems(factoryCode: number,typeNumber: number) {
        // 固定項目として全品番を宣言
        const fixedItem = {name: '全品番', code: 'all'}
        // 加工方法で分岐 1:切削　0:鍛造
        if(typeNumber == 1){
            this.kpiService.getPartslist(factoryCode).subscribe((items: PartsList[]) =>
            {
                const dynamicItems = items.map(item => ({
                    name: item.parts_name,
                    code: item.parts_no
                }));
                this.partslistValues = [fixedItem, ...dynamicItems];
                console.table(this.partslistValues);
            });

        }
        else if(typeNumber == 0){
            this.partslistValues = [fixedItem];

        }
        // 先頭のインデックスを固定項目に設定
        this.partslistValue = null;
        
    }

    // 設備リスト読み込み
    loadMachineListItems(factoryCode: number, partsCode: string) {
        type OptionItem = {name:string;code:string};
        // 呼び出し前ガード
        if (!this.partslistValue || this.partslistValue.code === undefined) {
            // 必要なら初期化やログ
            return;
        }
        // 'all' かつ切削の場合は固定項目のみ
        if (this.partslistValue.code === 'all' && this.typeNum == 1) {
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
            this.kpiService.getLineNo_type(factoryCode, partsCode, this.typeNum).subscribe({
            next: (items: any[]) => {
            const list = Array.isArray(items) ? items : [];
            let dynamicItems: OptionItem[] = [];
            if (this.typeNum === 0) {
                // 鍛造なら machine_name
                dynamicItems = list.map(item => ({
                name: item?.machine_name ?? '',
                code: item?.machine_name ?? ''
                }));
            } else if (this.typeNum === 1) {
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

    // 品番選択後
    onPartsNoSelect() {
        if (this.partslistValue && this.partslistValue.code !== undefined) {
            this.loadMachineListItems(this.factoryNo, this.partslistValue.code);
        }

    }
    // 品名選択後
    onPartsNameSelect() {
        if (this.partslistValue && this.partslistValue.code !== undefined) {
            this.loadMachineListItems(this.factoryNo, this.partslistValue.code);
        }
    }
    
    // 最終更新日を取得
    loadLastupdated(){
        this.kpiService.getDatePlan(this.typeNum).pipe(takeUntil(this.destroy$))
            .subscribe((item: LastUpdatedPlan) =>{
                this.updated_plan = item.updated_at;
                
        });
        this.kpiService.getDateProd(this.factoryNo,this.typeNum).pipe(takeUntil(this.destroy$))
            .subscribe((item: LastUpdatedProd) =>{
                this.updated_prod = item.prod_date;

        });
    }

    // グラフエリア初期設定
    initCharts() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
        let colorMap_defect: Record<string,string>={};
        if(this.typeNum === 0){
            colorMap_defect = {
                '工程内': '#ff0000ff',
                '捨打ち': '#b0b0b0ff',
                '段取り': '#fed70fff'    
            }

        }
        else if(this.typeNum === 1){
            colorMap_defect = {
                '工程内': '#ff0000ff',
                '外観': '#66BB6A'    
            }

        }

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
                },
                {
                    type: 'bar',
                    label: '実績',
                    backgroundColor: '#0022ffff',
                    borderColor: '#0022ffff',
                    data: [6100, 5800, 5500, 6200, 6000, 0, 0],
                }
                
            ]
        };

        this.ProdChartOptions = {
            maintainAspectRatio: false,
            aspectRatio: 1.0,
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                } as any,
                htmlLegend: {    
                    containerId: 'product-legend',
                        // 任意：このページ専用の凡例色・並び
                        colorMap: {
                        '計画': '#b0b0b0ff',
                        '実績': '#0022ffff',
                        },
                        fontSize: 18,
                        boxSize: 10,
                } as any,
                
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
                y: {
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
                },
                {
                    type: 'bar',
                    label: '実績',
                    backgroundColor: '#0022ffff',
                    borderColor: '#0022ffff',
                    data: [102, 97, 91, 103, 10],
                },
                
            ]

        };

        this.OperatingRateOptions = {
            maintainAspectRatio: false,
            aspectRatio: 1.0,
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                } as any,
                htmlLegend: {
                    containerId: 'operating-legend',
                        // 任意：このページ専用の凡例色・並び
                        colorMap: {
                        '目標': '#b0b0b0ff',
                        '実績': '#0022ffff',
                        },
                        fontSize: 18,
                        boxSize: 10,
                } as any,
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
                y: {
                    max: 100,
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
        if(this.typeNum === 0){
            this.DefectRateData = {
            labels: this.labels_day,
            datasets: [
                {
                type: 'bar',
                label: '工程内',
                backgroundColor: '#ff0000ff',
                data: [0.25, 0.19, 0.40, 0.1, 0.3],
                },
                
                {
                type: 'bar',
                label: '捨打ち',
                backgroundColor: '#b0b0b0ff',
                data: [0.28, 0.28, 0.20, 0.2, 0.2],
                },
                {
                type: 'bar',
                label: '段取り',
                backgroundColor: '#fed70fff',
                data: [0.28, 0.28, 0.20, 0.2, 0.2],
                }
                
            ]

        };

        }
        else if(this.typeNum === 1){
            this.DefectRateData = {
            labels: this.labels_day,
            datasets: [
                {
                type: 'bar',
                label: '工程内',
                backgroundColor: '#ff0000ff',
                data: [0.25, 0.19, 0.40, 0.1, 0.3],
                },
                
                {
                type: 'bar',
                label: '外観',
                backgroundColor: '#66BB6A',
                data: [0.28, 0.28, 0.20, 0.2, 0.2],
                },
                
            ]

            };

        }
        
        this.DefectRateOptions = {
            maintainAspectRatio: false,
            aspectRatio: 1.0,
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                } as any,
                htmlLegend: {
                    containerId: 'defect-legend',
                        colorMap:colorMap_defect,
                        fontSize: 18,
                        boxSize: 10,
                } as any,
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
                y: {
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
                        callback: (value:any) => Number(value).toFixed(2),
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
        const machine = this.machinelistValue?.code;        // 設備
        const date = getFirstDayOfCurrentMonthInJST();      // 今月1日をstring型で生成
        let parts = this.partslistValue?.code;              // 品番
        // 切削の場合、あいまい検索用に品番を成形
        // 末尾の'-1'を削除
        if(this.typeNum == 1 && parts?.endsWith('-1')){
            parts = parts.slice(0,-2);
        }
        // 末尾の'ＣＫＤ'を削除
        if(this.typeNum == 1 && parts?.endsWith('CKD')){
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
        if(this.typeNum === 0){
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
                
                // 稼働率・不良率の平均値を計算(0は除外)
                this.OperatingAve = averageNonZero1D(progPerplan);
                this.DefectSum = addManyArrays(inlinedefByDay,wastedefByDay,setupdefByDay);
                this.DefectAve = averageNonZero1D(this.DefectSum);

            },
            error: (err) => console.error(err),
            });

        }
        // 切削
        else if(this.typeNum === 1){
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

                // 稼働率・不良率の平均値を計算(0は除外)
                this.OperatingAve = averageNonZero1D(progPerplan);
                this.DefectSum = addArrays(inlinedefByDay,visualdefByDay);
                this.DefectAve = averageNonZero1D(this.DefectSum);
                
            },
            error: (err) => console.error(err),
            });
        }

    }

    // 不良率凡例変更
    chengeDefectLegend(){
        // 不良率
        if(this.typeNum === 0){
            this.DefectRateData = {
            labels: this.labels_day,
            datasets: [
                {
                type: 'bar',
                label: '工程内',
                backgroundColor: '#ff0000ff',
                },
                
                {
                type: 'bar',
                label: '捨打ち',
                backgroundColor: '#b0b0b0ff',
                },
                {
                type: 'bar',
                label: '段取り',
                backgroundColor: '#fed70fff',
                }
                
            ]

        };

        }
        else if(this.typeNum === 1){
            this.DefectRateData = {
            labels: this.labels_day,
            datasets: [
                {
                type: 'bar',
                label: '工程内',
                backgroundColor: '#ff0000ff',
                },
                
                {
                type: 'bar',
                label: '外観',
                backgroundColor: '#66BB6A',
                },
                // {
                // type: 'line',
                // label: '目標不良率',
                // //backgroundColor: '#de2f2fff',
                // borderColor: '#000000ff',
                // data: new Array(31).fill(0.5),
                // }
                
            ]

            };

        }
    }

    // 生産勝ち負け表示
    displayProdResult(PlanTotal:number,ProgTotal:number){
        let value;
        if(PlanTotal>ProgTotal){
            this.judge = '✖';
            value = Math.floor(PlanTotal-ProgTotal);
            this.delta = '-' + value.toLocaleString('ja-JP');
        }
        else{
            this.judge = '〇';
            value = Math.floor(ProgTotal - PlanTotal)
            this.delta = '+' + value.toLocaleString('ja-JP');
        }

        // グラフエリア内の凡例風文字列を変更
        // const value = new Intl.NumberFormat('ja-JP').format(this.delta);
        // const lines = [`進捗:${this.judge} 計画比:${value}`];
        // let color;
        // if(this.judge === '〇'){
        //     color='#2563ecff'
        // }
        // else if(this.judge === '✖'){
        //     color='#dc2626'
        // }
        // // オプション再生成（参照を変える）
        // this.ProdChartOptions = {
        //     ...this.ProdChartOptions,
        //     plugins: {
        //     ...this.ProdChartOptions.plugins,
        //     legendLikeText: {
        //         ...this.ProdChartOptions.plugins?.legendLikeText,
        //         lines,color
        //     }
        //     }
        // };
        // 反映が弱いときは refresh
        this.prodChart?.refresh();
    
    }

}

