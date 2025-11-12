import { Injectable } from "@nestjs/common";
import { EntityManager, In, Repository } from "typeorm";
import { Devices } from "./models/devices.entity";
import { ProductHistory } from "./models/product-history.entity";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class KpiService {
  constructor(
    private entityManager: EntityManager,
    @InjectRepository(Devices)
    private readonly deviceRepo: Repository<Devices>,
    @InjectRepository(ProductHistory)
    private readonly productRepo: Repository<ProductHistory>
  ){}

// 指定された工場の品番一覧を取得する
async getPartsNoSummary(factory: number) {
    //  工場ごとの品番を取得する　※factory=0の場合は全工場として処理する(Jupiter除く?)
    const query = await this.deviceRepo
      .createQueryBuilder('m')
      .select('m.parts_no AS parts_no')
      .groupBy('m.parts_no')
    if(Number(factory) !== 0) {
      query.where('m.factory_type = :factory', {factory});
    }
    
    const result = await query.getRawMany();
    return result;
  }

// 指定された工場・品番のラインNoを取得
// 条件分岐:fac
async getLineNoSummary(factory: number,parts_no: string){
    const query = await this.deviceRepo
    .createQueryBuilder('m')
    .select(['m.line_no AS line_no',
             'm.machine_no AS machine_no'
    ])
    .where('m.factory_type = :factory', {factory})
    .andWhere('m.device_type = 40 ')
    .orderBy('m.line_no ')
    if(parts_no ==='0'){
      query.andWhere("m.parts_no = '-'")
    }
    else if(parts_no ==='all'){
      query.andWhere("m.parts_no != '-'")
    }
    else{
      query.andWhere('m.parts_no = :parts_no',{parts_no})
    }
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

}