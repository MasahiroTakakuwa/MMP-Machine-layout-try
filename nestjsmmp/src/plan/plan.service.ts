import { Injectable } from "@nestjs/common";
import { DataSource, DataTypeNotSupportedError, EntityManager, In, Repository } from "typeorm";
import { ForgingProductPlan } from "./models/forging-product-plan.entity";
import { ForgingPastPlan } from "./models/forging-product-plan-history.entity";
import { ForgingUploadDto } from "./models/plan-upload.dto";
import { MachiningProductPlan } from "./models/machining-product-plan.entity";
import { MachiningPastPlan } from "./models/machining-product-plan-history.entity";
import { MachiningUploadDto } from "./models/plan-upload.dto";
import { Formar } from "./models/factory-formar.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { machine } from "os";
import { query } from "express";

function normalizePartNo(a: string | null | undefined): string | null{
    // 全角空白(U+3000)を半角に置換し、前後の空白を削除
    if (a == null) return null;     // null/undefinedはそのままnullで返す
    return a
    .replace(/\u3000/g, ' ')
    .replace(/[\r\n]+/g, '・')
    .replace(/・{2,}/g, '・')       // ・・を・に
    .trim();
  }

function normalizeMachinename(a: string | null | undefined): string | null{
    if (a == null) return null;
    // 1) 改行・タブなどの制御文字を削除
    let s = a.replace(/[\r\n\t]/g, '');
    // 2) ノーブレークスペースを通常スペースに、全角空白を半角に
    s = s.replace(/\u00A0/g, ' ').replace(/\u3000/g, ' ');
    // 3) 前後の空白を除去
    s = s.trim();
    // 4) Unicode正規化（NFKC）で全角英数・記号を半角寄りに統一
    // 例: 'ＢＰ４３０' => 'BP430'
    s = s.normalize('NFKC');
    // 空文字になった場合は null を返す（キーとして不正扱い）
    if (s.length === 0) return null;
    return s;

  }
  
@Injectable()
export class PlanService {
  constructor(
    private entityManager: EntityManager,
    @InjectRepository(ForgingProductPlan)
    private readonly forgingRepo: Repository<ForgingProductPlan>,
    @InjectRepository(ForgingPastPlan)
    private readonly forgingpastRepo: Repository<ForgingPastPlan>,
    @InjectRepository(MachiningProductPlan)
    private readonly machiningRepo: Repository<MachiningProductPlan>,
    @InjectRepository(MachiningPastPlan)
    private readonly machiningpastRepo: Repository<MachiningPastPlan>,

    @InjectRepository(Formar)
    private readonly formarRepo: Repository<Formar>,
    private readonly dataSource: DataSource,
  ){}

  async CheckForgingProductPlanning(dto: ForgingUploadDto){
    const now = new Date();
    const today = new Date(now);
    const rows = dto.rows;                       // ForgingRowDto[]
    const rowsToInsert = [];                      // バルクインサート用の空配列
    // 1)テーブルデータの初期化
    await this.dataSource.query(`TRUNCATE TABLE forging_product_plan`);
    // 2)各行をループして処理（DB保存・集計など）
    for (const row of rows) {
      const raw_equipmentName = row.equipmentName ?? ''; // '' or undefined
      const equipmentName = normalizeMachinename(raw_equipmentName);
      const cdValue = row.cdValue ?? null;           // string | null | undefined
      const flatValues = row.valuesKtoAO.flat();     // 2次配列を1次配列に変更
      
      // 設備名から工場区分を取得 
      const factoryType = await this.getfactoryFormar(equipmentName); 
      // 生産数が0ではないかで判断
      for(let i=0; i<flatValues.length; i++){
        const val = flatValues[i];
        if (val !== 0){
          const item = {
            factory_type:factoryType,
            parts_no:cdValue ?? null,
            machine_name:equipmentName ?? null,
            day: i+1,
            target_prod: val, 
            updated_at: today
          };
          
          rowsToInsert.push(item);
          // 逐次ログ（確認用）
          //console.log('[PUSHED]', item);
         
        }
      }
      
      if (rowsToInsert.length === 0) {
        //return { inserted: 0 };
      }
      else if (rowsToInsert.length !== 0) {
        // クエリ実行ログ(確認用)
        // console.log(`Query`);
        const tuples = rowsToInsert.map(r => [
          r.factory_type,
          r.parts_no,
          r.machine_name,
          r.day,
          r.target_prod,
          r.updated_at,
        ]);
        const valuesSql = tuples.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        // 4) INSERT IGNORE で重複時は無視（エラーにならない）
        await this.dataSource.query(
          `
          INSERT IGNORE INTO forging_product_plan
            (factory_type, parts_no, machine_name, day, target_prod, updated_at)
          VALUES
            ${valuesSql}
          `,
          tuples.flat()
        );

      }
     
    }

  }
  
