import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachineStatusHistory } from './models/machine-status-history.entity';
import { MachineController } from './machine.controller';
import { MachineService } from './machine.service';
import { AuthModule } from 'src/userManagement/auth/auth.module';
import { CommonModule } from 'src/userManagement/common/common.module';

@Module({
    imports: [
        // ==========================================================================
        TypeOrmModule.forFeature([MachineStatusHistory]), // register entity together with name of config of second database SQL server
        AuthModule,CommonModule
    
    ],
    // ============================================================================
    // 🎮 Controller điều khiển API
    //    APIルーティングを制御するコントローラー
    // ============================================================================
    controllers: [MachineController],

    // ============================================================================
    // ⚙️ Service chứa logic xử lý nghiệp vụ
    //    業務ロジックを含むサービス
    // ============================================================================
    providers: [MachineService],
})
export class MachineModule {}
