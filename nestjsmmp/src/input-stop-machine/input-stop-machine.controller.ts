import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { InputStopMachineService } from './input-stop-machine.service';
import { SaveScheduleStopMachineDto } from './models/save-schedule-stop-machine.dto';
import { AuthGuard } from 'src/userManagement/auth/auth.guard';
import { HasPermission } from 'src/userManagement/permission/has-permission.decorator';

//@UseGuards(AuthGuard) //Khiên bắt đăng nhập, khi đặt ở đây sẽ áp dụng cho tất cả api trong file này
@Controller('input-stop-machine')
export class InputStopMachineController {
    constructor(
        private inputStopMachineService: InputStopMachineService
    ){}

    //api to save schedule stop machine
    @HasPermission(11) //khiên bắt quyền số 11, chỉ áp dụng cho api này
    @Post('save-status-machine')
    async saveStatusMachine(@Body() body: SaveScheduleStopMachineDto){ //SaveScheduleStopMachineDto is used to validate data come in
        return this.inputStopMachineService.saveScheduleStopMachine(body)
    }

    //api to set Run status of machine
    @HasPermission(11) //khiên bắt quyền số 11, chỉ áp dụng cho api này
    @Put('run-machine/:id')
    async runMachine(@Param('id') id: number){
        return this.inputStopMachineService.runMachine(id)
    }

    //api to get schedule history
    @Get('history/:id')
    async getHistoryStopMachine(@Param('id') id: number){
        return this.inputStopMachineService.getHistoryStopMachine(id)
    }
}