  async CheckMachiningProductPlanning(dto: MachiningUploadDto){
    const now = new Date();
    const today = new Date(now);
    const rows = dto.rows;
    const rowsToInsert = [];                      // バルクインサート用の空配列
    // 1)テーブルデータの初期化
    await this.dataSource.query(`TRUNCATE TABLE machining_product_plan`);
    
    // 2)各行をループして処理（DB保存・集計など）
    for (const row of rows) {
      const factory_type = row.factoryDivision ?? ''; // '' or undefined
      const raw_parts_no = row.A ?? null;           // string | null | undefined
      const order = row.D ?? 0;
      const val = row.E ?? 0;                   //
      const parts_no = normalizePartNo(raw_parts_no);
      const item = {
        factory_type:factory_type ?? null,
        parts_no: parts_no ?? null,
        total: order,
        target_prod: val, 
        updated_at: today
      };
          
          rowsToInsert.push(item);
          // 逐次ログ（確認用）
          // console.log('[PUSHED]', item);

    }

      if (rowsToInsert.length === 0) {
        //return { inserted: 0 };
      }
      else if (rowsToInsert.length !== 0) {
        // クエリ実行ログ(確認用)
        // console.log(`Query`);
        const tuples = rowsToInsert.map(r => [
          r.factory_type,
          r.parts_no,
          r.total,
          r.target_prod,
          r.updated_at,
        ]);
        const valuesSql = tuples.map(() => '(?, ?, ?, ?, ?)').join(', ');
        // 4) INSERT IGNORE で重複時は無視（エラーにならない）
        await this.dataSource.query(
          `
          INSERT IGNORE INTO machining_product_plan
            (factory_type, parts_no, total, target_prod, updated_at)
          VALUES
            ${valuesSql}
          `,
          tuples.flat()
        );

      }     
  
  }
  
  // 鍛造設備から工場区分を取得
  async getfactoryFormar(machine: string){
    const row = await this.formarRepo
      .createQueryBuilder('m')
      .select('m.factory_type', 'factory_type')  // 列エイリアス
      .where('BINARY m.machine_name = :machine', { machine })
      .getRawOne<{ factory_type: number }>();

    return row?.factory_type ?? 0;
  }

  // 鍛造の生産計画を_historyテーブルにコピー
  async copyForgingPastplan(){
    // 現在登録されている生産計画データを全件取得
    const plans = await this.forgingRepo.find();
    // 登録されているデータが0件の場合は何もしない
    if(plans.length === 0){
      return;
    }
    // 登録日時のデータからyearとmonthを取得
    const baseDate = plans[0].updated_at;
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth()+1;
    const ym_int = year *100 + month;
    // 履歴データの重複回避のため、事前に削除してからコピーを実施
    await this.forgingpastRepo.delete({year,month});

    // バルクインサート用の配列にデータを格納
    const tuples = plans.map(plan => {
      const targetProd = Number(plan.target_prod);
      return [
        Number(plan.factory_type),
        plan.parts_no,
        plan.machine_name,
        ym_int,
        plan.day,
        Number.isNaN(targetProd) ? 0 : targetProd,
        year,
        month,
      ];
    });

    const valuesSql = tuples.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    // INSERT IGNORE で重複時は無視（エラー対策）
    await this.dataSource.query(
      `
      INSERT IGNORE INTO machining_product_plan_history
        (factory_type, parts_no, machine_name, ym_int, day, target_prod, year, month)
      VALUES
        ${valuesSql}
      `,
      tuples.flat()
    );
  }

  // 切削の生産計画を_historyテーブルにコピー
  async copyMachiningPastplan(){
    // 現在登録されている生産計画データを全件取得
    const plans = await this.machiningRepo.find()
    // 登録されているデータが0件の場合は何もしない
    if(plans.length === 0){
      return;
    }
    // 登録日時のデータからyearとmonthを取得
    const baseDate = plans[0].updated_at;
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth()+1;
    const ym_int = year * 100 + month;
    // // 履歴データ重複回避のため、事前に削除してコピーを実施
    await this.machiningpastRepo.delete({year,month});
    // バルクインサート用の配列にデータを格納
    const tuples = plans.map(plan => {
      const targetProd = Number(plan.target_prod);
      return [
        Number(plan.factory_type),
        plan.parts_no,
        Number(plan.total),
        Number.isNaN(targetProd) ? 0 : targetProd,
        ym_int,
        year,
        month,
      ];
    });

    const valuesSql = tuples.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
    // INSERT IGNORE で重複時は無視（エラー対策）
    await this.dataSource.query(
      `
      INSERT IGNORE INTO machining_product_plan_history
        (factory_type, parts_no, total, target_prod, ym_int, year, month)
      VALUES
        ${valuesSql}
      `,
      tuples.flat()
    );
    
  }
}
