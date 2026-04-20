// 切削進捗勝ち負け計算用数値格納
export interface MachiningTotalResponse {
  MachiningPlanTotal: PlanTotal;
  MachiningProgTotal: ProgTotal; // 同上

}

interface PlanTotal {
  target_prod: number;
  total:number;
}

interface ProgTotal{
  good_prod:number;
}

export interface MachiningPlanItem {
  total: number;        // 切削数
  target_prod: number;  // 受注稼働日当たり
}

export interface MachiningProgItem {
  prod_date: string;   // "yyyy-MM-dd"（JST）
  good_prod: number;
  inline_defect: number;
  visual_defect: number;
}

export interface MachiningProgItems {
  day: number;
  good_prod: number;
  inline_defect: number;
  visual_defect: number;
}

export interface MachiningBaseCTItem {
    machine_no: number;
    CT: number;
}

export interface MachiningResponse {
  MachiningPlan: MachiningPlanItem[];
  MachiningProg: MachiningProgItem[];
  MachiningBaseCT: MachiningBaseCTItem[];
}

export interface MachiningCurrentResponse {
  MachiningCurrentPlan: MachiningPlanItem[];
  MachiningCurrentProg: MachiningProgItems[];
  MachiningBaseCT: MachiningBaseCTItem[];
}

export interface MachiningPastResponse {
  MachiningPastPlan: MachiningPlanItem[];
  MachiningPastProg: MachiningProgItems[];
  MachiningBaseCT: MachiningBaseCTItem[];
}