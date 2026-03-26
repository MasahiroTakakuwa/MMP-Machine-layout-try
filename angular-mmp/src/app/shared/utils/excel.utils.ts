import * as XLSX from 'xlsx';
import { MachiningRowRaw } from '../../interface/plan';

// 切削
const MACHINING_SHEETS = [
  'ティエラ1係', 'ティエラ2係', '（STN） ', '（Mercury）' // ← 実際の4枚のシート名に置き換え
];

/** シート名 → 工場番号 のマッピング（例） */
const FACTORY_MAP: Record<string, number> = {
  'ティエラ1係': 4,
  'ティエラ2係': 6,
  '（STN） ': 5,
  '（Mercury）': 2,

};

const COL = { A: 0, D: 3, E: 4, F: 5 } as const;

// シート名ごとの抽出キーワード設定
function getKeywordsForSheet(sheetName: string): string[] {
  // Mercuryはシャフトウォームがあるため、転造も含む
  const sheetKeywordMap: Record<string, string[]> = {
    'ティエラ1係': ['切削'],
    'ティエラ2係': ['切削'],
    '（STN） ': ['切削'],
    '（Mercury）': ['切削', '転造'],
  };

  return sheetKeywordMap[sheetName] ?? ['切削', '鍛造']; 
}

/** ① A/E列の「縦方向（行方向）」結合を8行目以降で解除し、結合元の値を下方向へ展開 */
function unmergeAE_vertical(ws: XLSX.WorkSheet, startRow1Based = 8): void {
  const startR = startRow1Based - 1; // 0-based
  const merges: any[] = (ws['!merges'] ?? []).slice();
  const keepMerges: any[] = [];

  for (const m of merges) {
    const s = m.s; // { r, c }
    const e = m.e; // { r, c }

    // 縦方向の結合（同一列）かつ A 列または E 列のみ対象
    const isVertical = s.c === e.c;
    const isTargetCol = (s.c === COL.A && e.c === COL.A) || (s.c === COL.D && e.c === COL.D) || (s.c === COL.E && e.c === COL.E);
    const touchesRowsAfterStart = e.r >= startR;

    if (!(isVertical && isTargetCol && touchesRowsAfterStart)) {
      // 対象外の結合は維持
      keepMerges.push(m);
      continue;
    }

    // 結合元（左上セル）の値・型
    const masterAddr = XLSX.utils.encode_cell({ r: s.r, c: s.c });
    const master = ws[masterAddr];
    const masterVal = master?.v ?? null;
    const masterType = master?.t ?? (typeof masterVal === 'number' ? 'n' : 's');

    // 8行目以降で値を下方向へ展開
    const r0 = Math.max(s.r, startR);
    for (let r = r0; r <= e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: s.c });
      ws[addr] = { t: masterType, v: masterVal };
    }
    // ★ この結合レンジは解除（A/E列の結合が外れる）
    // 他列の結合は keepMerges に残して維持します
  }

  ws['!merges'] = keepMerges;
}

/** シートの最終行（0-based）を取得 */
function getLastRow(ws: XLSX.WorkSheet): number {
  const ref = ws['!ref'] ?? 'A1';
  const range = XLSX.utils.decode_range(ref);
  return range.e.r;
}

/** ② F列に「切削」を含む行（8行目以降）を抽出して、③ A/E を取得 */
function pickAEWhereFIncludes(ws: XLSX.WorkSheet, startRow1Based = 8, keyword = '切削') {
  const startR = startRow1Based - 1;
  const endR = getLastRow(ws);
  const out: Array<{ row: number; A: any; D:any; E: any }> = [];

  for (let r = startR; r <= endR; r++) {
    const fAddr = XLSX.utils.encode_cell({ r, c: COL.F });
    const fCell = ws[fAddr];
    const fVal = fCell?.v;
    if (fVal == null) continue;

    const text = String(fVal).normalize('NFKC');
    if (!text.includes(keyword)) continue;

    const aAddr = XLSX.utils.encode_cell({ r, c: COL.A });
    const dAddr = XLSX.utils.encode_cell({ r, c: COL.D });
    const eAddr = XLSX.utils.encode_cell({ r, c: COL.E });
    const A = ws[aAddr]?.v ?? null;
    const D = ws[dAddr]?.v ?? null;
    const E = ws[eAddr]?.v ?? null;

    out.push({ row: r + 1, A, D, E }); // 1-based の行番号で返却
  }

  return out;
}

function pickAEWhereFIncludesAny(
  ws: XLSX.WorkSheet,
  startRow1Based: number,
  keywords: string[]
) {
  const results = [];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const end = range.e.r + 1;

  for (let r = startRow1Based; r <= end; r++) {
    const A = ws[`A${r}`]?.v ?? null;
    const D = ws[`D${r}`]?.v ?? null;
    const E = ws[`E${r}`]?.v ?? null;
    const F = ws[`F${r}`]?.v ?? '';

    const fText = String(F).replace(/\u3000/g, ' ').trim(); // 全角空白など正規化

    if (!keywords.some(kw => fText.includes(kw))) continue;

    results.push({ row: r, A, D, E, F });
  }

  return results;
}


