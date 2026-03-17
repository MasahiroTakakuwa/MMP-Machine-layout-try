import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Devices } from "./models/devices.entity";
import { PartsMachines } from "./models/parts-machines.entity";
import { ToolChangeLog } from "./models/tool-change-log.entity";
import { EntityManager,Repository } from "typeorm";

@Injectable()
export class ToolChangeService {
    constructor(
        private entityManager: EntityManager,
        @InjectRepository(Devices)
        private readonly deviceRepo: Repository<Devices>,
        @InjectRepository(PartsMachines)
        private readonly PartsMachinesRepo: Repository<PartsMachines>,
        @InjectRepository(ToolChangeLog)
        private readonly ToolChangeRepo: Repository<ToolChangeLog>
    ){}

    async getPartsList(factory:number){
        const query = await this.PartsMachinesRepo
        .createQueryBuilder('m')
        .select(['m.parts_no AS parts_no',
                 'm.parts_name AS parts_name'
        ])
        .where('m.factory_type = :factory', {factory})
        .groupBy('m.parts_name');
        const results = await query.getRawMany();
        return results;
    
    }

    async getLineNo(factory:number,parts_name:string){
        const query = await this.PartsMachinesRepo
        .createQueryBuilder('m')
        .select('m.line_no AS line_no')
        .where('m.factory_type = :factory', {factory})
        .andWhere('m.parts_name = :parts_name', {parts_name});
        const results = await query.getRawMany();
        return results;

    }

    async getMachineAddress(factory:number,parts_name:string,line_no:string){
        const query = await this.PartsMachinesRepo
        .createQueryBuilder('m')
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.parts_name = :parts_name',{parts_name})
        if(line_no === 'all'){
            query.select(['MIN(m.header_machine AS header_machine',
                          'MAX(m.footer_machine) AS footer_machine',
                        ]);
        }
        else{
            query.andWhere('m.line_no = :line_no',{ line_no })
            .select(['m.header_machine AS header_machine',
                     'm.footer_machine AS footer_machine',
                    ]);
        }
        const result = await query.getRawOne();
        return result;

    }

    async updateToolDetail(factory:number){
        
    }
}