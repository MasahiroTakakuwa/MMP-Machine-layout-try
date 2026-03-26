import { Component, OnInit, OnDestroy, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { ButtonModule } from "primeng/button";
import { ChartModule} from "primeng/chart";
import { CheckboxModule } from "primeng/checkbox";
import { DatePicker } from "primeng/datepicker";
import { DropdownModule } from "primeng/dropdown";
import { FluidModule } from "primeng/fluid";
import { TableModule } from "primeng/table";
import { ToastModule } from "primeng/toast";
import { ToggleSwitchModule } from "primeng/toggleswitch";
import { MessageService } from "primeng/api";
import { MessageModule } from "primeng/message";

import { BehaviorSubject,debounceTime, Subscription, Subject, takeUntil } from 'rxjs';

import { LayoutService } from "../../../layout/service/layout.service";
import { ToolChangeService } from "../../../services/toolchange.service";

import { Dropdownitem, PartsList } from "../../../interface/ui";
import { ToolChangeRow,ToolChangeColumn } from "../../../interface/toolchange";

import { getRangeForMySQL } from "../../../shared/utils";

@Component({
    selector: 'app-utility-toolchange',
    standalone: true,
    imports:[ButtonModule,CheckboxModule,CommonModule,ChartModule,DatePicker,DropdownModule,FormsModule,FluidModule,TableModule,ToggleSwitchModule],
    templateUrl: './toolchange.component.html',
    styleUrl: './toolchange.component.scss',
})

export class UtilityToolChangeComponent implements OnInit,OnDestroy{

    private destroy$ = new Subject<void>();
    checked = false;
    private checked$ = new BehaviorSubject<boolean>(false);
    switchValue = false;
    private switchValue$ = new BehaviorSubject<boolean>(false);

    factory = '';
    subscription: Subscription;

    // テーブルデータの背景色変化クラス
    public rowStyleClass(row: any){
        const cause = row.cause
        // if (!Number.isFinite(minutes)) return {};
        // 閾値を上から順に（>=）
        const className =
            (cause !== '定期交換') ? 'row-warning' :
                                     'row-error';
        return { [className]: true };
    };

    constructor(
        private route: ActivatedRoute,
        private layoutService: LayoutService,
        private toolchangeService: ToolChangeService
    ){
        // ページのルートパラメータが変わるたびに更新する様に設定。
        this.route.paramMap.subscribe(params => {
        this.factory = params.get('factory') ?? '';
        
        });
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25)).subscribe(() =>{

        });

    }

    // ルートパラメータ(工場名)と工場区分の紐づけ
    factoryNo: number = 0;
    factoryCode: {name:string,code:number}[] = [
    { name: 'jupiter', code: 1 },
    { name: 'mercury', code: 2 },
    { name: 'tierra',  code: 4 },
    { name: 'tierra2', code: 6 },
    { name: 'saturn',  code: 5 }
    ];

    // 品番
    partslistValues:  Dropdownitem[] = [];
    partslistValue: Dropdownitem | null = null;
    selectedItem = '';
    // ラインNo・設備名
    machinelistValues: Dropdownitem[] = [];
    machinelistValue: Dropdownitem | null = null;
    // 検索する日付の範囲(start,end)
    rangeValue: Date[] = []; 
    // データテーブルの設定
    cols: ToolChangeColumn[] = [
        {field:'line_name', header:'ライン名'},
        {field:'side', header:'刃物台'},
        {field:'tool_no', header:'ツール番号'},
        {field:'setting_value', header:'設定命数'},
        {field:'changed_value', header:'交換命数'},
        {field:'cause', header:'理由'},
        {field:'updated_at', header:'交換日時'},
    ];

    rows: ToolChangeRow[] = [];

    rowCount = 10;
    // 要因リストの選択肢
    causeOptions = [
        { label: '寸法飛び', value: '寸法飛び' },
        { label: '欠け/折れ', value: '欠け/折れ' },
        { label: 'テスト刃具', value: 'テスト刃具' },
        { label: '面粗度', value: '面粗度' },
        { label: 'ビビリ', value: 'ビビリ' },
        { label: 'ムシレ', value: 'ムシレ' },
        { label: 'カウンター合わせ', value: 'カウンター合わせ' },
        { label: 'その他', value: 'その他' },
    ];

    // 変更のあった行を取得
    originalRows: any[]=[];
    loadRows: any[]=[];

    chartData: any;
    chartOptions: any;
    chartLabels: string[] = [];
    chartDateLabels: string[] = [];
    chartDataset: any[] = [];

    // 初期データ準備
    ngOnInit(){
        this.route.paramMap.subscribe(params => {
            const name = params.get('factory');
            this.factoryNo = this.factoryCode.find(x => x.name === name)?.code ?? 0;
            this.loadDropdownItems(this.factoryNo);
            this.initChart();

        });
        
    }

    // 画面初期化完了後
    ngAfterViewInit(){
        this.toolchangeService.populateLineName(this.factoryNo).subscribe();
        this.initChart();
        
    }

    ngOnDestroy(){
        this.destroy$.next();
        this.destroy$.complete();
    }

    // UI表示関連
    // 品番リスト読み込み
    loadDropdownItems(factoryCode: number) {
        // 固定項目として全品番を宣言
        const fixedItem = {name: '全品番', code: 'all'}
        this.toolchangeService.getPartsList(factoryCode).subscribe((items: PartsList[]) =>
        {
            const dynamicItems = items.map(item => ({
                name: item.parts_name,
                code: item.parts_no
            }));
            this.partslistValues = [fixedItem, ...dynamicItems];
             
        });
        this.partslistValue = null;
    }

    // 設備リスト読み込み
    loadMachineListItems() {
        type OptionItem = {name:string;code:string};
        // 呼び出し前ガード
        if (!this.partslistValue || this.partslistValue.code === undefined) {
            // 必要なら初期化やログ
            return;
        }
        // 'all'の場合は固定項目(全体)のみ
        if (this.partslistValue.code === 'all') {
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
            this.toolchangeService.getLineNo(this.factoryNo, this.partslistValue.name).subscribe({
            next: (items: any[]) => {
            const list = Array.isArray(items) ? items : [];
            let dynamicItems: OptionItem[] = [];
            // 切削なら line_no
            dynamicItems = list.map(item => ({
            name: item?.line_no ?? '',
            code: item?.line_no ?? ''
            })); 
            // 固定 + 動的
            this.machinelistValues = [fixedItem, ...dynamicItems];
            // 先頭をデフォルト選択（配列が空でも fixedItem が入るため安全）
            this.machinelistValue = this.machinelistValues[0];
            },
            error: (err) => {
            console.error('getLineNo_type error:', err);
            // エラー時も安全に初期化
            this.machinelistValues = [fixedItem];
            this.machinelistValue = null;
            }
        });
        }
    
    }

    // 品番選択後
    onPartsNoSelect() {
        if (this.partslistValue && this.partslistValue.code !== undefined) {
            this.loadMachineListItems();
        }

    }
    // 品名選択後
    onPartsNameSelect() {
        if (this.partslistValue && this.partslistValue.code !== undefined) {
            this.loadMachineListItems();
        }
    }

    // チェックボックスのON/OFF監視
    onToggle(isOn: boolean){
        this.checked$.next(isOn);
        
    }
    // トグルボタンのON/OFF確認
    onSwitch(isOn: boolean){
        this.switchValue$.next(isOn);
        this.rowCount = this.switchValue ? 5:10;
        console.log('row:',this.rowCount);
    }

    // テーブルデータ編集開始時
    editRow(row:any) {
        const fixed = ['摩耗', '欠損', '異常'];
        // 保存されている値が固定選択肢に含まれない場合 → その他扱い
        if (!fixed.includes(row.cause)) {
            row.otherCause = row.cause;   // 入力値をセット
            row.cause = 'その他';         // dropdown は「その他」
        } else {
            row.otherCause = null;
        }

        row.editing = true;

    }
    
    // テーブルデータ
    // 履歴ログ表示
    displayTable(){
        const selectParts = this.partslistValue?.name;      // 品名
        const selectLine = this.machinelistValue?.code;     // ラインNo
        const range = getRangeForMySQL(this.rangeValue);    // 開始日と終了日を取得
        const start = range.start;
        const end = range.end;
        // テーブル表示と比較用ディープコピーの生成
        this.toolchangeService.searchToolChangeLogs(this.factoryNo,selectParts,selectLine,start,end,this.checked).subscribe((res: ToolChangeRow[]) => {
            // 表示用
            this.rows = res.map(r => ({
                ...r,
                editing: r.cause === '' || r.cause === null
            }));
            // 比較用(ディープコピー)
            this.originalRows = JSON.parse(JSON.stringify(this.rows));

            // チャートグラフ用データ格納
            // 日時データをtooltip用に別配列で格納
            this.chartDateLabels = res.map(r => 
                new Date(r.updated_at).toLocaleString()
            );
            // X軸はインデックス番号に設定
            this.chartLabels = res.map((_,i) => i.toString());
            const ratioData = res.map(r => 
                r.setting_value? (r.changed_value / r.setting_value) * 100 : 0
            );
            const borderData = new Array(ratioData.length).fill(80);
            // 値を反映
            this.chartData.labels = this.chartLabels;
            this.chartData.datasets[0].data = ratioData;
            this.chartData.datasets[1].data = borderData;

            // グラフエリアを更新
            this.chartData = {...this.chartData};

        });
        
    }

    // 短命理由を上書き保存
    updateTable(){
        this.updateCauses();

    }

    // ドロップダウンで選択した変更内容を上書き
    updateCauses() {
        // 比較用データ未入力のブロック
        if (!this.originalRows || this.originalRows.length === 0) {
                alert('比較用データが未取得です');
                return;
        }
        // その他を選択した際の入力内容を反映。
        this.rows.forEach(row => {
            if (row.cause === 'その他') {
                row.cause = row.otherCause ?? '';   // 入力値を cause に上書き
            }
        });


        const changed = this.rows.filter((rows, i) =>
            rows.cause !== this.originalRows[i].cause
        );

        if (changed.length === 0) {
            alert('変更はありません');
            return;
        }

        this.toolchangeService.updateCause(changed).subscribe({
            next:() => {
                
            },
            error:(err) => {
                alert('更新中にエラーが発生');
            },
            complete:() => {
                alert('更新完了');
            }   
        });

    }

    // チャートグラフデータ
    // 初期設定
    initChart(){
        this.chartData = {
            labels:this.chartLabels,
            datasets: [
                {
                    type: 'line',
                    label: '使用率',
                    backgroundColor: '#0022ffff',
                    borderColor: '#0022ffff',
                    data: [],
                },
                {
                    type: 'line',
                    label: 'しきい値',
                    backgroundColor: '#ff0000',
                    borderColor: '#ff0000',
                    data: [],
                    pointRadius: 0
                }
            ]
        };
        this.chartOptions = {
            maintainAspectRatio: false,
            aspectRatio: 1.0,
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        title: (context:any) => {
                        // プロットされた index
                        const index = context[0].dataIndex;

                        // 日時配列から取得して返す
                        return this.chartDateLabels[index];
                        }
                    }
                },

            },
            
            layout: { padding:{top:0}},
            scales: {
                x: {
                    title:{
                        display:false,
                        text: '[日時]',
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
                        display: false,
                        drawBorder: false
                    }
                },
                // Y軸の設定
                y: {
                    max: 100.0,
                    type: 'linear',
                    position: 'left',
                    title:{
                        display:false,
                        text: '[%]',
                        font: {size:18},
                        padding: {top:0,bottom: 8}
                    },
                    ticks: {
                        beginAtZero: true,
                        font:{
                            size: 20
                        }
                        
                    },
                    grid: {
                        // color: surfaceBorder,
                        drawBorder: false
                    }
                },
                
            }
        }
    }

}