
/** 今月の土曜・日曜になる日付をnumberで取得（1..31） */
export function getWeekendDaysOfCurrentMonth(): number[] {
  const today = new Date();   // ローカルタイム
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weekendDays: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const dayOfWeek = dt.getDay(); // 0=日, 6=土
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDays.push(d);
    }
  }
  return weekendDays;
}

/** 任意の開始日から終了日までの平日日数（両端含む） */
export function countWeekdaysInclusive(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start > end) return 0;

  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/** 今月1日から「昨日」までの平日数（今日を含めない） */
export function getWeekdaysThisMonthUntilYesterday(now: Date = new Date()): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const yesterday = new Date(year, month, now.getDate() - 1);
  return countWeekdaysInclusive(start, yesterday);
}
