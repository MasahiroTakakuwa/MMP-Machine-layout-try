import { Injectable } from "@nestjs/common";
import { EntityManager, In, Repository } from "typeorm";
import { Devices } from "./models/devices.entity";
// import { ProductHistory } from "./models/product-history.entity";
import { MachiningKpi } from "./models/machining-kpi.entity";
import { ForgingKpi } from "./models/forging-kpi.entity";
import { MachiningProductPlan } from "./models/machining-product-plan.entity";
import { ForgingProductPlan } from "./models/forging-product-plan.entity";
import { MachiningPastPlan } from "./models/machining-product-plan-history.entity";
import { ForgingPastPlan } from "./models/forging-product-plan-history.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { MachineStatusHistory } from "./models/machine-status-history.entity";
import { Parts } from "./models/parts.entity";
import { query } from "express";

@Injectable()
export class KpiService {
  constructor(
    private entityManager: EntityManager,
    @InjectRepository(Devices)
    private readonly deviceRepo: Repository<Devices>,
    @InjectRepository(Parts)
    private readonly PartsRepo: Repository<Parts>,
    @InjectRepository(MachineStatusHistory)
    private readonly statusRepo: Repository<MachineStatusHistory>,
    // @InjectRepository(ProductHistory)
    // private readonly productHistoryRepo: Repository<ProductHistory>,
    @InjectRepository(MachiningKpi)
    private readonly machiningKpiRepo: Repository<MachiningKpi>,
    @InjectRepository(ForgingKpi)
    private readonly forgingKpiRepo: Repository<ForgingKpi>,
    @InjectRepository(ForgingProductPlan)
    private readonly forgingPlanRepo: Repository<ForgingProductPlan>,
    @InjectRepository(ForgingPastPlan)
    private readonly forgingpastRepo: Repository<ForgingPastPlan>,
    @InjectRepository(MachiningProductPlan)
    private readonly machiningPlanRepo: Repository<MachiningProductPlan>,
    @InjectRepository(MachiningPastPlan)
    private readonly machiningpastRepo: Repository<MachiningPastPlan>
        
  ){}

  // 指定された工場・加工方法の品番一覧を取得
  async getPartsNoSummary_type(factory: number,type: number){
    // 鍛造
    if(type == 0){
      const query = await this.forgingKpiRepo
        .createQueryBuilder('m')
        .select('m.parts_no AS parts_no')
        .groupBy('m.parts_no')
        .where('m.factory_type = :factory', {factory});
        const results = await query.getRawMany();
        return results;
      }
    // 切削
    else if(type == 1){
      const query = await this.machiningKpiRepo
        .createQueryBuilder('m')
        .select('m.parts_no AS parts_no')
        .groupBy('m.parts_no')
        .where('m.factory_type = :factory', {factory})
        .andWhere('m.machine_name != :name',{name:'N100'});
        const results = await query.getRawMany();
        return results;
      
    }
    
  }
  // 指定された工場・加工方法・品番の設備情報(鍛造:設備名 切削:ラインNo)
  async getLineNoSummary_type(factory: number,parts_no: string, type: number){
    // 鍛造
    if(type == 0){
      const query = await this.forgingKpiRepo
        .createQueryBuilder('m')
        .select('m.machine_name AS machine_name')
        .groupBy('m.machine_name')
        .where('m.factory_type = :factory', {factory});
        const results = await query.getRawMany();
        return results;      
    }
    // 切削
    else if(type == 1){
      const query = await this.machiningKpiRepo
        .createQueryBuilder('m')
        .select('m.line_no AS line_no')
        .groupBy('m.line_no')
        .where('m.factory_type = :factory', {factory})
        .andWhere('m.parts_no = :parts_no',{parts_no})
        .andWhere('m.line_no NOT LIKE :underbarZero',{underbarZero:'%\\_0'});
        const results = await query.getRawMany();
        return results;
    }

  }

