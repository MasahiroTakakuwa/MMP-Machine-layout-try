// 切削進捗勝ち負け計算用数値格納
export interface MachiningTotalsResponse {
  MachiningPlan_factory: number; // 返却が数値なら number に
  MachiningProg_factory: number; // 同上
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

export interface MachiningBaseCTItem {
    machine_no: number;
    CT: number;
}

export interface MachiningResponse {
  MachiningPlan: MachiningPlanItem[];
  MachiningProg: MachiningProgItem[];
  MachiningBaseCT: MachiningBaseCTItem[];
}