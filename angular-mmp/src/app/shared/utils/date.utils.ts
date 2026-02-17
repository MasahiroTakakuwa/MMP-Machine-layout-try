
/** 今月1日を生成(yyyy-MM-dd形式) - 日本時間 */
export function getFirstDayOfCurrentMonthInJST(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);

  const year = Number(parts.find(p => p.type === 'year')?.value);
  const month = Number(parts.find(p => p.type === 'month')?.value);

  const yyyy = String(year);
  const mm = String(month).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

/** 今日の日付を生成(yyyy-MM-dd形式) - 日本時間 */
export function getTodayInJST(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(now);

  const year = Number(parts.find(p => p.type === 'year')?.value);
  const month = Number(parts.find(p => p.type === 'month')?.value);
  const day = Number(parts.find(p => p.type === 'day')?.value);

  const yyyy = String(year);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}