  // 指定の工場の品番・品名を取得
  async getPartslist(factory: number){
    const query = await this.PartsRepo
      .createQueryBuilder('m')
      .select(['m.parts_no AS parts_no',
               'm.parts_name AS parts_name'
      ])
      .where('m.factory_type = :factory', {factory});
      const results = await query.getRawMany();
      return results;

  }

// 生産計画の最終更新日を取得
  async getLastUpdate_plan(type: number){
    // 鍛造
    if(type == 0){
      const query = await this.forgingPlanRepo
        .createQueryBuilder('m')
        .select('m.updated_at AS updated_at')
        .orderBy('m.updated_at','DESC')
        .take(1);
        const result = await query.getRawOne();
        return result;      
    }
    // 切削
    else if(type == 1){
      const query = await this.machiningPlanRepo
        .createQueryBuilder('m')
        .select('m.updated_at AS updated_at')
        .orderBy('m.updated_at','DESC')
        .take(1);
        const result = await query.getRawOne();
        return result;
    }

  }

// 直近の最終生産日を取得
  async getLastUpdate_prod(factory: number ,type: number){
    // 鍛造
    if(type == 0){
      const query = await this.forgingKpiRepo
        .createQueryBuilder('m')
        .select('m.prod_date AS prod_date')
        .orderBy('m.prod_date','DESC')
        .where('m.factory_type = :factory',{factory})
        .take(1);
        const result = await query.getRawOne();
        return result;      
    }
    // 切削
    else if(type == 1){
      const query = await this.machiningKpiRepo
        .createQueryBuilder('m')
        .select('m.prod_date AS prod_date')
        .orderBy('m.prod_date','DESC')
        .where('m.factory_type = :factory',{factory})
        .take(1);
        const result = await query.getRawOne();
        return result;
    }

  }

  // 格納されている過去の生産計画の年・月を取得
  async getPastPlanDate_type(type: number){
    // 鍛造
    if(type == 0){
      const query = await this.forgingpastRepo
        .createQueryBuilder('m')
        .select(['m.year AS year',
                 'm.month AS month'
        ])
        .distinct(true)
        .orderBy('m.year','DESC')
        .addOrderBy('m.month','DESC')
        const results = await query.getRawMany();
        return results;
    }
    // 切削
    else if(type == 1){
      const query = await this.machiningpastRepo
        .createQueryBuilder('m')
        .select(['m.year AS year',
                 'm.month AS month'
        ])
        .distinct(true)
        .orderBy('m.year','DESC')
        .addOrderBy('m.month','DESC')
        const results = await query.getRawMany();
        return results;
    }

  }

  // 鍛造の生産計画取得
  // 鍛造は工場内全設備or対象設備で絞り込み
  async getForgingPlan(factory: number, parts_no: string, machine_name: string){
    const query = await this.forgingPlanRepo
      .createQueryBuilder('m')
      .select(['m.day AS day',
              'SUM(m.target_prod) AS target_prod'
      ])
      .where('m.factory_type = :factory',{factory})
      .groupBy('m.day')
      .orderBy('m.day ')
      // 設備指定ありの場合は条件追加
      if(machine_name !== 'all'){
        query.andWhere('m.machine_name = :machine_name', {machine_name})
      }
      const results = await query.getRawMany();
      return results;
  }

  // 鍛造の生産実績取得
  async getForgingProgress(factory: number, parts_no: string, machine_name: string, date: string){
    const query = await this.forgingKpiRepo
      .createQueryBuilder('m')
      .select(['m.prod_date AS prod_date',
              'SUM(m.good_prod) AS good_prod',
              'SUM(m.waste_prod) AS waste_prod',
              'SUM(m.setup_prod) AS setup_prod',
              'SUM(m.inline_defect) AS inline_defect'
      ])
      .where('m.factory_type = :factory',{factory})
      .andWhere('m.prod_date >= :date',{date})
      .groupBy('m.prod_date')
      .orderBy('m.prod_date')
      if(machine_name !== 'all'){
        query.andWhere('m.machine_name = :machine_name',{machine_name})
      }
      const results = await query.getRawMany();
      return results;

  }

