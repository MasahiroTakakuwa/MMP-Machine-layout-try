// 凡例関係
const STATE_COLORS: Record<number,string> = {
  0: 'transparent',
  1: '#81bb66',
  2: '#a200ff',
  3: '#0011fd',
  4: '#ffbb00',
  // 5:'#ff0000ff'
}

const FALLBACK_FILL = '#ff0000ff';

export const legendColorMap_Tools: Record<string, string> = {
  T1: '#ff0000', // 赤
  T2: '#81bb66', // 緑
  T3: '#ffbb00', // 黄
  T4: '#0011ff', // 青
  T5: '#a200ff', // 紫
};

export const legendColorMap_Counts: Record<string, string> = {
  '1本': '#81bb66',
  '2本': '#a200ff',
  '3本': '#0011fd',
  '4本': '#ffbb00',
  '5本': '#ff0000ff'
}

export function toBackgroundColors(values: number[]){
  return values.map(v => STATE_COLORS[v] ?? FALLBACK_FILL);
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
