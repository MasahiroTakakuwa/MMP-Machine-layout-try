// 刃具交換スケジューラー
// 凡例
// 同時交換本数-対応色カラーマップ
const STATE_COLORS: Record<number,string> = {
  0: 'transparent', // 無色
  1: '#51ff00',
  2: '#4dac00',
  3: '#f9fd00',
  4: '#ffa600',
  // 5:'#ff0000ff' 5本以上はFALL_BACK_FILLの色を呼び出し
}

// 刃具別カラーマップ
export const legendColorMap_Tools: Record<string, string> = {  
  'T1': '#ff0000', // 赤
  'T2': '#81bb66', // 緑
  'T3': '#ffbb00', // 黄
  'T4': '#0011ff', // 青
  'T5': '#a200ff', // 紫

};

// 同時交換本数カラーマップ
export const legendColorMap_Counts: Record<string, string> = {
  '1本': '#51ff00',
  '2本': '#4dac00',
  '3本': '#f9fd00',
  '4本': '#ffa600',
  '5本': '#ff0000ff'
}

const FALLBACK_FILL = '#ff0000ff';
// 背景色反映
export function toBackgroundColors(values: number[]){
  return values.map(v => STATE_COLORS[v] ?? FALLBACK_FILL);
}

// ディープマージのユーティリティ（lodash なしの簡易版）
export function deepMerge<T>(target: T, source: any): T {
  if (source == null) return target;
  const isObj = (v: any) => v && typeof v === 'object' && !Array.isArray(v);
  const out: any = Array.isArray(target) ? [...(target as any)] : { ...(target as any) };
  for (const k of Object.keys(source)) {
    const sv = source[k];
    const tv = (out as any)[k];
    if (sv === undefined) {
      // 明示的にキーを消したい場合は undefined を設定（Chart.js は undefined のキーは無視する）
      out[k] = undefined;
    } else if (isObj(sv) && isObj(tv)) {
      out[k] = deepMerge(tv, sv);
    } else {
      out[k] = Array.isArray(sv) ? [...sv] : sv;
    }
  }
  return out;
}

// 軸関係
// グラフY軸の1000の単位をk表記にするフォーマッタ
export function formatK(n: number): string {
  if (Math.abs(n) >= 1000) {
    // 小数を丸めたい場合は toFixed(1) などに変更
    const v = n / 1000;
    return Number.isInteger(v) ? `${v}k` : `${v.toFixed(1)}k`;
  }
  return String(n);
}

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