  // 鍛造の工場全体の累積生産計画数を取得
  async getTotalForginPlan_factory(factory: number, day: number){
    const query = await this.forgingPlanRepo
      .createQueryBuilder('m')
      .select('SUM(m.target_prod) AS target_prod')
      .where('m.factory_type = :factory',{factory})
      .andWhere('m.day < :day',{day});
      const result = await query.getRawOne();
      return Number(result?.target_prod ?? 0);

  }

  // 鍛造の工場全体の累積良品数を取得
  async getTotalForgingProgress_factory(factory: number, firstday: string, today: string){
    const query = await this.forgingKpiRepo
      .createQueryBuilder('m')
      .select('SUM(m.good_prod) AS good_prod')
      .where('m.factory_type = :factory',{factory})
      .andWhere('m.prod_date >= :firstday',{firstday})
      .andWhere('m.prod_date < :today',{today});
      const result = await query.getRawOne();
      return Number(result?.good_prod ?? 0);

  }

  // フィルタリングした鍛造の累積生産計画数を取得
  async getTotalForginPlan_filter(factory: number, machine: string, day: number){
    const query = await this.forgingPlanRepo
      .createQueryBuilder('m')
      .select('SUM(m.target_prod) AS target_prod')
      .where('m.factory_type = :factory',{factory})
      .andWhere('m.day < :day',{day})
      // 設備指定ありの場合は条件追加
      if(machine !== 'all'){
        query.andWhere('m.machine_name = :machine',{machine})
      }
      const result = await query.getRawOne();
      return Number(result?.target_prod ?? 0);

  }

  // フィルタリングした鍛造の累積良品数を取得
  async getTotalForgingProgress_filter(factory: number, machine: string, firstday: string, today: string){
    const query = await this.forgingKpiRepo
      .createQueryBuilder('m')
      .select('SUM(m.good_prod) AS good_prod')
      .where('m.factory_type = :factory',{factory})
      .andWhere('m.prod_date >= :firstday',{firstday})
      .andWhere('m.prod_date < :today',{today})
      // 設備指定ありの場合は条件追加
      if(machine !== 'all'){
        query.andWhere('m.machine_name = :machine',{machine})
      }
      const result = await query.getRawOne();
      return Number(result?.good_prod ?? 0);
        
  }

  // 切削の生産計画取得
  async getMachiningPlan(factory: number, parts_no: string){
    const query = await this.machiningPlanRepo
      .createQueryBuilder('m')
      .where('m.factory_type = :factory',{factory})
      if(parts_no = 'all'){
        query.select(['SUM(m.target_prod) AS target_prod',
                      'SUM(m.total) AS total'
              ])
      }
      else{
        const keyword = parts_no ?? ''; // 入力文字列
        query.select(['m.target_prod AS target_prod',
                      'm.total AS total'
              ])
        query.andWhere('m.parts_no LIKE :parts_no', {parts_no: `%${keyword}%` })
      }
      const results = await query.getRawMany();
      return results;
      
  }

  // 切削の生産実績取得
  async getMachiningProgress(factory: number, parts_no: string, line_no: string, date: string){
    const keyword = parts_no ?? ''; // 入力文字列
    // クエリ文の共通部分を記述
    const query = await this.machiningKpiRepo
    .createQueryBuilder('m')
    .where('m.factory_type = :factory',{factory})
    .andWhere('m.prod_date >= :date',{date})
    .andWhere('m.line_no NOT LIKE :underbarZero',{underbarZero:'%\\_0'})
    .groupBy('m.prod_date')
    .orderBy('m.prod_date')
    // 品番・設備の両方指定有りの場合
    if(parts_no !== 'all' && line_no !== 'all'){
      query.select(['m.prod_date AS prod_date',
            'm.good_prod AS good_prod',
            'm.inline_defect AS inline_defect',
            'm.visual_defect AS visual_defect'
            ])
            .andWhere('m.parts_no LIKE :parts_no', {parts_no: `%${keyword}%` })
            .andWhere('m.line_no = :line_no',{line_no})
    }
    else{
      query.select(['m.prod_date AS prod_date',
            'SUM(m.good_prod) AS good_prod',
            'SUM(m.inline_defect) AS inline_defect',
            'SUM(m.visual_defect) AS visual_defect'
            ])
            .andWhere('m.machine_name != :name',{name:'N100'})
      if(line_no === 'all'){
        query.andWhere('m.parts_no LIKE :parts_no', {parts_no: `%${keyword}%` })

      }

    }
    const results = await query.getRawMany();
    return results;    
  }

