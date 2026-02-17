import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Devices } from "./models/devices.entity";
import { ProductHistory } from "./models/product-history.entity";
import { MachiningKpi } from "./models/machining-kpi.entity";
import { ForgingKpi } from "./models/forging-kpi.entity";
import { MachiningPlan } from "./models/machining-product-plan.entity";
import { ForgingPlan } from "./models/forging-product-plan.entity";
import { KpiController } from "./kpi.controller";
import { KpiService } from "./kpi.service";
import { MachineStatusHistory } from "./models/machine-status-history.entity";
import { AuthModule } from "src/userManagement/auth/auth.module";
import { CommonModule } from "src/userManagement/common/common.module";
import { Parts } from "./models/parts.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Devices]),TypeOrmModule.forFeature([ProductHistory]),
              TypeOrmModule.forFeature([MachiningKpi]),TypeOrmModule.forFeature([ForgingKpi]),
              TypeOrmModule.forFeature([MachiningPlan]),TypeOrmModule.forFeature([ForgingPlan]),
              TypeOrmModule.forFeature([MachineStatusHistory]),TypeOrmModule.forFeature([Parts]),
              AuthModule,CommonModule],
    controllers: [KpiController],
    providers: [KpiService],
})
export class KpiModule {
    
}