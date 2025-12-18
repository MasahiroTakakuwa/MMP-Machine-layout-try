import { Injectable } from "@nestjs/common";
import { EntityManager, In, Repository } from "typeorm";
import { Devices } from "./models/devices.entity";
import { ProductHistory } from "./models/product-history.entity";
import { MachiningKpi } from "./models/machining-kpi.entity";
import { ForgingKpi } from "./models/forging-kpi.entity";
import { MachiningPlan } from "./models/machining-product-plan.entity";
import { ForgingPlan } from "./models/forging-product-plan.entity";
import { InjectRepository } from "@nestjs/typeorm";
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
  ){}

  // 指定された工場・加工方法の品番一覧を取得
  async getPartsNoSummary_type(factory: number,type: number){
  // 鍛造
  if(type == 0){
    //console.log(`forging`);
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
    //console.log(`machining`);
    const query = await this.MachiningRepo
      .createQueryBuilder('m')
      .select('m.parts_no AS parts_no')
      .groupBy('m.parts_no')
      .where('m.factory_type = :factory', {factory});
      const result = await query.getRawMany();
      return result;
  }
  
}

  async getLineNoSummary_type(factory: number,parts_no: string, type: number){
    // 鍛造
  if(type == 0){
    const query = await this.ForgingRepo
      .createQueryBuilder('m')
      .select('m.machine_name AS machine_name')
      .groupBy('m.machine_name')
      .where('m.factory_type = :factory', {factory});
      // .andWhere('m.parts_no = :parts_no',{parts_no});
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
      .andWhere('m.parts_no = :parts_no',{parts_no});
      const result = await query.getRawMany();
      return result;
    
    }

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

// 鍛造の生産計画取得
async getForgingPlan(factory: number, parts_no: string, machine_name: string){
    // 工場内の全品番対象
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
    // 品番・設備指定あり
    else{
      const query = await this.FPlanRepo
      .createQueryBuilder('m')
      .select(['m.day AS day',
              'm.target_prod AS target_prod'
      ])
      .where('m.factory_type = :factory',{factory})
      .andWhere('m.parts_no = :parts_no', {parts_no})
      .orderBy('m.day ');
      const result = await query.getRawMany();
      return result;

    }
    
  }

// 鍛造の生産実績取得
async getForgingProgress(factory: number, parts_no: string, machine_name: string, date: string){
  // 工場内の全品番対象
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
    // 品番・設備指定あり
    else{
      const query = await this.ForgingRepo
      .createQueryBuilder('m')
      .select(['m.prod_date AS prod_date',
              'm.good_prod AS good_prod',
              'm.waste_prod AS waste_prod',
              'm.setup_prod AS setup_prod',
              'm.inline_defect AS inline_defect'
      ])
      .where('m.factory_type = :factory',{factory})
      .andWhere('m.parts_no = :parts_no',{parts_no})
      .andWhere('m.prod_date >= :date',{date})
      .groupBy('m.prod_date')
      .orderBy('m.prod_date');
      const result = await query.getRawMany();
      return result;

    }

}

// 切削の生産計画取得
async getMachiningPlan(factory: number, parts_no: string, line_no: string){
    // 工場内の全品番対象
    if(parts_no ==='all'){
      const query = await this.MPlanRepo
      .createQueryBuilder('m')
      .select('SUM(m.target_prod) AS target_prod')
      .where('m.factory_type = :factory',{factory})
      const result = await query.getRawMany();
      return result;

    }
    // 品番指定あり
    else{
      const keyword = parts_no ?? ''; // 入力文字列
      const query = await this.MPlanRepo
      .createQueryBuilder('m')
      .select('m.target_prod AS target_prod')
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
      //.andWhere('m.line_no = :line_no',{line_no})
      .andWhere('m.prod_date >= :date',{date})
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
      .groupBy('m.prod_date')
      .orderBy('m.prod_date');
      const result = await query.getRawMany();
      return result;

    }

}


}