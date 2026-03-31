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

// 日付データをyyyy/MM/ddからyyyy-MM-dd表記に変換
export function formatDateForMySQL(date: Date): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

// 日付の範囲をそれぞれ格納(切削日基準として時刻は8:00に固定)
export function getRangeForMySQL(rangeValue: Date[]): { start: string, end: string } {
  // 空欄の場合(当日)
  if (!rangeValue || rangeValue.length <2) {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    return { start: formatDateForMySQL(today)+' 08:00:00',
             end: formatDateForMySQL(tomorrow)+' 08:00:00' 
    };
  }
  const startDate = new Date(rangeValue[0]);
  const endDate = new Date(rangeValue[1]);
  // 同じ日付を選択した場合(選択した日)
  if(rangeValue[1] == null || startDate.getTime() === endDate.getTime()){
    const selectedDay = new Date(rangeValue[0]);
    const selectedAdd = new Date(selectedDay);
    selectedAdd.setDate(selectedDay.getDate() + 1);
    return { start: formatDateForMySQL(selectedDay) + ' 08:00:00',
             end: formatDateForMySQL(selectedAdd) + ' 08:00:00'
    }

  }
  else{
      return {
      start: formatDateForMySQL(rangeValue[0])+' 08:00:00',
      end: formatDateForMySQL(rangeValue[1])+' 08:00:00'
    };
  }
  
}
