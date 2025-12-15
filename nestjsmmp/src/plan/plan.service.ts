import { Injectable } from "@nestjs/common";
import { DataSource, DataTypeNotSupportedError, EntityManager, In, Repository } from "typeorm";
import { ForgingProductPlan } from "./models/forging-product-plan.entity";
import { ForgingUploadDto } from "./models/plan-upload.dto";
import { MachiningProductPlan } from "./models/machining-product-plan";
import { MachiningUploadDto } from "./models/plan-upload.dto";
import { Formar } from "./models/factory-formar.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { machine } from "os";

function normalizePartNo(a: string | null | undefined): string | null{
    // 全角空白(U+3000)を半角に置換し、前後の空白を削除
    if (a == null) return null;     // null/undefinedはそのままnullで返す
    return a
    .replace(/\u3000/g, ' ')
    .replace(/[\r\n]+/g, '・')
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
    // @InjectRepository(MachiningProductPlan)
    // private readonly machiningRepo: Repository<MachiningProductPlan>,
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
    // console.log(`Table TRUNCATE`);

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
    //console.log(`Table TRUNCATE`);

    // 2)各行をループして処理（DB保存・集計など）
    for (const row of rows) {
      const factory_type = row.factoryDivision ?? ''; // '' or undefined
      const raw_parts_no = row.A ?? null;           // string | null | undefined
      const val = row.E ?? 0;                   //
      const parts_no = normalizePartNo(raw_parts_no);
      const item = {
        factory_type:factory_type ?? null,
        parts_no: parts_no ?? null,
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
          r.target_prod,
          r.updated_at,
        ]);
        const valuesSql = tuples.map(() => '(?, ?, ?, ?)').join(', ');
        // 4) INSERT IGNORE で重複時は無視（エラーにならない）
        await this.dataSource.query(
          `
          INSERT IGNORE INTO machining_product_plan
            (factory_type, parts_no, target_prod, updated_at)
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

}
