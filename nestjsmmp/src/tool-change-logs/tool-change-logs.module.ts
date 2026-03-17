import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommonModule } from "src/userManagement/common/common.module";
import { ToolChangeController } from "./tool-change-logs.controller";
import { ToolChangeService } from "./tool-change-logs.service";
import { Devices } from "./models/devices.entity";
import { PartsMachines } from "./models/parts-machines.entity";
import { ToolChangeLog } from "./models/tool-change-log.entity";

@Module({
    imports:[TypeOrmModule.forFeature([Devices]),TypeOrmModule.forFeature([PartsMachines]),TypeOrmModule.forFeature([ToolChangeLog]),CommonModule],
    controllers:[ToolChangeController],
    providers:[ToolChangeService],
})
export class ToolChangeLogsModule {
    
}