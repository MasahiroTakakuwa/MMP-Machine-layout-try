import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table'; // ★ 追加
import * as XLSX from 'xlsx';

import { ForgingRow,ForgingRowRaw,ForgingPayload,MachiningRow,MachiningRowRaw,MachiningPayload } from '../interface/plan';
import { extractRowsKtoAO,extractRowsMachining } from '../shared/utils';
// 共通処理
// アップロードしたデータが鍛造か切削か判定
type PreviewType = 'forging' | 'machining' | null;

// 切削
const MACHINING_SHEETS = [
  'ティエラ1係', 'ティエラ2係', '（STN） ', '（Mercury）' // ← 実際の4枚のシート名に置き換え
];

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FileUploadModule, ToastModule, ButtonModule, TableModule, MessageModule],
  templateUrl: './plan.component.html',
  providers: [MessageService],
})
export class PlanComponent {
  apiURL=environment.apiURL;          // バックエンド側URL
  rows: (ForgingRow | MachiningRow)[] = [];

  previewType: PreviewType = null;
  // アップロードされたファイルがどちらか識別
  hasTanzou: boolean = false;
  hasSessaku: boolean = false;

  headersKtoAO: string[] = this.buildHeaders(10, 40); // 鍛造の生産計画1～31日(K〜AO)

  constructor(private messageService: MessageService,
              private http: HttpClient
  ) {}

  // Uploadクリック時の動作
  handleExcelUpload(event: any) {
    const files: File[] = event.files ?? [];
    if (!files.length) {
      this.messageService.add({key: 'plan', severity: 'warn', summary: 'Warning', detail: 'ファイルが選択されていません。' });
      return;
    }

    for (const file of files) {
      // 拡張子チェック      
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        this.messageService.add({key: 'plan', severity: 'warn', summary: 'Warning', detail: `${file.name} はExcelファイルではありません。` });
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const wb = XLSX.read(e.target?.result as ArrayBuffer, { type: 'array' });
          // ▼ ファイル名で分岐（Unicode 正規化してから判定）
          const nameNorm = file.name.normalize('NFKC');
          const hasTanzou = nameNorm.includes('鍛造');
          const hasSessaku = nameNorm.includes('切削');
          // 判定結果を保存
          this.hasTanzou = hasTanzou;
          this.hasSessaku = hasSessaku;
          
          if (hasTanzou) {
            // 鍛造
            const ws = wb.Sheets[wb.SheetNames[0]]; // 先頭シート
            // プレビュー作成時（鍛造ルート）
            const raw: ForgingRowRaw[] = extractRowsKtoAO(ws);

            // ★ 正規化してから this.rows へ代入する
            const normalized: ForgingRow[] = raw.map(r => ({
              equipmentName: this.toStringSafe(r.equipmentName), // null→'' など既定値へ
              cdValue: r.cdValue ?? null,
              valuesKtoAO: r.valuesKtoAO,                        // 1次配列のまま（送信時に2次元化）
            }));

            this.rows = normalized;        // 型は ForgingRow[]
            this.previewType = 'forging';
            this.hasTanzou = true;
            this.hasSessaku = false;

          } else if (hasSessaku) {
            // 切削
            const raw: MachiningRowRaw[] = extractRowsMachining(wb, MACHINING_SHEETS, 8);
            const normalized: MachiningRow[] = raw.map(r => ({
              factoryDivision: r.factoryDivision ?? 0, // ★ nullを既定値に（例：0）
              A: this.toStringSafe(r.A),
              D: this.toNumberOrZero(r.D),
              E: this.toNumberOrZero(r.E),
            }));

            this.rows = normalized;         // ★ 型は MachiningRow[] となる
            this.previewType = 'machining';
            this.hasSessaku = true;
            this.hasTanzou = false;

          } else {
            // どちらも含まれない場合の扱い（選択肢）
            // 1) 警告にしてスキップ
            this.messageService.add({key: 'plan', severity: 'warn', summary: 'Warning', detail: `${file.name} は「鍛造」「切削」を含みません。処理をスキップしました。` });            
            this.rows = [];
            this.previewType = null;
            return;
            
          }
          //this.rows.push(...parsed);
          this.messageService.add({key: 'plan', severity: 'info', summary: 'Success', detail: `${file.name} を解析しました。` });
        } catch (err: any) {
          console.error(err);
          this.messageService.add({key: 'plan', severity: 'error', summary: 'Error', detail: `解析失敗: ${err?.message ?? err}` });
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }

  clear() {
    this.rows = [];
    this.previewType = null;
    this.messageService.add({key: 'plan', severity: 'info', summary: 'Cleared', detail: 'プレビューをクリアしました。' });
  }

  /** 列番号(0-based) → Excel列名（K..AO）配列を作成 */
  private buildHeaders(startCol: number, endCol: number): string[] {
    const toColName = (c: number) => {
      let s = '';
      c++; // 1-based
      while (c > 0) {
        const m = (c - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        c = Math.floor((c - 1) / 26);
      }
      return s;
    };
    const headers: string[] = [];
    for (let c = startCol; c <= endCol; c++) headers.push(toColName(c));
    return headers;
  }


/*
 * 1次元 or 2次元の配列を「number[][]」へ正規化する
 * 1次元なら [arr] に包んで2次元化。中の要素は toNumberOrZero で数値化
 */
private to2DNumberMatrix(input: (number | string | null)[] | (number | string | null)[][]): number[][] {
  const toNum = (v: number | string | null): number => this.toNumberOrZero(v);

  if (Array.isArray(input) && Array.isArray(input[0])) {
    // すでに2次元
    const twoD = input as (number | string | null)[][];
    return twoD.map(row => row.map(toNum));
  } else {
    // 1次元 → 2次元に包む
    const oneD = input as (number | string | null)[];
    return [oneD.map(toNum)];
  }
}

/* 文字列/数値/null を number へ安全に変換（既存のものを想定）* 
 * 数値化できない場合は 0*/
private toNumberOrZero(v: number | string | null | undefined): number {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[, ]/g, '')); // カンマ除去など
    return isFinite(n) ? n : 0;
  }
  return 0;
}