  // 切削の工場全体の累積生産計画数を取得
  async getTotalMachiningPlan_factory(factory: number){
      const query = await this.machiningPlanRepo
      .createQueryBuilder('m')
        .select(['SUM(m.target_prod) AS target_prod',
                 'SUM(m.total) AS total'
        ])
        .where('m.factory_type = :factory',{factory});
        const result = await query.getRawOne();
        return Number(result?.target_prod ?? 0);

  }

  // 切削の工場全体の累積生産数を取得
  async getTotalMachiningProgress_factory(factory: number, firstday: string, today: string){
      const query = await this.machiningKpiRepo
      .createQueryBuilder('m')
        .select('SUM(m.good_prod) AS good_prod')
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.prod_date >= :firstday',{firstday})
        .andWhere('m.prod_date < :today',{today})
        .andWhere('m.line_no NOT LIKE :underbarZero',{underbarZero:'%\\_0'});
        const result = await query.getRawOne();
        return Number(result?.good_prod ?? 0);

  }

  // フィルタリングした切削の累積生産計画数を取得
  async getTotalMachiningPlan_filter(factory: number,parts_no: string){
      const keyword = parts_no ?? '';     // 入力文字列
      const query = await this.machiningPlanRepo
      .createQueryBuilder('m')
        .select(['SUM(m.target_prod) AS target_prod',
                 'SUM(m.total) AS total'
        ])
        .where('m.factory_type = :factory',{factory})
        if(parts_no !== 'all'){
          query.andWhere('m.parts_no LIKE :parts_no', {parts_no: `%${keyword}%` })
        }
        const results = await query.getRawMany();
        return results;

  }

  // フィルタリングした切削の累積生産数を取得
  async getTotalMachiningProgress_filter(factory: number,parts_no: string,line_no: string, firstday: string, today: string){
      const keyword = parts_no ?? ''; // 入力文字列
      const query = await this.machiningKpiRepo
      .createQueryBuilder('m')
        .select(['SUM(m.good_prod) AS good_prod',
                 'COUNT(*) AS record_count'
        ])
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.prod_date >= :firstday',{firstday})
        .andWhere('m.prod_date < :today',{today})
        .andWhere('m.line_no NOT LIKE :underbarZero',{underbarZero:'%\\_0'})
        if(parts_no !== 'all'){
          query.andWhere('m.parts_no LIKE :parts_no', {parts_no: `%${keyword}%` })
        }
        if(line_no !== 'all'){
          query.andWhere('m.line_no = :line_no',{line_no})
        }
        const results = await query.getRawMany();
        return results;

  }

  // 切削の基準CT取得
  async getMachiningBaseCT(factory: number, parts_no: string, line_no: string){
      const keyword = parts_no ?? ''; // 入力文字列
      const query = await this.deviceRepo
      .createQueryBuilder('m')
        .select('m.machine_no AS machine_no')
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.device_type = 40')
        if(parts_no !== 'all'){
          query.andWhere('m.parts_no LIKE :parts_no', {parts_no: `%${keyword}%` })
        }
        if(line_no !== 'all'){
          query.andWhere('m.line_no = :line_no',{line_no})
        }
        const machine_list = await query.getRawMany();

        // machine_no の配列を作る
        const machineNos = machine_list.map((x) => x.machine_no);     
        // 該当がなければ空配列を返す（ここで終了）
        if (machineNos.length === 0) {
          return [];
        }

      // 取得したmachine_noの分CTを取得して返す
      const query2 = await this.statusRepo
      .createQueryBuilder('s')
        .select(['s.machine_no AS machine_no',
                 'CAST(s.CT AS DECIMAL(8,2)) AS CT'])
        .where('s.factory_type = :factory', { factory })
        .andWhere('s.machine_no IN (:...machineNos)', { machineNos }) // ← スプレッドパラメータ
        const results = await query2.getRawMany();
        return results
      
  }

}