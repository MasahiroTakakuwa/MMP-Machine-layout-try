import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ForgingProductPlan } from "./models/forging-product-plan.entity";
import { MachiningProductPlan } from "./models/machining-product-plan";
import { PlanController } from "./plan.controller";
import { PlanService } from "./plan.service";
import { Formar } from "./models/factory-formar.entity";

@Module({
    imports: [TypeOrmModule.forFeature([ForgingProductPlan]),
              TypeOrmModule.forFeature([MachiningProductPlan]),
              TypeOrmModule.forFeature([Formar])],
    controllers: [PlanController],
    providers: [PlanService],
})
export class PlanModule {}