/** シート名から工場区分（番号）を取得する */
function resolveFactoryDivision(sheetName: string): number | null {
  return FACTORY_MAP.hasOwnProperty(sheetName) ? FACTORY_MAP[sheetName] : null;
}

/** 値の正規化：文字列は trim、空文字は null、数値はそのまま。 */
function normalizeForCompare(v: any): string | number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    return s.length === 0 ? null : s;
  }
  return v; // number / boolean などはそのまま
}

/** E が「0（ゼロ）」とみなせるか判定（数値 0 or 文字列 "0"） */
function isZeroValue(v: any): boolean {
  if (v === 0) return true;
  if (typeof v === 'string') {
    return v.trim() === '0';
  }
  return false;
}

/** 「切削」ファイル用メイン：指定4シートに対して ①②③ を実行 */
export function extractRowsMachining(wb: XLSX.WorkBook, targetSheets: string[], startRow1Based = 8) :MachiningRowRaw[]{
  const results: MachiningRowRaw[] = [];

  for (const sheetName of targetSheets) {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      console.warn(`シートが見つかりません: ${sheetName}`);
      continue;
    }

    // A/E の縦方向結合を解除し、8行目以降に値を展開
    unmergeAE_vertical(ws, startRow1Based);
    // シートごとの抽出キーワードを取得
    const keywords = getKeywordsForSheet(sheetName);
    // F列に「切削」を含む行の A/E を収集
    //const rows = pickAEWhereFIncludes(ws, startRow1Based, '切削');
    
    // 2) F列からキーワードのいずれかを含む行を抽出
    const rows = pickAEWhereFIncludesAny(ws, startRow1Based, keywords);

    const factoryDivision = resolveFactoryDivision(sheetName); // マップのみ参照

    // 重複除外用のキーセット（シート単位で管理）
    const seenKeys = new Set<string>();
    
    for (const r of rows) {
      // E が 0 の行は除外（数値0 / 文字列"0"）
      if (isZeroValue(r.E)) {
        continue;
      }

      // 正規化して重複キー生成（A/E の表記揺れ対策）
      const normA = normalizeForCompare(r.A);
      //const normD = normalizeForCompare(r.D);
      const normE = normalizeForCompare(r.E);

      // A と E が両方 null の場合は意味のある品番比較ができないため、任意で除外しても良い
      // ここでは重複キーを "null|null" として扱い、複数行が来ても最初だけ残します。
      const key = `${sheetName}::${String(normA)}::${String(normE)}`;

      if (seenKeys.has(key)) {
        // ⑤ 同一シートで A/E が同じ ⇒ 既に記録済みなので除外
        continue;
      }

      // 初出 ⇒ 記録
      seenKeys.add(key);
      results.push({
        sheet: sheetName,
        row: r.row,
        A: r.A,
        D: r.D,
        E: r.E,
        factoryDivision,
      });
    }
  }

  return results;
}
// ここまで切削

// 鍛造
/** 結合考慮でセル値取得：結合範囲内なら上端左セルの値を返す */
function getCellValue(ws: XLSX.WorkSheet, r: number, c: number): any {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  if (cell && cell.v !== undefined) return cell.v;

  const merges = ws['!merges'] ?? [];
  for (const m of merges) {
    if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) {
      const tl = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
      const topLeft = ws[tl];
      return topLeft ? topLeft.v : undefined;
    }
  }
  return undefined;
}

/** 指定行が「C(2)〜D(3) を含む横方向結合」か判定 */
function isRowMergedCD(ws: XLSX.WorkSheet, r: number): boolean {
  const merges = ws['!merges'] ?? [];
  return merges.some(m =>
    m.s.r === m.e.r &&              // 同一行の横結合
    r === m.s.r &&                  // その行が結合行
    m.s.c <= 2 && m.e.c >= 3        // 結合が C〜D をカバー
  );
}

/** 「加工品番」かどうか（空白・全角空白を除外して比較） */
function isKakouHinban(text: any): boolean {
  const s = (text ?? '').toString().replace(/\s+/g, '').replace(/\u3000/g, '');
  return s === '加工品番';
}

/** F(5)〜G(6) をカバーする結合ブロックを抽出（縦方向結合想定） */
function getMergedFGBlocks(ws: XLSX.WorkSheet): {
  startR: number;        // 0-based 開始行
  endR: number;          // 0-based 終了行
  name: string | null;   // 設備名（トップレフトセル）
}[] {
  const merges = ws['!merges'] ?? [];
  const blocks: { startR: number; endR: number; name: string | null }[] = [];

  for (const m of merges) {
    // F(5)〜G(6) をカバーしている結合を抽出
    if (m.s.c <= 5 && m.e.c >= 6) {
      const tlAddr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
      const tlCell = ws[tlAddr];
      const name = tlCell?.v != null ? String(tlCell.v).trim() : null;

      blocks.push({
        startR: m.s.r,
        endR: m.e.r,
        name,
      });
    }
  }

  // 開始行でソート（上から順に）
  blocks.sort((a, b) => a.startR - b.startR);
  return blocks;
}

