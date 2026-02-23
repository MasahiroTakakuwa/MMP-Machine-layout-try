import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommonModule } from "src/userManagement/common/common.module";
import { SchedulerController } from "./scheduler.controller";
import { SchedulerService } from "./scheduler.service";
import { PartsMachines } from "./models/parts-machines.entity";
import { MachiningTool } from "./models/machining-tool-progress.entity";

@Module({
    imports:[TypeOrmModule.forFeature([PartsMachines]),TypeOrmModule.forFeature([MachiningTool]),CommonModule],
    controllers:[SchedulerController],
    providers:[SchedulerService],
})
export class SchedulerModule {
    
}