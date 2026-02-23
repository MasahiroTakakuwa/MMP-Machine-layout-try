// グラフY軸の1000の単位をk表記にするフォーマッタ
export function formatK(n: number): string {
  if (Math.abs(n) >= 1000) {
    // 小数を丸めたい場合は toFixed(1) などに変更
    const v = n / 1000;
    return Number.isInteger(v) ? `${v}k` : `${v.toFixed(1)}k`;
  }
  return String(n);
}