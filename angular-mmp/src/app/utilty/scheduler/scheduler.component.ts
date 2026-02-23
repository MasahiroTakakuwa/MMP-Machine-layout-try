import { Component, OnInit, OnDestroy,ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { ButtonModule } from "primeng/button";
import { ChartModule, UIChart } from "primeng/chart";
import { CheckboxModule } from "primeng/checkbox";
import { DropdownModule } from "primeng/dropdown";
import { FluidModule } from "primeng/fluid";
import { ToastModule } from "primeng/toast";
import { ToggleButtonModule } from "primeng/togglebutton";
import { MessageService } from "primeng/api";
import { MessageModule } from "primeng/message";

import { debounceTime, Subject, Subscription, startWith, switchMap, takeUntil, timer, map, of, filter, BehaviorSubject } from 'rxjs';

import { LayoutService } from "../../layout/service/layout.service";
import { SchedulerService } from "../../services/scheduler.service";

import { FactoryOption,Dropdownitem,LineListGroup,ChartDataGroup } from "../../interface/ui";
import { IFooter, IMachinelist, IToolprogerss } from "../../interface/scheduler";

@Component({
    selector: 'app-utility-scheduler',
    standalone:true,
    imports:[ButtonModule,CommonModule,ChartModule,CheckboxModule,DropdownModule,FormsModule,FluidModule,MessageModule,
             ToastModule,ToggleButtonModule],
    templateUrl: './scheduler.component.html',
    styleUrl: './scheduler.component.scss',
    providers:[MessageService],
})

export class UtilitySchedulerComponent implements OnInit, OnDestroy {

    // @ViewChild('prodChart') prodChart?:UIChart;
    private destroy$ = new Subject<void>();
    
    checked = false;
    private checked$ = new BehaviorSubject<boolean>(false);
    view = { tick: 0, lastUpdated: new Date() };

    factory = '';
    subscription: Subscription;
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
        // 刃具交換本数積み上げ棒グラフ用チャートデータ
        ToolChangeData: any;
        ToolchangeOptions: any;
        ToolChartGroups: ChartDataGroup[] =[
            {Data: null,Options: null},
            {Data: null,Options: null},
            {Data: null,Options: null},
        ];
        ToolChartTitles: string[] =["設備1","設備2","設備3"];

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
            // 実際には API 呼び出しなどに置き換え：
            // switchMap(() => this.api.fetchChartData()),
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
        this.ToolChangeData = {
            labels: [1,2,3,4,5],
            datasets: [
                {
                type: 'bar',
                label: 'T1',
                backgroundColor: '#ff0000ff',
                data: [0, 1, 0, 1, 1],
                yAxisID: 'y-axis-1'
                },
                {
                type: 'bar',
                label: 'T2',
                backgroundColor: '#66BB6A',
                data: [1, 1, 0, 0, 1],
                yAxisID: 'y-axis-1'
                },
                
            ]

        };

        // 各グラフエリアを設定
        for(let i = 0;i < this.ToolChartGroups.length;i++){
            this.ToolChartGroups[i].Data = {
            labels: [15,30,45,60,75,90,105,120,135,150,165,180,195,210,225,240,255,270,285,300,315,330,345,360],
            datasets: [
                {
                type: 'bar',
                label: 'T1',
                backgroundColor: '#ff0000ff',
                data: [1, 1, 1, 1, 1],
                yAxisID: 'y-axis-1'
                },
                {
                type: 'bar',
                label: 'T2',
                backgroundColor: '#81bb66',
                data: [1, 1, 1, 1, 0],
                yAxisID: 'y-axis-1'
                },
                {
                type: 'bar',
                label: 'T3',
                backgroundColor: '#ffbb00',
                data: [1, 1, 1, 0, 0],
                yAxisID: 'y-axis-1'
                },
                {
                type: 'bar',
                label: 'T4',
                backgroundColor: '#0011fd',
                data: [1, 1, 0, 0, 0],
                yAxisID: 'y-axis-1'
                },
                {
                type: 'bar',
                label: 'T5',
                backgroundColor: '#a200ff',
                data: [1, 0, 0, 0, 0],
                yAxisID: 'y-axis-1'
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
                        text: this.ToolChartTitles[i],
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
                    },
                    // Y軸の設定
                    'y-axis-1': {
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

        // this.ToolchangeOptions = {
        //     maintainAspectRatio: false,
        //     aspectRatio: 1.0,
        //     responsive: true,
        //     plugins: {
        //         legend: {
        //             position: 'right',
        //             labels: {
        //                 color: textColor,
        //                 font: {
        //                     size:20
        //                 }
        //             }
        //         }
        //     },
        //     scales: {
        //         x: {
        //             stacked: true,
        //             title:{
        //                 display:true,
        //                 text: '[分後]',
        //                 font: {size:18},
        //                 padding: {top:8,bottom: 0}
        //             },
        //             ticks: {
        //                 font: {
        //                     weight: 500,
        //                     size: 20
        //                 }
        //             },
        //         },
        //         // Y軸の設定
        //         'y-axis-1': {
        //             type: 'linear',
        //             position: 'left',
        //             stacked: true,
        //             title:{
        //                 display:false,
        //                 text: '[本]',
        //                 font: {size:18},
        //                 padding: {top:0,bottom: 8}
        //             },
        //             ticks: {
        //                 color: textColorSecondary,
        //                 beginAtZero: false,
        //                 precision: 0,
        //                 font: {
        //                     size:20
        //                 },
        //                 max: 20
        //             },
        //             grid: {
        //                 color: surfaceBorder,
        //                 drawBorder: false
        //             }

        //         },
                
        //     }

        // };

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
        // グラフデータ用の定数を宣言
        // 目盛数に合わせて変更(0～360分を15分刻み)
        const BUCKETS = 25;
        const tools = Array.from({ length: 5 }, (_, i) => `T${i + 1}`);
        // Max3台分グラフデータを生成
        for (let i = 0; i < this.lineGroups.length; i++){
            // ドロップダウンリストが選択されているか確認
            header = this.lineGroups[i].value?.code ?? 0;
            // 未選択の場合はループから抜け出し、処理終了
            if(header === 0){
                break;
            }
            // 該当ラインの末端設備の機器番号を取得
            else{
                // グラフエリアのタイトルにドロップダウンリストのnameを反映
                const newtitle = this.lineGroups[i].value?.name ?? "None";
                this.setTitle(i,newtitle);
                // 引数として使用するため、ここで値を固定
                const headerValue = header;
                this.schedulerService.getFooterMachine(factory,headerValue).pipe(
                    switchMap((item: IFooter) =>
                        this.schedulerService.getMinutesLeft(factory,headerValue,item.footer_machine)
                    ),
                    map((items: IToolprogerss[]) => {
                        // ① Tool と minutes の列だけ抜き出し（型/値を正規化）
                        const rows = items
                        .map(x => ({
                            // ← ここをあなたの実データのキーに合わせて調整
                            tool: (x as any).tool_no ?? (x as any).tool,
                            minutes: Number((x as any).minutes_left)
                        }))
                        .filter(x =>
                            typeof x.tool === 'string' &&
                            Number.isFinite(x.minutes) &&
                            x.minutes >= 0
                        );
                        
                        const zeroBuckets = () => Array.from({ length: BUCKETS }, () => 0);
                        const toBucket = (m: number) => Math.min(Math.floor(m / 15), BUCKETS - 1);
                        const histByTool = new Map<string, number[]>();

                        for (const t of tools) {
                        // そのツールの minutes 配列を取り出す
                        const mins = rows
                            .filter(r => r.tool === t)
                            .map(r => r.minutes);

                        // データが無ければ 0 埋めで固定長をセット
                        if (mins.length === 0) {
                            histByTool.set(t, zeroBuckets());
                            continue;
                        }

                        // データがある場合も固定長で初期化してからカウント
                        const buckets = zeroBuckets();
                        for (const m of mins) {
                            if (m < 0 || m > 360 || !Number.isFinite(m)) continue; // 念のため防御
                            const idx = toBucket(m);
                            buckets[idx] += 1;
                        }
                        histByTool.set(t, buckets);
                        }

                        return histByTool;
                    }),
                    // 最後に購読破棄
                    takeUntil(this.destroy$)
                ).subscribe({
                next: (histByTool) => {
                    tools.forEach((t, idx) => {
                        const arr = histByTool.get(t) ?? Array(BUCKETS).fill(0);
                        this.ToolChartGroups[i].Data.datasets[idx].data = arr;
                    
                    });
                    this.ToolChartGroups[i].Data = {...this.ToolChartGroups[i].Data};

                },
                error: (err) => console.error('集計エラー', err)
                });

            }
            
        }

    }

}