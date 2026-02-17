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

import { FactoryOption,Dropdownitem,Dropdownitem2,Kpi,PartsList } from "../../interface/ui";

@Component({
    selector: 'app-utility-scheduler',
    standalone:true,
    imports:[ButtonModule,CommonModule,ChartModule,DropdownModule,FormsModule,FluidModule,MessageModule,
             ToastModule,ToggleButtonModule],
    templateUrl: './scheduler.component.html',
    // styleUrl: './kpi.component.scss',
    providers:[MessageService],
})

export class UtilitySchedulerComponent {

    @ViewChild('prodChart') prodChart?:UIChart;

    factory = '';
    subscription: Subscription;
    constructor(
        private route: ActivatedRoute,
        private layoutService: LayoutService,
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

        // 品番
        partslistValues:  Dropdownitem[] = [];
        partslistValue: Dropdownitem | null = null;
        // ラインNo・設備名
        machinelistValues: Dropdownitem2[] = [];
        machinelistValue: Dropdownitem2 | null = null;

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
            // this.loadDropdownItems(this.factoryNo);
            // this.updateToggleState(this.factoryNo);
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

    // グラフエリア初期設定
    initCharts() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
        
        // 生産実績
        this.ProdChartData = {
            // labels: this.labels_day,
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
                        display:false,
                        text: '[個]',
                        font: {size:18},
                        padding: {top:0,bottom: 8}
                    },
                    ticks: {
                        // callback: (value: number | string) => formatK(Number(value)),
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
            // labels: this.labels_day,
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

    // UI表示関連
    // 品番リスト読み込み
    // loadDropdownItems(factoryCode: number) {
    //     // 固定項目として全品番を宣言
    //     const fixedItem = {name: '全品番', code: 'all'}
    //     const type = this.toggleValue ? 1 : 0;              // 加工方法 1:切削　0:鍛造
    //     // 加工方法で分岐
    //     if(type == 1){
    //         // this.kpiService.getPartsNo_type(factoryCode,type).subscribe((items: Kpi[]) =>
    //         // {
    //         //     const dynamicItems = items.map(item => ({
    //         //         name: item.parts_no,
    //         //         code: item.parts_no
    //         //     }));
    //         //     this.partslistValues = [fixedItem, ...dynamicItems];
                                
    //         // });
    //         this.kpiService.getPartslist(factoryCode).subscribe((items: PartsList[]) =>
    //         {
    //             const dynamicItems = items.map(item => ({
    //                 name: item.parts_name,
    //                 code: item.parts_no
    //             }));
    //             this.partslistValues = [fixedItem, ...dynamicItems];
                                
    //         });

    //     }
    //     else if(type == 0){
    //         this.partslistValues = [fixedItem];

    //     }
    //     // 先頭のインデックスを固定項目に設定
    //     this.partslistValue = null;
        
    // }

    // 設備リスト読み込み
    // loadDropdownItems2(factoryCode: number, partsCode: string) {
    //     // ここでは 0/1 に統一（例：1=切削, 0=鍛造）
    //     const type = this.toggleValue ? 1 : 0;
    //     type OptionItem = {name:string;code:string};
    //     // 呼び出し前ガード
    //     if (!this.partslistValue || this.partslistValue.code === undefined) {
    //         // 必要なら初期化やログ
    //         return;
    //     }
    //     // 'all' かつ切削の場合は固定項目のみ
    //     if (this.partslistValue.code === 'all' && type == 1) {
    //         // 固定項目として全ラインを宣言
    //         const fixedItem = { name: '全ライン', code: 'all' };
    //         this.machinelistValues = [fixedItem];
    //         this.machinelistValue = this.machinelistValues[0]; // ここで確実にセット
    //         return;
    //     }
    //     // それ以外の場合はAPI 呼び出し（items が null の場合に備えて正規化）
    //     else{
    //         // 固定項目として全設備を宣言
    //         const fixedItem = { name: '全設備', code: 'all' };
    //         this.kpiService.getLineNo_type(factoryCode, partsCode, type).subscribe({
    //         next: (items: any[]) => {
    //         const list = Array.isArray(items) ? items : [];
    //         let dynamicItems: OptionItem[] = [];
    //         if (type === 0) {
    //             // 鍛造なら machine_name
    //             dynamicItems = list.map(item => ({
    //             name: item?.machine_name ?? '',
    //             code: item?.machine_name ?? ''
    //             }));
    //         } else if (type === 1) {
    //             // 切削なら line_no
    //             dynamicItems = list.map(item => ({
    //             name: item?.line_no ?? '',
    //             code: item?.line_no ?? ''
    //             }));
    //         } else {
    //             // 予期しない type のフォールバック
    //             dynamicItems = [];
    //         }
    //         // 固定 + 動的
    //         this.machinelistValues = [fixedItem, ...dynamicItems];
    //         // 先頭をデフォルト選択（配列が空でも fixedItem が入るため安全）
    //         this.machinelistValue = this.machinelistValues[0];
    //         },
    //         error: (err) => {
    //         console.error('getLineNo_type error:', err);
    //         // エラー時も安全に初期化
    //         this.machinelistValues = [fixedItem];
    //         this.machinelistValue = this.machinelistValues[0];
    //         }
    //     });
    //     }
    
    // }

}