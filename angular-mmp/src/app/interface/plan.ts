// 送信&プレビュー用型定義(鍛造)
export interface ForgingRow {
  equipmentName: string;                      // 設備名
  cdValue: string | null;                     // 品番(安全のため空の場合は null)
  valuesKtoAO: (number | string | null)[];    // 日ごとの生産数量
  // ※ 抽出関数の戻り型次第で、1次元/2次元の可能性があるためユニオンに
}

// 抽出直後の Raw 型（鍛造）
export interface ForgingRowRaw {
  rowNumber: number;
  cdValue: string | null;
  equipmentName: string | null;             // ★ ここが null の可能性あり
  valuesKtoAO: (string | number | null)[];
}

// 送信&プレビュー用型定義(切削)
export interface MachiningRow {
  factoryDivision: number | string;      // 工場区分(読み取り時は文字列の可能性があるので number へ変換)
  A: string | null;                      // 品番(安全のため空の場合は null)
  D: number | string;                    // 切削数
  E: number | string;                    // 稼働日当たり生産数(読み取り時は文字列の可能性があるので number へ変換)
}

// 抽出直後の Raw 型（切削）
export interface MachiningRowRaw {
  sheet: string;
  row: number;
  A: any;
  D: any;
  E: any;
  factoryDivision: number | null;
}

// 送信ペイロード型(鍛造)
export interface ForgingPayload {
  category: 'forging';
  rows: {
    equipmentName: string;
    cdValue: string | null;
    valuesKtoAO: number[][];
  }[];
}

// 送信ペイロード型(切削)
export interface MachiningPayload {
  category: 'machining';
  rows: {
    factoryDivision: number;
    A: string;
    D: number;
    E: number;
  }[];
}