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
    imports: [ChartModule,DropdownModule,FluidModule,FormsModule,SelectButtonModule,ToggleButtonModule],
    templateUrl: './test.component.html',
    styleUrls: ['./test.component.scss']

})

export class Test implements OnInit, OnDestroy{

    labels_day: string[] = ['1','2','3','4','5','6','7','8','9','10',
                                          '11','12','13','14','15','16','17','18','19','20',
                                          '21','22','23','24','25','26','27','28','29','30','31'    
                                        ];

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
    toggleValue: boolean = true;
    toggleDisabled: boolean = false;

    // dropdownlistの初期設定
    dropdownValues:  Dropdownitem[] = [];
    dropdownValue: Dropdownitem | null = null;
    dropdown2Values: Dropdownitem2[] = [];
    dropdown2Value: Dropdownitem2 | null = null;

    // Chartの初期設定
    ProdChartData: any;
    ProdChartOptions: any;
    DefectRateData: any;
    DefectRateOptions: any;

    subscription: Subscription;
    constructor(
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
            // クリア時や未選択時の挙動を定義（必要なら）
            // 例: this.toggleDisabled = true; this.toggleValue = false;
            return;
        }
        this.selectButtonValue = selected;
        this.loadDropdownItems(this.selectButtonValue.code);
        this.updateToggleState(selected.code);

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
  onToggleChange(val: boolean): void {
    // code=5 以外では disabled なので変更イベントは来ない想定
    // ログ出力や他処理があればここに
    // console.log('toggle changed:', val);
  }



    // ビュー初期設定後処理
    ngAfterViewInit() {
        this.initCharts();

    }
    // チャート初期設定
    initCharts() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

        // 生産実績
        this.ProdChartData = {
            labels: this.labels_day,
            datasets: [
                {
                    type: 'line',
                    label: '稼動率',
                    backgroundColor: '#ffe102ff',
                    borderColor: '#ffe102ff',
                    data: [0.87, 0.82, 0.76, 0.88, 0.85],
                    yAxisID: 'y-axis-2'
                },
                {
                    type: 'line',
                    label: '目標稼動率',
                    backgroundColor: '#ff0202ff',
                    borderColor: '#ff0202ff',
                    data: [0.85, 0.85, 0.85, 0.85, 0.85],
                    yAxisID: 'y-axis-2'
                },
                {
                    type: 'line',
                    label: '可動率',
                    backgroundColor: '#0022ffff',
                    borderColor: '#0022ffff',
                    data: [1.02, 0.97, 0.91, 1.03, 1.0],
                    yAxisID: 'y-axis-2'
                },
                {
                    type: 'bar',
                    label: '計画',
                    backgroundColor: '#42A5F5',
                    borderColor: '#42A5F5',
                    data: [6000, 6000, 6000, 6000, 6000, 0, 0],
                    yAxisID: 'y-axis-1'
                },
                {
                    type: 'bar',
                    label: '実績',
                    backgroundColor: '#66BB6A',
                    borderColor: '#66BB6A',
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
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary,
                        font: {
                            weight: 500
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
                        ticks: {
                            color: textColorSecondary,
                            beginAtZero: true
                        },
                        grid: {
                            color: surfaceBorder,
                            drawBorder: false
                        }
                    },
                'y-axis-2':{
                    type: 'linear',
                    position: 'right',
                    ticks: {
                        color: textColorSecondary,
                        beginAtZero: true
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                        drawOnChartArea: false
                    },
                    
                }
                
            }
        };

        // 不良率
        this.DefectRateData = {
            labels: this.labels_day,
            datasets: [
                {
                type: 'bar',
                label: '工程内不良',
                backgroundColor: '#42A5F5',
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
                {
                type: 'line',
                label: '目標不良率',
                backgroundColor: '#de2f2fff',
                borderColor: '#de2f2fff',
                data: new Array(31).fill(0.5),
                yAxisID: 'y-axis-1'
                }
                
            ]

        };

        this.DefectRateOptions = {
            maintainAspectRatio: false,
            aspectRatio: 1.0,
            responsive: true,
            scales: {
                x: {
                stacked: true
                },
                // Y軸の設定
                'y-axis-1': {
                        type: 'linear',
                        position: 'left',
                        stacked: true,
                        ticks: {
                            color: textColorSecondary,
                            beginAtZero: false,
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
        const fixedItem = {name: '切削全品番', code: 'all'}
        const fixedItem2 = {name: '鍛造品', code: '0'}
        // 工場で分岐
        if(factoryCode === 1){
            //Jupiter        
            this.dropdownValues = [fixedItem2]
        }
            //その他 
        else{            
            this.kpiService.getPartsNo(factoryCode).subscribe((items: Kpi[]) =>
            {
                const dynamicItems = items.map(item => ({
                    name: item.parts_no,
                    code: item.parts_no
                }));
                
                if(factoryCode === 5){
                    //Saturn
                    this.dropdownValues = [fixedItem, ...dynamicItems, fixedItem2]
                }
                else{
                    this.dropdownValues = [fixedItem, ...dynamicItems]
                }
                                
            });

        }
        // 先頭のインデックスを固定項目に設定
        this.dropdownValue = null;
        
    }

    // ラインNoドロップダウンリスト更新(品番選択後)
    loadDropdownItems2(factoryCode: number,partsCode: string){
    // 固定項目として全品番を宣言
        const fixedItem = {name: '全ライン', code: 'all'}
        if (this.dropdownValue && this.dropdownValue.code !== undefined) {
            if(this.dropdownValue.code === 'all'){
                this.dropdown2Values = [fixedItem]
            }

            else{
                // 設備ドロップダウンリスト更新
                this.kpiService.getLineNo(factoryCode,partsCode).subscribe((items:any[]) =>
                {
                    const dynamicItems = items.map(item => ({
                        name: item.line_no,
                        code: item.machine_no
                    }));
                    this.dropdown2Values = [fixedItem, ...dynamicItems]
                });
            }
            this.dropdown2Value = this.dropdown2Values[0];

        }
        
        // Chartデータ生成メソッドを呼び出し
        this.createChartData(factoryCode,partsCode)
        
    }




    // ブラウザ終了時
    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    
    }

}
