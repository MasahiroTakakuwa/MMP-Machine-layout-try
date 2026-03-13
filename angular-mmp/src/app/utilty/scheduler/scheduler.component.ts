import { Component, OnInit, OnDestroy,ViewChild,ViewChildren,QueryList, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { UIChart,ChartModule } from "primeng/chart";
import { CheckboxModule } from "primeng/checkbox";
import { DropdownModule } from "primeng/dropdown";
import { FluidModule } from "primeng/fluid";
import { TableModule } from "primeng/table";
import { ToastModule } from "primeng/toast";
import { ToggleButtonModule } from "primeng/togglebutton";
import { MessageService } from "primeng/api";
import { MessageModule } from "primeng/message";
import { Chart, LegendItem, ScriptableScaleContext } from "chart.js";
import { debounceTime, forkJoin, Subject, Subscription, startWith, switchMap, takeUntil, timer, of, filter, BehaviorSubject, Observable } from 'rxjs';
import { map, tap, take, catchError } from "rxjs";

import { LayoutService } from "../../layout/service/layout.service";
import { SchedulerService } from "../../services/scheduler.service";
import { FactoryOption,Dropdownitem,LineListGroup,ChartDataGroup } from "../../interface/ui";
import { IMachinelist, IToolprogerss, MachineRow, ColumnDef, Grouplist, LineItems } from "../../interface/scheduler";
import { deepMerge, toBackgroundColors, toNumber, legendColorMap_Counts } from "../../shared/utils";


// Chartデータ切替
type BarDataSet = {
  type: 'bar';
  label: string;
  data?: number[];
  backgroundColor?: string | string[];
  borderWidth?: number;
};
type Options = any;
type ToolResult = { idx: number; kind: 'tool'; histByTool: Map<string, number[]> };
type LineResult = { idx: number; kind: 'line'; histByLine: Map<number, number[]> };
type HistogramResult = ToolResult | LineResult;
// ここまで

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
    @ViewChild('chart') chart?: any;
    @ViewChildren(UIChart) charts!: QueryList<UIChart>;

    private destroy$ = new Subject<void>();
    checked = false;
    private checked$ = new BehaviorSubject<boolean>(false);
    view = { tick: 0, lastUpdated: new Date() };

    factory = '';
    subscription: Subscription;

    private static pluginsRegistered = false;
    private registerPluginsOnce() {
        if (UtilitySchedulerComponent.pluginsRegistered) return;
        Chart.register(this.midpointLabelPlugin);
        UtilitySchedulerComponent.pluginsRegistered = true;
    }

    // 軸ラベル位置変更のカスタムプラグイン
    public midpointLabelPlugin = {
        id: 'midpointLabelPlugin',
        afterDatasetsDraw: (chart: any) => {
            const enabled = chart.options?.plugins.midpointLabelPlugin?.enabled;
            if(enabled !== true) return;

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
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
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
        
        selectGroupValues: IMachinelist[] = [];
        lineItems: LineItems[] = [];
        headerArray: number[] = [];
        footerArray: number[] = [];

        // p-tableの行・列の設定
        cols: ColumnDef[] = [
            { field: 'minutes_left', header: '残り時間(分)', width: '120px' },
            { field: 'machineData',  header: '品名/ライン' },
            { field: 'tool_no',      header: '工具No',      width: '100px' }
            
        ];

        rows: MachineRow[] = [];

        // toggleswitchの設定
        toggleValue: boolean = true;            // true:ライン別　false:グループ別
        toggleDisabled: boolean = false;        // ボタン動作を許可
        
        // 刃具交換本数積み上げ棒グラフ用チャートデータ
        ToolChangeData: any;
        ToolchangeOptions: any;
        
        ToolChartGroups: ChartDataGroup[] = [];        // 検証用(正常動作確認後、リネーム)
        ToolChartTitles: string[] =["設備1","設備2","設備3"];
        labels_y: string[] =['1','2','3','4','5','6'];
        // トグルスイッチでのグラフ切替検証
        // 共通(グラフ横軸ラベル)
        readonly labels = [0,15,30,45,60,75,90,105,120,135,150,165,180,195,210,225,240,255,270,285,300,315,330,345,360];

        // p-chart データバインド用
        data = this.buildDataPattern1();
        options: Options = deepMerge(this.baseOptions(), this.deltaPattern1());
        public usePattern1 = true;      // 切替状態
        totalChartAreaHeight = 900;     // px換算
        chartHeight = 300;              // 各チャートの高さ(自動計算で更新)
        pattern1ChartCount = 3;         // パターン1の初期枚数
        
        trackByIndex = (index: number) => index;    // .htmlの*ngforで使用
        
        // ToolChartGroupsの長さを必要数に合わせる
        private updateChartGroups(desiredCount: number){
            const current = this.ToolChartGroups.length;
            if(current > desiredCount){
                this.ToolChartGroups = this.ToolChartGroups.slice(0,desiredCount);
            }
            else if(current < desiredCount){
                for(let i = current; i < desiredCount; i++){
                    this.ToolChartGroups.push({Data: null as any, Options: {} as Options});

                }
            }
        }
        
        /** パターンに応じた個数と高さを決定 → Data/Options を全チャートに適用 → 描画更新 */
        private rebuildAndApply() {
            // 1) 枚数の決定
            const desiredCount = this.usePattern1 ? Math.max(1, this.pattern1ChartCount | 0) : 1;
            
            // 2) 配列長調整
            this.updateChartGroups(desiredCount);

            // 3) 高さ計算（Pattern1 は分割、Pattern2 は 1 つ = 1650）
            this.chartHeight = Math.floor(this.totalChartAreaHeight / desiredCount);
            
            // 4) Data/Options の生成（既存ロジックを踏襲）
            const data = this.usePattern1 ? this.buildDataPattern1() : this.buildDataPattern2();
            const base = this.baseOptions();
            const delta = this.usePattern1 ? this.deltaPattern1() : this.deltaPattern2();

            // Pattern2 のときだけ midpointLabelPlugin を有効化する、という既存方針を維持
            const pluginOpt = this.usePattern1
            ? { enabled: false }
            : { enabled: true, labels: this.labels_y, format: 'range' as const };

            const merged = deepMerge(base, delta);
            const options = deepMerge(merged, { plugins: { midpointLabelPlugin: pluginOpt } });

            // 5) 全チャートへ適用
            for (let i = 0; i < this.ToolChartGroups.length; i++) {
            // ※ 同一参照だとプラグイン内部状態が共有されることがあるため、気になる場合は clone を検討
            this.ToolChartGroups[i].Data = data;
            this.ToolChartGroups[i].Options = options;
            }

            // 6) すべての <p-chart> を更新
            queueMicrotask(() => {
            this.charts?.forEach(c => {
                try {
                c.chart?.update('none'); // アニメ無効の高速更新
                } catch {
                c.refresh();
                }
            });
            });

            this.applyHeightAndRedraw();
        }
      
        private applyHeightAndRedraw() {
            // 1) 変更検知を先に走らせて DOM (height) を反映
            this.cdr.detectChanges();

            // 2) 次のフレームで Chart.js にサイズ再計算を促す
            setTimeout(() => {
                this.charts?.forEach((c) => {
                const anyC = c as any;

                // A) data/options が大きく変わった場合は reinit() が一番確実
                if (typeof anyC.reinit === 'function') {
                    anyC.reinit();
                }

                // B) Chart.js のインスタンスがあるなら resize → update（アニメ無し）
                const inst = anyC.chart;
                if (inst?.resize) inst.resize();             // 親サイズを取り直す
                if (inst?.update) inst.update('none');       // レイアウトを再計算して描画
                else if (typeof anyC.refresh === 'function') anyC.refresh(); // 旧APIフォールバック
                });
            }, 0);
        }

        // データセットの切り替えパターンを予め作成
        // パターン1:ライン別
        private buildDataPattern1() {
            const datasets: BarDataSet[] = [
            { type: 'bar', label: 'T1', backgroundColor: '#ff0000ff', data: [1, 1, 1, 1, 1] },
            { type: 'bar', label: 'T2', backgroundColor: '#81bb66',   data: [1, 1, 1, 1, 0] },
            { type: 'bar', label: 'T3', backgroundColor: '#ffbb00',   data: [1, 1, 1, 0, 0] },
            { type: 'bar', label: 'T4', backgroundColor: '#0011fd',   data: [1, 1, 0, 0, 0] },
            { type: 'bar', label: 'T5', backgroundColor: '#a200ff',   data: [1, 0, 0, 0, 0] },
            ];
            return {
            labels: this.labels,
            datasets
            };
        }
        // パターン2:グループ別
        private buildDataPattern2() {
            const datasets: BarDataSet[] = [
            {
                type: 'bar',
                label: '1本',
                // data: this.pattern1,
                // backgroundColor: toBackgroundColors(this.pattern1),
                borderWidth: 0
            },
            {
                type: 'bar',
                label: '2本',
                // data: this.pattern2,
                // backgroundColor: toBackgroundColors(this.pattern2),
                borderWidth: 0
            },
            {
                type: 'bar',
                label: '3本',
                // data: this.pattern3,
                // backgroundColor: toBackgroundColors(this.pattern3),
                borderWidth: 0
            },
            {
                type: 'bar',
                label: '4本',
                // data: this.pattern4, // 値が無ければ undefined のまま
                // backgroundColor: this.pattern4 ? toBackgroundColors(this.pattern4) : undefined,
                borderWidth: 0
            },
            {
                type: 'bar',
                label: '5本',
                // data: this.pattern5,
                // backgroundColor: this.pattern5 ? toBackgroundColors(this.pattern5) : undefined,
                borderWidth: 0
            }
            ];
            return {
            labels: this.labels,
            datasets
            };
        }

        // オプションの共通部分       
        private baseOptions(textColor = '#333', textColorSecondary = '#666', surfaceBorder = '#e0e0e0'): Options {
            const gridLineWidth = (ctx: ScriptableScaleContext) => {
            if (typeof ctx.index === 'number' && ctx.index % 4 === 0) return 2;
            return undefined;
            };
            const gridLineColor = (ctx: ScriptableScaleContext) => {
            if (typeof ctx.index === 'number' && ctx.index % 4 === 0) return 'rgba(255, 0, 0, 0.85)';
            return undefined;
            };

            return {
            maintainAspectRatio: false,
            aspectRatio: 1.0,
            responsive: true,
            interaction: { mode: 'index', intersect: false }, // 追加推奨（ツールチップ等の安定化）
            plugins: {
                // title/legend/tooltip は各パターンで上書き
            },
            scales: {
                x: {
                stacked: true,
                offset: false,
                title: {
                    display: true,
                    text: '[分後]',
                    font: { size: 18 },
                    padding: { top: 8, bottom: 0 }
                },
                ticks: {
                    font: { weight: 500, size: 20 }
                },
                grid: {
                    offset: false,
                    lineWidth: gridLineWidth,
                    color: gridLineColor
                }
                },
                y: {
                type: 'linear',
                position: 'left',
                stacked: true,
                grid: { color: surfaceBorder, drawBorder: false },
                // title/ticks は各パターンで上書き
                }
            }
            };
        }

        // === パターン1の delta ===
        private deltaPattern1(textColor = '#333', textColorSecondary = '#666'): Options {
            return {
            plugins: {
                title: {
                display: true,
                position: 'top',
                align: 'start',
                text: 'ライン単体 縦軸:交換数',
                font: { size: 20 }
                },
                legend: {
                position: 'right',
                labels: {
                    color: textColor,
                    font: { size: 20 }
                }
                }
            },
            scales: {
                y: {
                title: {
                    display: true,
                    text: '[本]',
                    font: { size: 18 },
                    padding: { top: 0, bottom: 8 }
                },
                ticks: {
                    color: textColorSecondary,
                    beginAtZero: false,
                    precision: 0,
                    font: { size: 20 },
                    max: 20
                }
                }
            }
            };
        }

        // === パターン2の delta ===
        private deltaPattern2(textColor = '#333', textColorSecondary = '#666'): Options {
            return {
            plugins: {
                title: {
                display: true,
                position: 'top',
                align: 'start',
                text: '製品別表示 縦軸:ライン番号',
                font: { size: 20 }
                },
                legend: {
                position: 'right',
                labels: {
                    color: textColor,
                    font: { size: 20 },
                    generateLabels: (chart: Chart): LegendItem[] => {
                    const items = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                    items.forEach((item) => {
                        const text = item.text;
                        const fillColor = legendColorMap_Counts[text];
                        if (fillColor) {
                            item.fillStyle = fillColor;
                            item.lineWidth = 0;
                            return;
                        }
                    });
                    return items;
                    }
                }
                },
                // カスタムプラグイン（ランタイム切替は options.plugins に定義するだけが安全）
                midpointLabelPlugin: {
                labels: ['1', '2', '3', '4', '5', '6'],
                format: 'range'
                }
            },
            scales: {
                y: {
                max: this.lineItems.length,
                title: {
                    display: true,
                    text: '[ライン]',
                    font: { size: 18 },
                    padding: { top: 0, bottom: 20 }
                },
                ticks: {
                    display: false, // 目盛非表示
                    color: textColorSecondary,
                    beginAtZero: false,
                    precision: 0,
                    font: { size: 20 }
                }
                }
            }
            };
        }

        // === トグル処理 ===
        toggleDataset() {
            this.usePattern1 = !this.usePattern1;
            this.data = this.usePattern1 ? this.buildDataPattern1() : this.buildDataPattern2();
            const base = this.baseOptions();
            const delta = this.usePattern1 ? this.deltaPattern1() : this.deltaPattern2();
            const pluginOpt = this.usePattern1 ? { enabled: false } : { enabled: true, labels: ['1','2','3'], format: 'range' };
            const merged = deepMerge(base, delta);
            this.options = deepMerge(merged, { plugins: { midpointLabelPlugin: pluginOpt } });

            for(let i = 0;i < this.ToolChartGroups.length;i++){
                this.ToolChartGroups[i].Data = this.data;
                this.ToolChartGroups[i].Options = this.options;

                try {
                    this.chart?.chart?.update('none');
                    } catch {
                    this.chart?.refresh();
                }

            }
            
        }

        toggleDataset2(countForPattern1?: number){
            if (typeof countForPattern1 === 'number'){
                this.pattern1ChartCount = Math.max(1,countForPattern1 | 0);
            }

            this.rebuildAndApply();

        }

        // ここまで

    // ブラウザ立上げ時
    ngOnInit(){
        this.registerPluginsOnce();
        this.route.paramMap.subscribe(params => {
            const name = params.get('factory');
            this.factoryNo = this.factoryCode.find(x => x.name === name)?.code ?? 0;
            this.checkPartsGroups(this.factoryNo);
            // this.initCharts();
            this.toggleDataset2(3);
            
        });
        
    }

    // ビュー初期設定後処理
    ngAfterViewInit() {
        // this.initCharts();
        this.toggleDataset2(3);
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

    // 品番・係別でドロップダウンを生成
    checkPartsGroups(factoryCode: number) {
        this.schedulerService.getPartsGroupNo(factoryCode).subscribe((items: Grouplist[]) =>
        {
            const getItems = items.map(item => ({
                name: item.parts_name+" "+String(item.line_no)+"～",
                code: item.group_no
            }));
            this.lineGroups[0].values = [...getItems];

        });
        this.lineGroups[0].value = null;
    }

    // ドロップダウンリストが変更された時
    onDropdownChange(){
        const group = this.lineGroups[0].value?.code
        // 未選択の場合は何もせず戻る
        if(group === undefined) return;
        // 選択した製品グループのヘッダー・フッターアドレスを取得し格納
        this.schedulerService.getHeaderToFooter(this.factoryNo,group).pipe(
            take(1),    //1回だけ取得し完了(メモリリーク対策)
            map((items: IMachinelist[]) => 
                items.map(item => ({
                    line_name: item.parts_name+" "+String(item.line_no),
                    line_no: item.line_no,
                    header: item.header_machine,
                    footer: item.footer_machine,
                }))
            ),
            tap(mapped => this.lineItems = mapped),)
            .subscribe({
                // 完了をフラグにしてグラフオプションを更新
                complete: () => this.ResetChartOptions(),
                
            });
            
    }

    // ユーザーがトグルを押した時のハンドラ
    onToggleChange(): void {
        // Chartのデータセット、オプションを切替
        // this.toggleDataset();
        this.usePattern1 = !this.usePattern1;
        if(this.usePattern1){
            const count = this.lineItems.length;
            this.toggleDataset2(count);
            
        }
        else{
            this.toggleDataset2();
        }
        
    
    }

    // ここまで

    // 交換時期の近い刃具10件を取得
    checkToolchangeTiming(headers: number[],footers: number[]){
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

    // 表示内容の自動更新
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
    // initCharts() {
    //     const documentStyle = getComputedStyle(document.documentElement);
    //     const textColor = documentStyle.getPropertyValue('--text-color');
    //     const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    //     const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
    //     const BUCKETS = 25;
    //     // 刃具交換本数
    //     // 各グラフエリアを設定
    //     for(let i = 0;i < this.ToolChartGroups.length;i++){
    //         this.ToolChartGroups[i].Data = {
    //         labels: [0,15,30,45,60,75,90,105,120,135,150,165,180,195,210,225,240,255,270,285,300,315,330,345,360],
    //         datasets: [
    //             {
    //             type: 'bar',
    //             label: 'T1',
    //             backgroundColor: '#ff0000ff',
    //             data: Array(BUCKETS).fill(0),
    //             },
    //             {
    //             type: 'bar',
    //             label: 'T2',
    //             backgroundColor: '#81bb66',
    //             data: Array(BUCKETS).fill(0),
    //             },
    //             {
    //             type: 'bar',
    //             label: 'T3',
    //             backgroundColor: '#ffbb00',
    //             data: Array(BUCKETS).fill(0),
    //             },
    //             {
    //             type: 'bar',
    //             label: 'T4',
    //             backgroundColor: '#0011fd',
    //             data: Array(BUCKETS).fill(0),
    //             },
    //             {
    //             type: 'bar',
    //             label: 'T5',
    //             backgroundColor: '#a200ff',
    //             data: Array(BUCKETS).fill(0),
    //             },
                
    //         ]
    //         };
    //         this.ToolChartGroups[i].Options = {
    //             maintainAspectRatio: false,
    //             aspectRatio: 1.0,
    //             responsive: true,
    //             plugins: {
    //                 title: {
    //                     display: true,
    //                     position: 'top',
    //                     align: 'start',
    //                     // text: this.ToolChartTitles[i],
    //                     text:'ライン単体 縦軸:交換数',
    //                     font: {
    //                         size:20
    //                     }
    //                 },
    //                 legend: {
    //                     position: 'right',
    //                     labels: {
    //                         color: textColor,
    //                         font: {
    //                             size:20
    //                         }
    //                     }
    //                 }
    //             },
    //             scales: {
    //                 x: {
    //                     stacked: true,
    //                     offset: false,
    //                     title:{
    //                         display:true,
    //                         text: '[分後]',
    //                         font: {size:18},
    //                         padding: {top:8,bottom: 0}
    //                     },
    //                     ticks: {
    //                         font: {
    //                             weight: 500,
    //                             size: 20
    //                         }
    //                     },
    //                     grid: {
    //                         offset: false,
    //                         lineWidth:(ctx: ScriptableScaleContext) => {
    //                             if(typeof ctx.index === 'number' && ctx.index % 4 === 0){
    //                                 return 2;
    //                             } 
    //                             return undefined;
    //                         },
    //                         color:(ctx: ScriptableScaleContext) => {
    //                             if(ctx.index! % 4 === 0){
    //                                 return 'rgba(255, 0, 0, 0.85)';
    //                             }
    //                             return undefined;
    //                         }
    //                     },
    //                 },
    //                 // Y軸の設定
    //                 y: {
    //                     type: 'linear',
    //                     position: 'left',
    //                     stacked: true,
    //                     title:{
    //                         display:true,
    //                         text: '[本]',
    //                         font: {size:18},
    //                         padding: {top:0,bottom: 8}
    //                     },
    //                     ticks: {
    //                         color: textColorSecondary,
    //                         beginAtZero: false,
    //                         precision: 0,
    //                         font: {
    //                             size:20
    //                         },
    //                         max: 20
    //                     },
    //                     grid: {
    //                         color: surfaceBorder,
    //                         drawBorder: false
    //                     }

    //                 },
                    
    //             }
    //         };
    //     }

    //     // 見え方検証用2(ライン別表示+交換本数でアイコン色変化)
    //     this.ToolChangeData = {
    //         labels: [0,15,30,45,60,75,90,105,120,135,150,165,180,195,210,225,240,255,270,285,300,315,330,345,360],
    //         datasets: [
    //             {
    //             type: 'bar',
    //             label: '1本',
    //             // data: this.pattern1,
    //             // backgroundColor: toBackgroundColors(this.pattern1),
    //             borderWidth:0,
    //             },
    //             {
    //             type: 'bar',
    //             label: '2本',
    //             // data: this.pattern2,
    //             // backgroundColor: toBackgroundColors(this.pattern2),
    //             borderWidth:0,
    //             },
    //             {
    //             type: 'bar',
    //             label: '3本',
    //             // data: this.pattern3,
    //             // backgroundColor: toBackgroundColors(this.pattern3),
    //             borderWidth:0,
    //             },
    //             {
    //             type: 'bar',
    //             label: '4本',
    //             // data: this.pattern1,
    //             // backgroundColor: toBackgroundColors(this.pattern1),
    //             borderWidth:0,
    //             },
    //             {
    //             type: 'bar',
    //             label: '5本',
    //             // data: this.pattern1,
    //             // backgroundColor: toBackgroundColors(this.pattern1),
    //             borderWidth:0,
    //             },
    //             {
    //             type: 'bar',
    //             // data: this.pattern1,
    //             // backgroundColor: toBackgroundColors(this.pattern1),
    //             borderWidth:0,
    //             }
                
    //         ]

    //     };
    //     this.ToolchangeOptions = {
    //         maintainAspectRatio: false,
    //             aspectRatio: 1.0,
    //             responsive: true,
    //             plugins: {
    //                 title: {
    //                     display: true,
    //                     position: 'top',
    //                     align: 'start',
    //                     // text: this.ToolChartTitles[1],
    //                     text:'製品別 縦軸:ライン番号',
    //                     font: {
    //                         size:20
    //                     }
    //                 },
    //                 legend: {
    //                     position: 'right',
    //                     labels: {
    //                         text: ['1本','2本','3本','4本','5本以上',],
    //                         color: textColor,
    //                         font: {
    //                             size:20
    //                         },
    //                         // 検証用
    //                         generateLabels(chart: Chart): LegendItem[] {
    //                             // 既定の凡例アイテムを生成
    //                             const items = Chart.defaults.plugins.legend.labels.generateLabels(chart);
    //                             // 各アイテムの見た目（色/線幅）を強制上書き
    //                             items.forEach((item) => {
    //                                 const text = item.text;
    //                                 // 1) マップの定義に基づいて背景色などを上書き
    //                                 const fillColor = legendColorMap_Counts[text];
    //                                 if (fillColor) {
    //                                 item.fillStyle = fillColor;     // 塗りはマップ定義を参照
    //                                 item.lineWidth = 0;             // 線幅は非表示
    //                                 return;
    //                                 }

    //                             });

    //                             return items;
    //                         },
    //                         // ここまで
    //                     }
    //                 },
    //                 midpointLabelPlugin: {
    //                     labels: ['1','2','3'],
    //                     format: 'range'
    //                 }
    //             },
    //             scales: {
    //                 x: {
    //                     stacked: true,
    //                     offset: false,
    //                     title:{
    //                         display:true,
    //                         text: '[分後]',
    //                         font: {size:18},
    //                         padding: {top:8,bottom: 0}
    //                     },
    //                     ticks: {
    //                         font: {
    //                             weight: 500,
    //                             size: 20
    //                         }
    //                     },
    //                     grid: {
    //                         offset: false,
    //                         lineWidth:(ctx: ScriptableScaleContext) => {
    //                             if(typeof ctx.index === 'number' && ctx.index % 4 === 0){
    //                                 return 2;
    //                             } 
    //                             return undefined;
    //                         },
    //                         color:(ctx: ScriptableScaleContext) => {
    //                             if(ctx.index! % 4 === 0){
    //                                 return 'rgba(255, 0, 0, 0.85)';
    //                             }
    //                             return undefined;
    //                         }
    //                     },
    //                 },
    //                 // Y軸の設定
    //                 y: {
    //                     type: 'linear',
    //                     position: 'left',
    //                     stacked: true,
    //                     max: 3,
    //                     title:{
    //                         display:true,
    //                         text: '[ライン]',
    //                         font: {size:18},
    //                         padding: {top:0,bottom: 8}
    //                     },
    //                     ticks: {
    //                         display: false,
    //                         color: textColorSecondary,
    //                         beginAtZero: false,
    //                         precision: 0,
    //                         font: {
    //                             size:20
    //                         },
                            
    //                     },
    //                     grid: {
    //                         color: surfaceBorder,
    //                         drawBorder: false
    //                     }

    //                 },
                    
    //             }
                
    //     };
    //     // ここまで
    // }

    // 表示切替ボタンの状態に合わせて表示を再設定
    ResetChartOptions() {
        const type = this.toggleValue ? 1 : 0;  // 1:ライン別　0:グループ別
        const count = this.lineItems.length;
        
        if(type === 1){
            this.pattern1ChartCount = count
        }
        this.labels_y = [];
        for(let i=0;i<count;i++){
            this.labels_y[i] = String(this.lineItems[i].line_no);
        }

        this.rebuildAndApply();

    }

    // グラフタイトル再代入
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

    // グラフ描画(ライン別・製品別切替機能追加)
    displayCharts(){
        // UIに入力されているデータを格納
        const factory = this.factoryNo | 0;
        const group = this.lineGroups[0].value?.code
        // 未選択の場合は何もせず戻る
        if(group === undefined) return;
        // 実行時のフラグをキャプチャーし、固定
        const usePattern = this.usePattern1;
        // 共通配列の初期化
        this.headerArray = [];
        this.footerArray = [];
        // グラフデータ用の定数を宣言
        const BUCKETS = 25;
        const toBucket = (m: number) => Math.min(Math.floor(m / 15), BUCKETS - 1);
        const zeroBuckets = () => Array.from({ length: BUCKETS }, () => 0);
        const tools = Array.from({ length: 5 }, (_, i) => `T${i + 1}`);
        const tasks: Array<Observable<HistogramResult>> = [];
        
        // ライン分グラフデータを生成 ※選択されている行だけを対象にしつつ、idxを保持
        for (let i = 0; i < this.lineItems.length; i++){
            const idx = i;
            const headerValue = this.lineItems[idx].header;
            const footerValue = this.lineItems[idx].footer;
            // ヘッダー・フッターアドレスを同期で格納
            this.headerArray[idx] = headerValue;
            this.footerArray[idx] = footerValue;
            // ツール別
            if(usePattern){
                // グラフエリアのタイトルにドロップダウンリストのnameを反映
                const newtitle = this.lineItems[i].line_name;
                this.setTitle(i,newtitle);
                // 刃具交換までの残り時間を取得
                const task$ = this.schedulerService.getMinutesLeft(factory,headerValue,footerValue).pipe(
                map((items: IToolprogerss[]) => {
                    // rows整形（Tool/Minutes 抽出）
                    const rows = items.map(x => ({
                        tool: (x as any).tool_no ?? (x as any).tool,
                        minutes: Number((x as any).minutes_left)
                    }))
                    .filter(r =>
                        typeof r.tool === 'string' &&
                        Number.isFinite(r.minutes) &&
                        r.minutes >= 0
                    );                
                    // ツール別ヒストグラム
                    const histByTool = new Map<string, number[]>();
                    // Toolの本数分処理
                    for (const t of tools) {
                        const buckets = zeroBuckets();      // データがある場合も固定長で初期化してからカウント
                        const mins = rows.filter(r => r.tool === t).map(r => r.minutes);    // 該当ツールの minutes 配列を取り出す
                        for (const m of mins) {
                            if (m < 0 || m > 360 || !Number.isFinite(m)){
                                continue; // 念のため防御
                            } 
                            const bIdx = toBucket(m);
                            buckets[bIdx] += 1;
                        }
                        histByTool.set(t, buckets);
                    }

                    return {idx, kind: 'tool' as const, histByTool};
                }),
                catchError(err => {
                    console.error('集計エラー (idx=' + idx + ')', err);
                    const empty = new Map<string,number[]>();   
                    for (const t of tools) empty.set(t, Array(BUCKETS).fill(0));
                    return of<HistogramResult>({ idx, kind: 'tool', histByTool: empty });
                })
            );
            tasks.push(task$);

            }
            // ライン別
            else{
                // 刃具交換までの残り時間を取得
                const task$ = this.schedulerService.getMinutesLeft(factory,headerValue,footerValue).pipe(
                map((items: IToolprogerss[]) => {
                    // rows整形（Minutes 抽出）
                    const rows = items.map(x => ({minutes: Number((x as any).minutes_left) }))
                        .filter(r => Number.isFinite(r.minutes) && r.minutes >= 0);

                    const mins = rows.map(r => r.minutes);    // 該当ラインの minutes 配列を取り出す
                    const buckets = zeroBuckets();      // データがある場合も固定長で初期化してからカウント
                    // ライン別ヒストグラム
                    for (const m of mins) {
                            if (m < 0 || m > 360 || !Number.isFinite(m)){
                                continue; // 念のため防御
                            } 
                            const bIdx = toBucket(m);
                            buckets[bIdx] += 1;
                    }
                    const histByLine = new Map<number, number[]>();
                    histByLine.set(idx + 1, mins.length === 0 ? zeroBuckets() : buckets);
                    return {idx, kind: 'line' as const, histByLine};
                }),
                catchError(err => {
                    console.error('集計エラー (idx=' + idx + ')', err);
                    const empty = new Map<number,number[]>();   
                    // 必要に応じて empty.set(idx+1, Array(BUCKETS).fill(0));
                    return of<HistogramResult>({ idx, kind: 'line', histByLine: empty });
                })
            );
            tasks.push(task$);
                
            }
            
        }        
        // API処理が全て完了後にまとめて処理
        forkJoin(tasks).pipe(takeUntil(this.destroy$)).subscribe({
            next: (results: HistogramResult[]) => {
                // ライン別表示の場合
                if(usePattern){
                    for(const res of results){
                        if(res.kind !== 'tool') continue;
                        const { idx, histByTool } = res;
                        tools.forEach((t, dIdx) => {
                            const arr = histByTool.get(t) ?? Array(BUCKETS).fill(0);
                            const old = this.ToolChartGroups[idx].Data;
                            this.ToolChartGroups[idx].Data = {
                                ...old,
                                datasets: old.datasets.map((ds:any,j:number) => 
                                    j === dIdx ? {...ds, data: [...arr] } : ds
                                ),
                            };
                            
                        });
                        
                    }

                    // this.checkToolchangeTiming([...this.headerArray],[...this.footerArray]);
                
                }
                // 製品グループ別表示の場合
                else{
                    for (const res of results) {
                        if (res.kind !== 'line') continue;
                        const { idx, histByLine } = res;            
                        // Map に 1 エントリのみなので最初の value を使う（元コード準拠）
                        const data: number[] = histByLine.values().next().value ?? Array(BUCKETS).fill(0);
                        const values = Array(BUCKETS).fill(1);
                        const old = this.ToolChartGroups[0].Data;
                        this.ToolChartGroups[0].Data = {
                            ...old,
                            datasets: old.datasets.map((ds:any, j:number) => 
                                j === idx ? {...ds, data: values, backgroundColor: toBackgroundColors(data),} : ds
                            ),
                        };
                        
                    }
                    
                }
                this.checkToolchangeTiming([...this.headerArray],[...this.footerArray]);
            },
            error: err =>{
                console.error('集計エラー', err)
            } 
        });
        
    }
    // ここまで

}