private toStringSafe(v: unknown): string {
  return v == null ? '' : String(v);
}


  /** 送信ペイロード作成＆POST */
  sendToBackend() {
    // データ抜け確認処理
    if (!this.rows.length) {
      this.messageService.add({key: 'plan', severity: 'warn', summary: 'Warning', detail: '送信対象のデータがありません。' });
      return;
    }

    // 送信先URL（必要に応じてカテゴリ別に切り替え）
    let url = this.apiURL + '/plan/upload';

    // --- 鍛造 ---
    if (this.hasTanzou || this.previewType === 'forging') {
      const forgingRows = (this.rows as ForgingRow[]).map(r => ({
        equipmentName: r.equipmentName ?? '',
        cdValue: r.cdValue ?? null,
        valuesKtoAO: this.to2DNumberMatrix(r.valuesKtoAO), // 2次元へ正規化＆数値化
      }));

      const payload: ForgingPayload = {
        category: 'forging',
        rows: forgingRows,
      };
      
      // カテゴリ別エンドポイントへ切り替える場合（推奨）
      url = url + '/forging';
      this.http.post(url, payload).subscribe({
        next: () => {
          this.messageService.add({key: 'plan', severity: 'success', summary: 'Sent', detail: `鍛造データをバックエンドへ送信しました。` });
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({key: 'plan', severity: 'error', summary: 'Error', detail: `鍛造データの送信に失敗: ${err?.message ?? err}` });
        },
      });
      return;
    }

    // --- 切削 ---
    if (this.hasSessaku || this.previewType === 'machining') {
      const machiningRows = (this.rows as MachiningRow[]).map(r => ({
        factoryDivision: this.toNumberOrZero(r.factoryDivision as any),
        A: r.A ?? '',
        D: this.toNumberOrZero(r.D as any),
        E: this.toNumberOrZero(r.E as any),
      }));

      const payload: MachiningPayload = {
        category: 'machining',
        rows: machiningRows,
      };
      //console.log(`送信ペイロード:`,payload);
      // カテゴリ別エンドポイントへ切り替える場合（推奨）
      url = url + '/machining';

      this.http.post(url, payload).subscribe({
        next: () => {
          this.messageService.add({key: 'plan', severity: 'success', summary: 'Sent', detail: `切削データをバックエンドへ送信しました。` });
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({key: 'plan', severity: 'error', summary: 'Error', detail: `切削データの送信に失敗: ${err?.message ?? err}` });
        },
      });
      return;
    }

    // 万一、どちらにも該当しない場合
    this.messageService.add({key: 'plan', severity: 'warn', summary: 'Warning', detail: 'カテゴリ（鍛造/切削）が判定できません。' });
  }

}
