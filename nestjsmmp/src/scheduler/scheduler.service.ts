import { Injectable } from "@nestjs/common";
import { EntityManager, In, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { PartsMachines } from "./models/parts-machines.entity";
import { MachiningTool } from "./models/machining-tool-progress.entity";

@Injectable()
export class SchedulerService {
    constructor(
        private entityManager: EntityManager,
        @InjectRepository(PartsMachines)
        private readonly PartsMachinesRepo: Repository<PartsMachines>,
        @InjectRepository(MachiningTool)
        private readonly MachiningToolRepo: Repository<MachiningTool>
    ){}

    // 工場内の品名、ラインNo一覧を取得
    async getLineNoSummary(factory:number){
        const query = await this.PartsMachinesRepo
        .createQueryBuilder('m')
        .select(['m.parts_name AS parts_name',
                 'm.line_no AS line_no',
                 'm.header_machine AS header_machine',
                 'm.footer_machine AS footer_machine'
        ])
        .where('m.factory_type = :factory', {factory});
        const result = await query.getRawMany();
        return result;
    }

    // 該当ラインの末端機器番号を取得
    async getFooterMachine(factory:number,header:number){
        const query = await this.PartsMachinesRepo
        .createQueryBuilder('m')
        .select(['m.header_machine AS header_machine',
                 'm.footer_machine AS footer_machine'
        ])
        .where('m.factory_type = :factory', {factory})
        .andWhere('m.header_machine = :header', {header});
        const result = await query.getRawOne();
        return result;
    }

    // 該当ラインの刃具交換までの残り時間を取得
    async getMinutesLeft(factory:number,header:number,footer:number){
        const query = await this.MachiningToolRepo
        .createQueryBuilder('m')
        .select(['m.machine_no AS machine_no',
                 'm.op AS op',
                 'm.side AS side',
                 'm.tool_no AS tool_no',
                 'm.minutes_left AS minutes_left'
        ])
        .where('m.factory_type = :factory', {factory})
        .andWhere('m.machine_no >= :header', {header})
        .andWhere('m.machine_no <= :footer', {footer})
        .andWhere('m.minutes_left <= 360');
        const result = await query.getRawMany();
        return result;
    }

}