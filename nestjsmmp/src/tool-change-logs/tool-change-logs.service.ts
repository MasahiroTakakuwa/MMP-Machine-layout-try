import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Devices } from "./models/devices.entity";
import { PartsMachines } from "./models/parts-machines.entity";
import { ToolChangeLog } from "./models/tool-change-log.entity";
import { EntityManager,Repository } from "typeorm";

@Injectable()
export class ToolChangeService {
    constructor(
        private entityManager: EntityManager,
        private readonly datasource: DataSource,
        @InjectRepository(Devices)
        private readonly deviceRepo: Repository<Devices>,
        @InjectRepository(PartsMachines)
        private readonly PartsMachinesRepo: Repository<PartsMachines>,
        @InjectRepository(ToolChangeLog)
        private readonly ToolChangeRepo: Repository<ToolChangeLog>
    ){}

    // 工場内で生産している品番・品名を取得
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

    // 該当する製品のラインNoを取得
    async getLineNo(factory:number,parts_name:string){
        const query = await this.PartsMachinesRepo
        .createQueryBuilder('m')
        .select('m.line_no AS line_no')
        .where('m.factory_type = :factory', {factory})
        .andWhere('m.parts_name = :parts_name', {parts_name});
        const results = await query.getRawMany();
        return results;

    }

    // 機器番号の一覧を取得
    async getMachineAddress(factory:number,parts_name:string,line_no:string){
        const query = await this.PartsMachinesRepo
        .createQueryBuilder('m')
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.parts_name = :parts_name',{parts_name})
        if(line_no === 'all'){
            query.select(['MIN(m.header_machine) AS header_machine',
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

    // 該当ラインの刃具交換履歴を取得(短命のみ取得切り替えあり)
    async searchToolChangeLogs(factory:number,parts_name:string,line_no:string,start:string,end:string,isCheck:boolean){
        const blank = '';
        const {header_machine,footer_machine} = await this.getMachineAddress(factory,parts_name,line_no);
        const query = await this.ToolChangeRepo
        .createQueryBuilder('m')
        .select(['m.id AS id',
                 'm.line_name AS line_name',
                 'm.side AS side',
                 'm.tool_no AS tool_no',
                 'm.setting_value AS setting_value',
                 'm.changed_value AS changed_value',
                 'm.cause AS cause',
                 'm.updated_at AS updated_at'
        ])
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.machine_no BETWEEN :header AND :footer',{header: header_machine,footer: footer_machine,})
        .andWhere('m.updated_at BETWEEN :start AND :end',{start: start,end:end},)
        .orderBy('m.updated_at')
        // 全品番指定は無いと判断しコメントアウト
        // if(parts_name !== '全品番'){
        //     const {header_machine,footer_machine} = await this.getMachineAddress(factory,parts_name,line_no);
        //     query.andWhere('m.machine_no BETWEEN :header AND :footer',{header: header_machine,footer: footer_machine,})
        // }
        // if(start !== '' && end !== ''){
        //     query.andWhere('m.updated_at BETWEEN :start AND :end',{start: start,end:end},)
        // }
        // else if(end === ''){
        //     query.andWhere('m.updated_at >= :start',{start})
        // }
        if(isCheck === true){
            query.andWhere('m.changed_value < m.setting_value * 0.8')
            query.andWhere('m.cause = :blank',{blank})
        }
        const results = await query.getRawMany();
        return results;

    }

    // 指定の日時から取得件数を絞って命数取得(チャートグラフ用にツールNo.も指定)
    async getToolChangeRate(factory:number,parts_name:string,line_no:string,tool_no:string,start:string,end:string){
        const {header_machine,footer_machine} = await this.getMachineAddress(factory,parts_name,line_no);
        const query = await this.ToolChangeRepo
        .createQueryBuilder('m')
        .select(['m.id AS id',
                 'm.line_name AS line_name',
                 'm.side AS side',
                 'm.tool_no AS tool_no',
                 'm.setting_value AS setting_value',
                 'm.changed_value AS changed_value',
                 'm.updated_at AS updated_at'
        ])
        .where('m.factory_type = :factory',{factory})
        .andWhere('m.machine_no BETWEEN :header AND :footer',{header: header_machine,footer: footer_machine,})
        .andWhere('m.tool_no = :tool_no',{tool_no})
        .andWhere('m.updated_at BETWEEN :start AND :end',{start: start,end:end},)
        // .andWhere('m.updated_at >= :start',{start})
        // .andWhere('m.updated_at <= :end',{end})
        .orderBy('m.updated_at')
        .take(300)
        // if(end !==''){
        //     query.andWhere('m.updated_at <= :end',{end})
        // }
        const results = await query.getRawMany();
        return results;

    }

    // Updateクエリ
    // 刃具交換した設備の詳細データを更新
    async updateToolDetail(factory:number): Promise<number> {
        const sql = `
            UPDATE tool_change_log AS m
            JOIN devices AS b ON b.machine_no = m.machine_no
            SET m.line_name = b.line_detail
            WHERE m.line_name IS NULL
            AND m.factory_type = ?;
        `;
        const result: any = await this.datasource.query(sql, [factory]);
        return result?.affectedRows ?? 0;
        
    }

    // GEN4設備の設備Noデータを軸データの列に上書き
    async updateGenMachineNo(): Promise<number> {
        const sql = `
            UPDATE tool_change_log AS m
            JOIN devices AS b ON b.machine_no = m.machine_no
            SET m.side = b.line_no
            WHERE m.side = '-'
            AND m.machine_no BETWEEN 2201 AND 2233;
        `;
        const result: any = await this.datasource.query(sql);
        return result?.affectedRows ?? 0;
        
    }

    // 定期交換のログを更新
    async updateRegularToolChange(factory:number): Promise<number> {
        const sql = `
            UPDATE tool_change_log AS m
            SET m.cause = '定期交換'
            WHERE m.factory_type = ?
            AND   5 * m.changed_value >= 4 * m.setting_value
            AND  (m.cause IS NULL OR m.cause = '')
        `;
        const result: any = await this.datasource.query(sql, [factory]);
        return result?.affectedRows ?? 0;
    }

    // 短命交換の理由を一括更新
    async updateCauseBulk(rows: any[]): Promise<number> {
        let affected = 0;
        for(const row of rows){
            const sql = `
            UPDATE tool_change_log AS m
            SET m.cause = ?
            WHERE m.id = ?
        `;
        
        const result: any = await this.datasource.query(sql, [
            row.cause,
            row.id,
        ]);
        affected += result.affectedRows ?? 0;
        }
        return affected;

    }

}