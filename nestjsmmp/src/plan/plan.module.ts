import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ForgingProductPlan } from "./models/forging-product-plan.entity";
import { ForgingPastPlan } from "./models/forging-product-plan-history.entity";
import { MachiningProductPlan } from "./models/machining-product-plan.entity";
import { MachiningPastPlan } from "./models/machining-product-plan-history.entity";
import { PlanController } from "./plan.controller";
import { PlanService } from "./plan.service";
import { Formar } from "./models/factory-formar.entity";

@Module({
    imports: [TypeOrmModule.forFeature([ForgingProductPlan]),
              TypeOrmModule.forFeature([ForgingPastPlan]),
              TypeOrmModule.forFeature([MachiningProductPlan]),
              TypeOrmModule.forFeature([MachiningPastPlan]),
              TypeOrmModule.forFeature([Formar])],
    controllers: [PlanController],
    providers: [PlanService],
})
export class PlanModule {}