/**
 * 各行番号(1-based)に対応する設備名を構築する。
 * 仕様：結合ブロックの「先頭行」は見出し行として除外し、先頭行+1 〜 結合終了行まで設備名を適用。
 * 結合が1行だけ（startR === endR）の場合は、次ブロック開始行-1 までを補完。
 */
function buildEquipmentNameMap(ws: XLSX.WorkSheet): Map<number, string | null> {
  const ref = ws['!ref'];
  const map = new Map<number, string | null>();
  if (!ref) return map;

  const range = XLSX.utils.decode_range(ref);
  const maxRow0 = range.e.r; // 0-based
  const blocks = getMergedFGBlocks(ws);

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const name = b.name ?? null;

    // 見出し行は除外 → 適用開始は startR+1
    const applyStart0 = b.startR + 1;

    // 通常は結合終了行まで、結合が1行のみなら次ブロックの直前まで補完
    let applyEnd0 = b.endR;
    if (b.startR === b.endR) {
      const nextStart0 = blocks[i + 1]?.startR ?? (maxRow0 + 1); // 次ブロックがなければ最終行の次
      applyEnd0 = Math.min(nextStart0 - 1, maxRow0);
    }

    // 範囲が妥当なら、1-basedへ変換してセット
    if (applyStart0 <= applyEnd0) {
      for (let r0 = applyStart0; r0 <= applyEnd0; r0++) {
        map.set(r0 + 1, name); // 1-based 行番号で格納
      }
    }
  }

  return map;
}

/** 設備見出しの境界一覧（例：[ { rowNumber:1, name:'AAA' }, { rowNumber:33, name:'BBB' } ]）を取得 */
function getEquipmentBoundaries(ws: XLSX.WorkSheet): { rowNumber: number; name: string | null }[] {
  const blocks = getMergedFGBlocks(ws);
  return blocks.map(b => ({
    rowNumber: b.startR + 1,     // 1-based
    name: b.name ?? null,
  }));

}

/** 文字列ならトリム、空白のみなら空を表す null に正規化、数値などはそのまま返す */
function normalizeCellValue(v: any): string | number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    return s.length === 0 ? null : s;
  }
  return v; // number や boolean 等はそのまま扱う（必要に応じて仕様変更可）
}

/** 抽出：C/D結合行（「加工品番」は除外）→ K〜AO 値 + 設備名 を取得 */
export function extractRowsKtoAO(ws: XLSX.WorkSheet): {
  rowNumber: number;                      // 1-based 行番号
  cdValue: string | null;                 // C/D 結合セルの値
  equipmentName: string | null;           // F/G 結合から割当てた設備名（見出し行は除外）
  valuesKtoAO: (string | number | null)[];// K〜AO 31列
}[] {
  const ref = ws['!ref'];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  const out: {
    rowNumber: number;
    cdValue: string | null;
    equipmentName: string | null;
    valuesKtoAO: (string | number | null)[];
  }[] = [];

  // 行番号 → 設備名 のマップを事前構築
  const equipMap = buildEquipmentNameMap(ws);

  for (let r = range.s.r; r <= range.e.r; r++) {
    if (!isRowMergedCD(ws, r)) continue;

    // C列の値（結合上端左）を取得して「加工品番」を除外
    const cdRaw = getCellValue(ws, r, 2);
    if (isKakouHinban(cdRaw)) continue;
    const cdValue = cdRaw == null ? null : String(cdRaw).trim();

    // K(10)〜AO(40) を取得しつつ「全て空か」を同時判定（短絡評価で負荷軽減）
    const rowValues: (string | number | null)[] = [];
    let hasAnyValue = false;

    for (let c = 10; c <= 40; c++) {
      const v = getCellValue(ws, r, c);
      const norm = normalizeCellValue(v);
      rowValues.push(norm);

      // 空でない値が一つでも見つかったらフラグON
      if (norm !== null) {
        hasAnyValue = true;
        // なお、ここで break せず配列は最後まで埋める（必要なら break 可）
      }
    }

    // 追加仕様：K〜AOが全て空なら、この行はスキップ
    if (!hasAnyValue) continue;

    const rowNumber1 = r + 1; // 1-based
    const equipmentName = equipMap.get(rowNumber1) ?? null;

    out.push({
      rowNumber: r + 1,  // 1-based
      cdValue,
      equipmentName,
      valuesKtoAO: rowValues,
    });
  }

  return out;
}
// ここまで鍛造