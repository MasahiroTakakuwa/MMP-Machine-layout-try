import { Component, OnInit, OnDestroy,ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { ButtonModule } from "primeng/button";
import { ChartModule } from "primeng/chart";
import { CheckboxModule } from "primeng/checkbox";
import { DropdownModule } from "primeng/dropdown";
import { FluidModule } from "primeng/fluid";
import { TableModule } from "primeng/table";
import { ToastModule } from "primeng/toast";
import { ToggleButtonModule } from "primeng/togglebutton";
import { MessageService } from "primeng/api";
import { MessageModule } from "primeng/message";

import { Chart, LegendItem, ScriptableScaleContext } from "chart.js";

import { debounceTime, forkJoin, Subject, Subscription, startWith, switchMap, takeUntil, timer, of, filter, BehaviorSubject, from } from 'rxjs';
import { concatMap, map, tap, catchError } from "rxjs";

import { LayoutService } from "../../layout/service/layout.service";
import { SchedulerService } from "../../services/scheduler.service";

import { FactoryOption,Dropdownitem,LineListGroup,ChartDataGroup,ChartColerGroup } from "../../interface/ui";
import { IFooter, IMachinelist, IToolprogerss, MachineRow, ColumnDef } from "../../interface/scheduler";

import { toBackgroundColors, legendColorMap_Tools, legendColorMap_Counts } from "../../shared/utils";


// "残り時間(分)" を数値に正規化するヘルパー
    export function toNumber(val: unknown): number {
    if (val == null) return NaN;
    // 文字列の場合、全角数字→半角、カンマ除去、前後空白除去
    const s = String(val)
        .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
        .replace(/,/g, '')
        .trim();
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
    }

@Component({
    selector: 'app-utility-scheduler',
    standalone:true,
    imports: [ButtonModule, CommonModule, ChartModule, CheckboxModule, DropdownModule, FormsModule, FluidModule, MessageModule,TableModule,
    ToastModule, ToggleButtonModule],
    templateUrl: './scheduler.component.html',
    styleUrl: './scheduler.component.scss',
    providers:[MessageService],
})

export class UtilitySchedulerComponent implements OnInit, OnDestroy {

    private destroy$ = new Subject<void>();
    
    checked = false;
    private checked$ = new BehaviorSubject<boolean>(false);
    view = { tick: 0, lastUpdated: new Date() };

    factory = '';
    subscription: Subscription;

    // 軸ラベル位置変更のカスタムプラグイン
    public midpointLabelPlugin = {
        id: 'midpointLabelPlugin',
        afterDatasetsDraw: (chart: any) => {

            // 1) プラグイン設定の取得
            const opt = chart.options?.plugins?.midpointLabelPlugin ?? {};
            const labels: string[] | undefined = opt.labels;
            const format: 'range' | 'mid' = opt.format ?? 'range';

            // 2) yスケールを安全に取得（v2 / v3+ 両対応）
            const yScale =
            chart.scales?.y ||
            chart.scales?.['y-axis-0'] ||
            (chart.scales ? Object.values(chart.scales).find((s: any) => s.axis === 'y') : null);
            if (!yScale) return;

            const ctx = chart.ctx;
            const area = chart.chartArea;
            if (!ctx || !area) return;

            // 3) tick 値を取得（オブジェクト/数値の両対応）
            const rawTicks = Array.isArray(yScale.ticks) && yScale.ticks.length
            ? yScale.ticks
            : (typeof yScale.getTicks === 'function' ? yScale.getTicks() : []);

            const tickValues: number[] = rawTicks
            .map((t: any) => (typeof t === 'object' && t !== null && 'value' in t ? t.value : t))
            .filter((v: any) => typeof v === 'number' && !isNaN(v));

            if (tickValues.length < 2) return;

            // 4) テキスト描画の準備
            ctx.save();
            ctx.font = '18px sans-serif';
            ctx.fillStyle = '#666';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'right';

            // 5) 左余白側に描く（文字右端を x に合わせる）
            const x = area.left - 6; // 文字が切れる場合は options.layout.padding.left を増やす

            // 6) 中点ごとにラベル描画
            for (let i = 0; i < tickValues.length - 1; i++) {
            const v1 = tickValues[i];
            const v2 = tickValues[i + 1];
            const mid = (v1 + v2) / 2;

            // v2/v3+ 共通の API。無い場合のフォールバックも一応用意。
            const y = yScale.getPixelForValue
                ? yScale.getPixelForValue(mid)
                : (yScale.getPixelForTick
                    ? yScale.getPixelForTick(i) + (yScale.getPixelForTick(i + 1) - yScale.getPixelForTick(i)) / 2
                    : null);

            if (y == null) continue;

            // 7) 表示文字列の決定
            let label: string;
            if (Array.isArray(labels) && labels[i] != null) {
                label = String(labels[i]);
            } else {
                label = (format === 'mid') ? `${mid}` : `${v1}–${v2}`; // ダッシュは en dash 推奨
            }

            // 8) キャンバス内のみ描画
            if (y >= area.top && y <= area.bottom) {
                ctx.fillText(label, x, y);
            }
            }

            ctx.restore();
        }

    };

    // テーブルデータの背景色変化クラス
    public rowStyleClass(row: any){
        const minutes = toNumber(row.minutes_left);
        if (!Number.isFinite(minutes)) return {};
        // 閾値を上から順に（>=）
        const className =
            (minutes <= 15) ? 'row-caution' :
            (minutes <= 30) ? 'row-warning' :
            (minutes <= 60) ? 'row-ok' :
                              'row-error';
        return { [className]: true };
    };


    constructor(
        private route: ActivatedRoute,
        private layoutService: LayoutService,
        private schedulerService: SchedulerService,
        private messageService: MessageService
        ) {
        // ページのルートパラメータが変わるたびに更新する様に設定。
        this.route.paramMap.subscribe(params => {
        this.factory = params.get('factory') ?? '';
        });
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25),takeUntil(this.destroy$)
        ).subscribe(() => {
            
        });
        this.setupAutoRefresh();

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

        // 品番
        partslistValues:  Dropdownitem[] = [];
        partslistValue: Dropdownitem | null = null;
        // ラインNo・設備選択(3台分準備)
        lineGroups: LineListGroup[] =[
            {values:[],value:null},
            {values:[],value:null},
            {values:[],value:null},
        ];

        headerArray: number[] = [];
        footerArray: number[] = [];

        // p-tableの行・列の設定
        cols: ColumnDef[] = [
            { field: 'minutes_left', header: '残り時間(分)', width: '120px' },
            { field: 'machineData',  header: '品名/ライン' },
            { field: 'tool_no',      header: '工具No',      width: '100px' }
            
        ];

        rows: MachineRow[] = [];

        // 刃具交換本数積み上げ棒グラフ用チャートデータ
        ToolChangeData: any;
        ToolchangeOptions: any;
        ToolChangeData2: any;
        ToolchangeOptions2: any;
        ToolChartGroups: ChartDataGroup[] =[
            {Data: null,Options: null},
            {Data: null,Options: null},
            {Data: null,Options: null},
        ];
        ToolChartTitles: string[] =["設備1","設備2","設備3"];

        // 検証用
        flags1: number[] = [1,0,0,0,1];
        flags2: number[] = [0,1,0,1,0];
        flags3: number[] = [0,0,1,0,0];

        pattern1: number[] = [1,2,3,4,0];
        pattern2: number[] = [5,4,3,2,1];
        pattern3: number[] = [2,4,0,1,3];

        ColerPattern: string[] = ['transparent','#81bb66','#a200ff','#0011fd','#ffbb00','#ff0000ff'];
        ColorChangeGroups: ChartColerGroup[] =[
            {flag: this.flags1,color: '#ff0000ff' },
            {flag: this.flags2,color: '#ff0000ff' },
            {flag: this.flags3,color: '#ff0000ff' },
            {flag: this.flags2,color: '#ff0000ff' },
            {flag: this.flags1,color: '#ff0000ff' },
        ];
        ColorChangeGroups2: ChartColerGroup[] =[
            {flag: this.flags1,color: '#ff0000ff' },
            {flag: this.flags2,color: '#ff0000ff' },
            {flag: this.flags3,color: '#ff0000ff' },
            {flag: this.flags2,color: '#ff0000ff' },
            {flag: this.flags1,color: '#ff0000ff' },

        ];

        

    // ブラウザ立上げ時
    ngOnInit(){
        this.route.paramMap.subscribe(params => {
            const name = params.get('factory');
            this.factoryNo = this.factoryCode.find(x => x.name === name)?.code ?? 0;
            this.loadDropdownItems(this.factoryNo);
            // this.updateToggleState(this.factoryNo);
            this.initCharts();
            
        });
        
    }

    // ビュー初期設定後処理
    ngAfterViewInit() {
        this.initCharts();
        
    }

    // ブラウザ終了時
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();

    }

    // UI表示関連
    // 工場内のライン一覧リスト読み込み
    loadDropdownItems(factoryCode: number) {
        this.schedulerService.getLineNoSummary(factoryCode).subscribe((items: IMachinelist[]) =>
        {
            const dynamicItems = items.map(item => ({
                name: item.parts_name+String(item.line_no)+"ライン",
                code: item.header_machine
            }));
            // lineGroups内にそれぞれ格納(同一データ)
            this.lineGroups[0].values = [...dynamicItems];
            this.lineGroups[1].values = [...dynamicItems];
            this.lineGroups[2].values = [...dynamicItems];

        });

        // 先頭のインデックスを固定項目に設定
        this.lineGroups[0].value = null;
        this.lineGroups[1].value = null;
        this.lineGroups[2].value = null;
        
    }

    // 検証用(footer_machineの値を配列に格納)
    testFunction(headers: number[],footers: number[]){
        const factory = this.factoryNo | 0;
        // 配列内の0(未選択)を排除 ※2つの配列は同じ長さかつ0になるインデックスも同じ位置
        const idx = headers.findIndex(value => value === 0);
        const trimmed_header = idx >= 0 ? headers.slice(0,idx) : headers.slice();
        const trimmed_footer = idx >= 0 ? footers.slice(0,idx) : footers.slice();
        
        this.schedulerService.getTop10MinutesLeft(factory,trimmed_header,trimmed_footer).subscribe((res: MachineRow[]) =>{
            this.rows = res;
        });

    }

    // チェックボックスのON/OFF監視
    onToggle(isOn: boolean){
        this.checked$.next(isOn);
    }

    private setupAutoRefresh() {
        this.checked$
        .pipe(
            // ON のときだけ interval を流し、OFF で即停止
            switchMap((isOn) => (isOn ? timer(0,60000).pipe(startWith(0)) : of(null))),
            filter((v) => v !== null), // OFF 時のダミー値を除外
            map(() => ({ tick: this.view.tick + 1, lastUpdated: new Date() })),
            takeUntil(this.destroy$) // 破棄時に自動解除
        )
        .subscribe((nextView) => {
            // 最終更新日時を書き換え
            this.view = nextView;
            // グラフ再描画
            this.displayCharts();
        });
        
    }

    // グラフエリア初期設定
    initCharts() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
        
        // 刃具交換本数
        // 各グラフエリアを設定
        for(let i = 0;i < this.ToolChartGroups.length;i++){
            this.ToolChartGroups[i].Data = {
            labels: [0,15,30,45,60,75,90,105,120,135,150,165,180,195,210,225,240,255,270,285,300,315,330,345,360],
            datasets: [
                {
                type: 'bar',
                label: 'T1',
                backgroundColor: '#ff0000ff',
                data: [1, 1, 1, 1, 1],
                // yAxisID: 'y'
                },
                {
                type: 'bar',
                label: 'T2',
                backgroundColor: '#81bb66',
                data: [1, 1, 1, 1, 0],
                // yAxisID: 'y'
                },
                {
                type: 'bar',
                label: 'T3',
                backgroundColor: '#ffbb00',
                data: [1, 1, 1, 0, 0],
                // yAxisID: 'y'
                },
                {
                type: 'bar',
                label: 'T4',
                backgroundColor: '#0011fd',
                data: [1, 1, 0, 0, 0],
                // yAxisID: 'y'
                },
                {
                type: 'bar',
                label: 'T5',
                backgroundColor: '#a200ff',
                data: [1, 0, 0, 0, 0],
                // yAxisID: 'y'
                },
                
            ]
            };
            this.ToolChartGroups[i].Options = {
                maintainAspectRatio: false,
                aspectRatio: 1.0,
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        position: 'top',
                        align: 'start',
                        // text: this.ToolChartTitles[i],
                        text:'ライン単体 縦軸:交換数',
                        font: {
                            size:20
                        }
                    },
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
                        offset: false,
                        title:{
                            display:true,
                            text: '[分後]',
                            font: {size:18},
                            padding: {top:8,bottom: 0}
                        },
                        ticks: {
                            font: {
                                weight: 500,
                                size: 20
                            }
                        },
                        grid: {
                            offset: false,
                            lineWidth:(ctx: ScriptableScaleContext) => {
                                if(typeof ctx.index === 'number' && ctx.index % 4 === 0){
                                    return 2;
                                } 
                                return undefined;
                            },
                            color:(ctx: ScriptableScaleContext) => {
                                if(ctx.index! % 4 === 0){
                                    return 'rgba(255, 0, 0, 0.85)';
                                }
                                return undefined;
                            }
                        },
                    },
                    // Y軸の設定
                    y: {
                        type: 'linear',
                        position: 'left',
                        stacked: true,
                        title:{
                            display:true,
                            text: '[本]',
                            font: {size:18},
                            padding: {top:0,bottom: 8}
                        },
                        ticks: {
                            color: textColorSecondary,
                            beginAtZero: false,
                            precision: 0,
                            font: {
                                size:20
                            },
                            max: 20
                        },
                        grid: {
                            color: surfaceBorder,
                            drawBorder: false
                        }

                    },
                    
                }
            };
        }

        // 見え方検証用(transparentで透明化+凡例を固定表示)
        this.ToolChangeData = {
            labels: [0,15,30,45,60,75,90,105,120,135,150,165,180,195,210,225,240,255,270,285,300,315,330,345,360],
            datasets: [
                {
                type: 'bar',
                label: 'T1',
                data: [1, 1, 1, 1, 1],
                backgroundColor: (context: any) => {
                    const i = context.dataIndex;
                    return this.ColorChangeGroups[0].flag[i] === 0 ? 'transparent' : '#ff0000ff'
                },
                borderWidth:0,
                // yAxisID: 'y'
                },
                {
                type: 'bar',
                label: 'T2',
                data: [1, 1, 1, 1, 1],
                backgroundColor: (context: any) => {
                    const i = context.dataIndex;
                    return this.ColorChangeGroups[1].flag[i] === 0 ? 'transparent' : '#81bb66'
                },
                borderWidth:0,
                // yAxisID: 'y'
                },
                {
                type: 'bar',
                label: 'T3',
                data: [1, 1, 1, 1, 1],
                backgroundColor: (context: any) => {
                    const i = context.dataIndex;
                    return this.ColorChangeGroups[2].flag[i] === 0 ? 'transparent' : '#ffbb00'
                },
                borderWidth:0,
                // yAxisID: 'y'
                },
                {
                type: 'bar',
                label: 'T4',
                data: [1, 1, 1, 1, 1],
                backgroundColor: (context: any) => {
                    const i = context.dataIndex;
                    return this.ColorChangeGroups[3].flag[i] === 0 ? 'transparent' : '#0011ff'
                },
                borderWidth:0,
                // yAxisID: 'y'
                },
                {
                type: 'bar',
                label: 'T5',
                data: [1, 1, 1, 1, 1],
                backgroundColor: (context: any) => {
                    const i = context.dataIndex;
                    return this.ColorChangeGroups[4].flag[i] === 0 ? 'transparent' : '#a200ff'
                },
                borderWidth:0,
                // yAxisID: 'y'
                }
                
            ]

        };
        this.ToolchangeOptions = {
            maintainAspectRatio: false,
                aspectRatio: 1.0,
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        position: 'top',
                        align: 'start',
                        // text: this.ToolChartTitles[1],
                        text: 'ライン単体 縦軸:ツール番号',
                        font: {
                            size:20
                        }
                    },
                    legend: {
                        display: true,
                        position: 'right',
                        labels: {
                            color: textColor,
                            font: {
                                size:20
                            },
                            // 検証用
                            generateLabels(chart: Chart): LegendItem[] {
                                // 既定の凡例アイテムを生成
                                const items = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                // 各アイテムの見た目（色/線幅）を強制上書き
                                items.forEach((item) => {
                                    const text = item.text;
                                    // 1) マップの定義に基づいて背景色などを上書き
                                    const fillColor = legendColorMap_Tools[text];
                                    if (fillColor) {
                                    item.fillStyle = fillColor;     // 塗りはマップ定義を参照
                                    item.lineWidth = 0;             // 線幅は非表示
                                    return;
                                    }

                                });

                                return items;
                            },
                        // ここまで
                        },
                        
                    },
                    midpointLabelPlugin: {
                        labels: ['1','2','3','4','5'],
                        format: 'range'
                    }

                },
                scales: {
                    x: {
                        stacked: true,
                        offset: false,
                        title:{
                            display:true,
                            text: '[分後]',
                            font: {size:18},
                            padding: {top:8,bottom: 0}
                        },
                        ticks: {
                            font: {
                                weight: 500,
                                size: 20
                            }
                        },
                        grid: {
                            offset: false,
                            lineWidth:(ctx: ScriptableScaleContext) => {
                                if(typeof ctx.index === 'number' && ctx.index % 4 === 0){
                                    return 2;
                                } 
                                return undefined;
                            },
                            color:(ctx: ScriptableScaleContext) => {
                                if(ctx.index! % 4 === 0){
                                    return 'rgba(255, 0, 0, 0.85)';
                                }
                                return undefined;
                            }
                        },
                    },
                    // Y軸の設定
                    y: {
                        type: 'linear',
                        position: 'left',
                        stacked: true,
                        max: 5,
                        title:{
                            display:true,
                            text: '[T]',
                            font: {size:18},
                            padding: {top:0,bottom: 8}
                        },
                        ticks: {
                            display: false,
                            color: textColorSecondary,
                            beginAtZero: false,
                            precision: 0,
                            font: {
                                size:20
                            },
                            
                        },
                        grid: {
                            color: surfaceBorder,
                            drawBorder: false
                        }

                    },
                    
                }
        };
        // ここまで

        // 見え方検証用2(ライン別表示+交換本数でアイコン色変化)
        this.ToolChangeData2 = {
            labels: [0,15,30,45,60,75,90,105,120,135,150,165,180,195,210,225,240,255,270,285,300,315,330,345,360],
            datasets: [
                {
                type: 'bar',
                label: '1本',
                data: this.pattern1,
                backgroundColor: toBackgroundColors(this.pattern1),
                borderWidth:0,
                },
                {
                type: 'bar',
                label: '2本',
                data: this.pattern2,
                backgroundColor: toBackgroundColors(this.pattern2),
                borderWidth:0,
                },
                {
                type: 'bar',
                label: '3本',
                data: this.pattern3,
                backgroundColor: toBackgroundColors(this.pattern3),
                borderWidth:0,
                },
                {
                type: 'bar',
                label: '4本',
                // data: this.pattern1,
                // backgroundColor: toBackgroundColors(this.pattern1),
                borderWidth:0,
                },
                {
                type: 'bar',
                label: '5本',
                // data: this.pattern1,
                // backgroundColor: toBackgroundColors(this.pattern1),
                borderWidth:0,
                }
                
            ]

        };
        this.ToolchangeOptions2 = {
            maintainAspectRatio: false,
                aspectRatio: 1.0,
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        position: 'top',
                        align: 'start',
                        // text: this.ToolChartTitles[1],
                        text:'製品別 縦軸:ライン番号',
                        font: {
                            size:20
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            text: ['1本','2本','3本','4本','5本以上',],
                            color: textColor,
                            font: {
                                size:20
                            },
                            // 検証用
                            generateLabels(chart: Chart): LegendItem[] {
                                // 既定の凡例アイテムを生成
                                const items = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                // 各アイテムの見た目（色/線幅）を強制上書き
                                items.forEach((item) => {
                                    const text = item.text;
                                    // 1) マップの定義に基づいて背景色などを上書き
                                    const fillColor = legendColorMap_Counts[text];
                                    if (fillColor) {
                                    item.fillStyle = fillColor;     // 塗りはマップ定義を参照
                                    item.lineWidth = 0;             // 線幅は非表示
                                    return;
                                    }

                                });

                                return items;
                            },
                            // ここまで
                        }
                    },
                    midpointLabelPlugin: {
                        labels: ['1','2','3'],
                        format: 'range'
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        offset: false,
                        title:{
                            display:true,
                            text: '[分後]',
                            font: {size:18},
                            padding: {top:8,bottom: 0}
                        },
                        ticks: {
                            font: {
                                weight: 500,
                                size: 20
                            }
                        },
                        grid: {
                            offset: false,
                            lineWidth:(ctx: ScriptableScaleContext) => {
                                if(typeof ctx.index === 'number' && ctx.index % 4 === 0){
                                    return 2;
                                } 
                                return undefined;
                            },
                            color:(ctx: ScriptableScaleContext) => {
                                if(ctx.index! % 4 === 0){
                                    return 'rgba(255, 0, 0, 0.85)';
                                }
                                return undefined;
                            }
                        },
                    },
                    // Y軸の設定
                    y: {
                        type: 'linear',
                        position: 'left',
                        stacked: true,
                        max: 3,
                        title:{
                            display:true,
                            text: '[ライン]',
                            font: {size:18},
                            padding: {top:0,bottom: 8}
                        },
                        ticks: {
                            display: false,
                            color: textColorSecondary,
                            beginAtZero: false,
                            precision: 0,
                            font: {
                                size:20
                            },
                            
                        },
                        grid: {
                            color: surfaceBorder,
                            drawBorder: false
                        }

                    },
                    
                }
                
        };
        // ここまで
    }

    // グラフタイトル   再代入
    setTitle(idx: number, newTitle: string) {
        this.ToolChartTitles[idx] = newTitle;
        this.ToolChartGroups[idx].Options = {
        ...this.ToolChartGroups[idx].Options,
        plugins: {
            ...this.ToolChartGroups[idx].Options.plugins,
            title: {
            ...this.ToolChartGroups[idx].Options.plugins.title,
            text: newTitle
            }
        }
        };
        
    }

    // グラフ描画
    displayCharts(){
        // UIに入力されているデータを格納
        const factory = this.factoryNo | 0;
        let header = 0;
        this.headerArray = [];
        this.footerArray = [];
        // グラフデータ用の定数を宣言
        // 目盛数に合わせて変更(0～360分を15分刻み)
        const BUCKETS = 26;
        const tools = Array.from({ length: 5 }, (_, i) => `T${i + 1}`);
        // Max3台分グラフデータを生成 ※選択されている行だけを対象にしつつ、idxを保持
        const tasks = [];
        for (let i = 0; i < this.lineGroups.length; i++){
            // ドロップダウンリストが選択されているか確認
            header = this.lineGroups[i].value?.code ?? 0;
            // 未選択の場合はループから抜け出し、処理終了
            if(header === 0){
                break;
            }
            // 該当ラインの末端設備の機器番号を取得
            // 引数として使用するため、ここで値を固定
            const headerValue = header;
            const idx = i;
            // グラフエリアのタイトルにドロップダウンリストのnameを反映
            const newtitle = this.lineGroups[i].value?.name ?? "None";
            // this.setTitle(i,newtitle);
            // ヘッダーアドレスは同期で格納
            this.headerArray[idx] = headerValue;
            const task$ = this.schedulerService.getFooterMachine(factory,headerValue).pipe(
                map((res: IFooter | IFooter[]) => {
                    if (Array.isArray(res)){
                        const last = res.length > 0 ? res[res.length-1] : undefined;
                        return last?.footer_machine ?? 0;
                    }
                    else{
                        return res.footer_machine;
                    }
                }),
                // ここで末端設備番号を配列に格納
                tap((footer: number) => {
                    this.footerArray[idx] = footer;
                }),
                // ライン別の刃具交換までの残り時間を取得
                concatMap((footer: number) =>
                    this.schedulerService.getMinutesLeft(factory,headerValue,footer)
                ),
                map((items: IToolprogerss[]) => {
                    // ① Tool と minutes の列だけ抜き出し（型/値を正規化）
                    const rows = items
                    .map(x => ({
                        tool: (x as any).tool_no ?? (x as any).tool,
                        minutes: Number((x as any).minutes_left)
                    }))
                    .filter(x =>
                        typeof x.tool === 'string' &&
                        Number.isFinite(x.minutes) &&
                        x.minutes >= 0
                    );
                    // console.table(rows);                    
                    const zeroBuckets = () => Array.from({ length: BUCKETS }, () => 0);
                    const toBucket = (m: number) => Math.min(Math.floor(m / 15), BUCKETS - 1);
                    const histByTool = new Map<string, number[]>();
                    // Toolの本数分処理
                    for (const t of tools) {
                        // そのツールの minutes 配列を取り出す
                        const mins = rows.filter(r => r.tool === t).map(r => r.minutes);
                        // データが無ければ 0 埋めで固定長をセット
                        if (mins.length === 0) {
                            histByTool.set(t, zeroBuckets());
                            continue;
                        }
                        // データがある場合も固定長で初期化してからカウント
                        const buckets = zeroBuckets();
                        for (const m of mins) {
                            if (m < 0 || m > 360 || !Number.isFinite(m)){
                                continue; // 念のため防御
                            } 
                            const idx = toBucket(m);
                            buckets[idx] += 1;
                        }
                        histByTool.set(t, buckets);
                    }

                    return {idx, histByTool};
                }),
                catchError(err => {
                    console.error('集計エラー (idx=' + idx + ')', err);
                    const empty = new Map<string,number[]>();   
                    for (const t of tools) empty.set(t, Array(BUCKETS).fill(0));
                    return of({ idx, histByTool: empty });
                })
                );
                tasks.push(task$);
        }
        // API処理が全て完了後にまとめて処理
        forkJoin(tasks).pipe(takeUntil(this.destroy$)).subscribe({
            next: (results: { idx:number; histByTool:Map<string,number[]> }[]) => {
                for(const {idx,histByTool} of results){
                    tools.forEach((t, dIdx) => {
                        const arr = histByTool.get(t) ?? Array(BUCKETS).fill(0);
                        this.ToolChartGroups[idx].Data.datasets[dIdx].data = arr;
                        // console.log('idx:',idx);
                        // 検証用
                        if(idx === 1){
                            const values = Array(BUCKETS).fill(1);
                            this.ToolChangeData.datasets[dIdx].data = values;
                            this.ColorChangeGroups[dIdx].flag = arr;
                        }
                        // ここまで
                    });
                    this.ToolChartGroups[idx].Data = {...this.ToolChartGroups[idx].Data};
                    this.ToolChangeData = {...this.ToolChangeData}
                }
                this.testFunction([...this.headerArray],[...this.footerArray]);
            },
            error: err =>{
                console.error('集計エラー', err)
            } 
        });
        
    }

    // ライン別集計の検証用
    displayChart_SumLines(){
        // UIに入力されているデータを格納
        const factory = this.factoryNo | 0;
        let header = 0;
        this.headerArray = [];
        this.footerArray = [];
        // グラフデータ用の定数を宣言
        // 目盛数に合わせて変更(0～360分を15分刻み)
        const BUCKETS = 26;
        // Max3台分グラフデータを生成 ※選択されている行だけを対象にしつつ、idxを保持
        const tasks = [];
        for (let i = 0; i < this.lineGroups.length; i++){
            // ドロップダウンリストが選択されているか確認
            header = this.lineGroups[i].value?.code ?? 0;
            // 未選択の場合はループから抜け出し、処理終了
            if(header === 0){
                break;
            }
            // 該当ラインの末端設備の機器番号を取得(引数として使用するため、ここで値を固定)
            const headerValue = header;
            const idx = i;
            // ヘッダーアドレスは同期で格納
            this.headerArray[idx] = headerValue;
            const task$ = this.schedulerService.getFooterMachine(factory,headerValue).pipe(
                map((res: IFooter | IFooter[]) => {
                    if (Array.isArray(res)){
                        const last = res.length > 0 ? res[res.length-1] : undefined;
                        return last?.footer_machine ?? 0;
                    }
                    else{
                        return res.footer_machine;
                    }
                }),
                // ここで末端設備番号を配列に格納
                tap((footer: number) => {
                    this.footerArray[idx] = footer;
                    
                }),
                // ライン別の刃具交換までの残り時間を取得
                concatMap((footer: number) =>
                    this.schedulerService.getMinutesLeft(factory,headerValue,footer)
                ),
                map((items: IToolprogerss[]) => {
                    // ① minutes の列だけ抜き出し（値を正規化）
                    const rows = items.map(x => ({
                        minutes: Number((x as any).minutes_left)
                    }))
                    .filter(x => 
                        Number.isFinite(x.minutes) && x.minutes >= 0
                    );
                    const zeroBuckets = () => Array.from({ length: BUCKETS }, () => 0);
                    const toBucket = (m: number) => Math.min(Math.floor(m / 15), BUCKETS - 1);
                    const histByLine = new Map<number, number[]>();
                    // minutes 配列を取り出す
                    const mins = rows.map(r => r.minutes);
                    
                    // データが無ければ 0 埋めで固定長をセット
                    if (mins.length === 0) {
                        histByLine.set(i+1, zeroBuckets());
                        
                    }
                    else{
                        // データがある場合も固定長で初期化してからカウント
                        const buckets = zeroBuckets();
                        for (const m of mins) {
                            if (m < 0 || m > 360 || !Number.isFinite(m)){
                                continue; // 念のため防御
                            } 
                            const idx = toBucket(m);
                            buckets[idx] += 1;
                        }
                        histByLine.set(i+1, buckets);
                    }
                    return {idx, histByLine};
                    
                }),
                catchError(err => {
                    console.error('集計エラー (idx=' + idx + ')', err);
                    const empty = new Map<number,number[]>();   
                    return of({ idx, histByLine: empty });
                })
            );
            tasks.push(task$);
            
        }
        // API処理が全て完了後にまとめて処理
        forkJoin(tasks).pipe(takeUntil(this.destroy$)).subscribe({
            next: (results: { idx:number; histByLine:Map<number,number[]> }[]) => {
                for(const {idx,histByLine} of results){
                    const data = histByLine.values().next().value ?? Array(BUCKETS).fill(0);
                    const values = Array(BUCKETS).fill(1);
                    this.ToolChangeData2.datasets[idx].data = values;
                    this.ToolChangeData2.datasets[idx].backgroundColor = toBackgroundColors(data);
                    // console.log('index:',idx);
                    // console.log('data:',data);

                }
                this.ToolChangeData2 = {...this.ToolChangeData2};
            },
            error: err =>{
                console.error('集計エラー', err)
            } 
        });
        
    }
    // ここまで

}