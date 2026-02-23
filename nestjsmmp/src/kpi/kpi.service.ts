import { Injectable } from "@nestjs/common";
import { EntityManager, In, Repository } from "typeorm";
import { Devices } from "./models/devices.entity";
import { ProductHistory } from "./models/product-history.entity";
import { MachiningKpi } from "./models/machining-kpi.entity";
import { ForgingKpi } from "./models/forging-kpi.entity";
import { MachiningPlan } from "./models/machining-product-plan.entity";
import { ForgingPlan } from "./models/forging-product-plan.entity";
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
    @InjectRepository(ProductHistory)
    private readonly productRepo: Repository<ProductHistory>,
    @InjectRepository(MachiningKpi)
    private readonly MachiningRepo: Repository<MachiningKpi>,
    @InjectRepository(ForgingKpi)
    private readonly ForgingRepo: Repository<ForgingKpi>,
    @InjectRepository(MachiningPlan)
    private readonly MPlanRepo: Repository<MachiningKpi>,
    @InjectRepository(ForgingPlan)
    private readonly FPlanRepo: Repository<ForgingKpi>,
    @InjectRepository(MachineStatusHistory)
    private readonly statusRepo: Repository<MachineStatusHistory>,
    @InjectRepository(Parts)
    private readonly PartsRepo: Repository<Parts>
  ){}

  // 指定された工場・加工方法の品番一覧を取得
  async getPartsNoSummary_type(factory: number,type: number){
  // 鍛造
  if(type == 0){
    const query = await this.ForgingRepo
      .createQueryBuilder('m')
      .select('m.parts_no AS parts_no')
      .groupBy('m.parts_no')
      .where('m.factory_type = :factory', {factory});
      const result = await query.getRawMany();
      return result;
    }
  // 切削
  else if(type == 1){
    const query = await this.MachiningRepo
      .createQueryBuilder('m')
      .select('m.parts_no AS parts_no')
      .groupBy('m.parts_no')
      .where('m.factory_type = :factory', {factory})
      .andWhere('m.machine_name != :name',{name:'N100'});
      const result = await query.getRawMany();
      return result;
    
  }
  
}
  // 指定された工場・加工方法・品番の設備情報(鍛造:設備名 切削:ラインNo)
  async getLineNoSummary_type(factory: number,parts_no: string, type: number){
    // 鍛造
  if(type == 0){
    const query = await this.ForgingRepo
      .createQueryBuilder('m')
      .select('m.machine_name AS machine_name')
      .groupBy('m.machine_name')
      .where('m.factory_type = :factory', {factory});
      const result = await query.getRawMany();
      return result;      
    }
  // 切削
  else if(type == 1){
    const query = await this.MachiningRepo
      .createQueryBuilder('m')
      .select('m.line_no AS line_no')
      .groupBy('m.line_no')
      .where('m.factory_type = :factory', {factory})
      .andWhere('m.parts_no = :parts_no',{parts_no})
      .andWhere('m.line_no NOT LIKE :underbarZero',{underbarZero:'%\\_0'});
      const result = await query.getRawMany();
      return result;
    
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
      const result = await query.getRawMany();
      return result;

  }

  // 指定の工場・品番の過去出来高を取得
  async getproductSummary(factory: number,parts_no: string,date: string){
      const query = await this.productRepo
      .createQueryBuilder('m')
      .select(['SUM(m.production) AS total_production',
              'm.prod_date AS prod_date'
      ])
      .where('m.factory_type = :factory', {factory})
      .andWhere('m.prod_date >= :date',{date})
      .groupBy('m.prod_date')
      .orderBy('m.prod_date ')
      if(parts_no !=='all'){
        query.andWhere('m.parts_no = :parts_no',{parts_no})
      }
      const result = await query.getRawMany();
      return result;
  }

// 生産計画の最終更新日を取得
  async getLastUpdate_plan(type: number){
    // 鍛造
  if(type == 0){
    const query = await this.FPlanRepo
      .createQueryBuilder('m')
      .select('m.updated_at AS updated_at')
      .orderBy('m.updated_at','DESC')
      .take(1);
      const result = await query.getRawOne();
      return result;      
    }
  // 切削
  else if(type == 1){
    const query = await this.MPlanRepo
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
    const query = await this.ForgingRepo
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
    const query = await this.MachiningRepo
      .createQueryBuilder('m')
      .select('m.prod_date AS prod_date')
      .orderBy('m.prod_date','DESC')
      .where('m.factory_type = :factory',{factory})
      .take(1);
      const result = await query.getRawOne();
      return result;
    }

  }

  // 鍛造の生産計画取得
  // 鍛造は工場内全設備or対象設備で絞り込み
  async getForgingPlan(factory: number, parts_no: string, machine_name: string){
      // 工場内の全設備対象
      if(machine_name ==='all'){
        const query = await this.FPlanRepo
        .createQueryBuilder('m')
        .select(['m.day AS day',
                'SUM(m.target_prod) AS target_prod'
        ])
        .where('m.factory_type = :factory',{factory})
        .groupBy('m.day')
        .orderBy('m.day ');
        const result = await query.getRawMany();
        return result;
      }
      // 設備指定あり
      else{
        const query = await this.FPlanRepo
        .createQueryBuilder('m')
        .select(['m.day AS day',
                'SUM(m.target_prod) AS target_prod'
        ])
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.machine_name = :machine_name', {machine_name})
        .groupBy('m.day')
        .orderBy('m.day ');
        const result = await query.getRawMany();
        return result;

      }
      
  }

  // 鍛造の生産実績取得
  async getForgingProgress(factory: number, parts_no: string, machine_name: string, date: string){
    // 工場内の全設備対象
      if(machine_name ==='all'){
        const query = await this.ForgingRepo
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
        .orderBy('m.prod_date');
        const result = await query.getRawMany();
        return result;

      }
      // 設備指定あり
      else{
        const query = await this.ForgingRepo
        .createQueryBuilder('m')
        .select(['m.prod_date AS prod_date',
                'SUM(m.good_prod) AS good_prod',
                'SUM(m.waste_prod) AS waste_prod',
                'SUM(m.setup_prod) AS setup_prod',
                'SUM(m.inline_defect) AS inline_defect'
        ])
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.machine_name = :machine_name',{machine_name})
        .andWhere('m.prod_date >= :date',{date})
        .groupBy('m.prod_date')
        .orderBy('m.prod_date');
        const result = await query.getRawMany();
        return result;

      }

  }

  // 鍛造の工場全体の累積生産計画数を取得
  async getTotalForginPlan_factory(factory: number, day: number){
      const query = await this.FPlanRepo
      .createQueryBuilder('m')
        .select('SUM(m.target_prod) AS target_prod')
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.day < :day',{day});
        const result = await query.getRawOne();
        return Number(result?.target_prod ?? 0);

  }

  // 鍛造の工場全体の累積良品数を取得
  async getTotalForgingProgress_factory(factory: number, firstday: string, today: string){
      const query = await this.ForgingRepo
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
      const query = await this.FPlanRepo
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
      const query = await this.ForgingRepo
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
      // 工場内の全品番対象
      if(parts_no ==='all'){
        const query = await this.MPlanRepo
        .createQueryBuilder('m')
        .select(['SUM(m.target_prod) AS target_prod',
                 'SUM(m.total) AS total'
        ])
        .where('m.factory_type = :factory',{factory})
        const result = await query.getRawMany();
        return result;

      }
      // 品番指定あり
      else{
        const keyword = parts_no ?? ''; // 入力文字列
        const query = await this.MPlanRepo
        .createQueryBuilder('m')
        .select(['m.target_prod AS target_prod',
                 'm.total AS total'
        ])
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.parts_no LIKE :parts_no', {parts_no: `%${keyword}%` });
        const result = await query.getRawMany();
        return result;

      }
      
  }

  // 切削の生産実績取得
  async getMachiningProgress(factory: number, parts_no: string, line_no: string, date: string){
    // 工場内の全品番対象
      if(parts_no ==='all'){
        const query = await this.MachiningRepo
        .createQueryBuilder('m')
        .select(['m.prod_date AS prod_date',
                'SUM(m.good_prod) AS good_prod',
                'SUM(m.inline_defect) AS inline_defect',
                'SUM(m.visual_defect) AS visual_defect'
        ])
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.prod_date >= :date',{date})
        .andWhere('m.line_no NOT LIKE :underbarZero',{underbarZero:'%\\_0'})
        .andWhere('m.machine_name != :name',{name:'N100'})
        .groupBy('m.prod_date')
        .orderBy('m.prod_date');
        const result = await query.getRawMany();
        return result;

      }
      // 品番のみ指定あり
      else if(line_no === 'all'){
        const keyword = parts_no ?? ''; // 入力文字列
        const query = await this.MachiningRepo
        .createQueryBuilder('m')
        .select(['m.prod_date AS prod_date',
                'SUM(m.good_prod) AS good_prod',
                'SUM(m.inline_defect) AS inline_defect',
                'SUM(m.visual_defect) AS visual_defect'
        ])
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.parts_no LIKE :parts_no', {parts_no: `%${keyword}%` })
        .andWhere('m.prod_date >= :date',{date})
        .andWhere('m.line_no NOT LIKE :underbarZero',{underbarZero:'%\\_0'})
        .andWhere('m.machine_name != :name',{name:'N100'})
        .groupBy('m.prod_date')
        .orderBy('m.prod_date');
        const result = await query.getRawMany();
        return result;

      }
      // 品番・設備指定あり
      else{
        const keyword = parts_no ?? ''; // 入力文字列
        const query = await this.MachiningRepo
        .createQueryBuilder('m')
        .select(['m.prod_date AS prod_date',
                'm.good_prod AS good_prod',
                'm.inline_defect AS inline_defect',
                'm.visual_defect AS visual_defect'
        ])
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.parts_no LIKE :parts_no', {parts_no: `%${keyword}%` })
        .andWhere('m.line_no = :line_no',{line_no})
        .andWhere('m.prod_date >= :date',{date})
        .andWhere('m.line_no NOT LIKE :underbarZero',{underbarZero:'%\\_0'})
        .groupBy('m.prod_date')
        .orderBy('m.prod_date');
        const result = await query.getRawMany();
        return result;

      }

  }

  // 切削の工場全体の累積生産計画数を取得
  async getTotalMachiningPlan_factory(factory: number){
      const query = await this.MPlanRepo
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
      const query = await this.MachiningRepo
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
      const query = await this.MPlanRepo
      .createQueryBuilder('m')
        .select(['SUM(m.target_prod) AS target_prod',
                 'SUM(m.total) AS total'
        ])
        .where('m.factory_type = :factory',{factory})
        if(parts_no !== 'all'){
          query.andWhere('m.parts_no LIKE :parts_no', {parts_no: `%${keyword}%` })
        }
        const result = await query.getRawMany();
        return result;

  }

  // フィルタリングした切削の累積生産数を取得
  async getTotalMachiningProgress_filter(factory: number,parts_no: string,line_no: string, firstday: string, today: string){
      const keyword = parts_no ?? ''; // 入力文字列
      const query = await this.MachiningRepo
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
        const result = await query.getRawMany();
        return result;

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
        const result = await query2.getRawMany();
        return result
      
  }

}