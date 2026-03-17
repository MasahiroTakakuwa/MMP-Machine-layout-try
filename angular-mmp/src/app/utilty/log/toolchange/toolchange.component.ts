import { Component, OnInit, OnDestroy, ViewChild } from "@angular/core";
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

import { debounceTime, Subscription, Subject, takeUntil } from 'rxjs';

import { LayoutService } from "../../../layout/service/layout.service";
import { ToolChangeService } from "../../../services/toolchange.service";

import { Dropdownitem, PartsList } from "../../../interface/ui";

@Component({
    selector: 'app-utility-toolchange',
    standalone: true,
    imports:[ButtonModule,CommonModule,ChartModule,DropdownModule,FormsModule,FluidModule],
    templateUrl: './toolchange.component.html',
    styleUrl: './toolchange.component.scss',
})

export class UtilityToolChangeComponent implements OnInit,OnDestroy{

    private destroy$ = new Subject<void>();

    factory = '';
    subscription: Subscription;

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
    // ラインNo・設備名
    machinelistValues: Dropdownitem[] = [];
    machinelistValue: Dropdownitem | null = null;

    ngOnInit(){
        this.route.paramMap.subscribe(params => {
            const name = params.get('factory');
            this.factoryNo = this.factoryCode.find(x => x.name === name)?.code ?? 0;
            this.loadDropdownItems(this.factoryNo);

        });
        
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
            this.toolchangeService.getLineNo(factoryCode,partsCode).subscribe({
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
            this.machinelistValue = this.machinelistValues[0];
            }
        });
        }
    
    }

    // 品番選択後
    onPartsNoSelect() {
        if (this.partslistValue && this.partslistValue.code !== undefined) {
            this.loadMachineListItems(this.factoryNo, this.partslistValue.name);
        }

    }
    // 品名選択後
    onPartsNameSelect() {
        if (this.partslistValue && this.partslistValue.code !== undefined) {
            this.loadMachineListItems(this.factoryNo, this.partslistValue.name);
        }
    }

    displayTable(){
        const selectParts = this.partslistValue?.name;
        const selectLine = this.machinelistValue?.code;

        
    }
}