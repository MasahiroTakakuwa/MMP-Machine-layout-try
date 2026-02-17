// 鍛造進捗勝ち負け計算用数値格納
export interface ForgingTotalsResponse {
  ForgingPlan_factory: number; // 返却が数値なら number に
  ForgingProg_factory: number; // 同上
}

export interface ForgingPlanItem {
  day: number;         // 1..31
  target_prod: number; // 例: 45000
}

export interface ForgingProgItem {
  prod_date: string;   // "yyyy-MM-dd"（JST）
  good_prod: number;
  waste_prod: number;
  setup_prod: number;
  inline_defect: number;
}

export interface ForgingResponse {
  ForgingPlan: ForgingPlanItem[];
  ForgingProg: ForgingProgItem[];
}