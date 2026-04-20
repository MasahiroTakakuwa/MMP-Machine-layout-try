// 鍛造進捗勝ち負け計算用数値格納
export interface ForgingTotalResponse {
  ForgingPlanTotal: PlanTotal;
  ForgingProgTotal: ProgTotal;
}

interface PlanTotal {
  target_prod:number;
}

interface ProgTotal {
  good_prod:number;
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

// 後処理の簡略化
export interface ForgingProdItems {
  day: number;
  good_prod: number;
  waste_prod: number;
  setup_prod: number;
  inline_defect: number;
}

export interface ForgingResponse {
  ForgingPlan: ForgingPlanItem[];
  ForgingProg: ForgingProgItem[];
}

export interface ForgingCurrentResponse {
  ForgingCurrentPlan: ForgingPlanItem[];
  ForgingCurrentProg: ForgingProdItems[];
}

export interface ForgingPastResponse {
  ForgingPastPlan: ForgingPlanItem[];
  ForgingPastProg: ForgingProdItems[];
}