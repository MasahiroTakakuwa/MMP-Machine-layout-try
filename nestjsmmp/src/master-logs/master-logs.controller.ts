import { AuthGuard } from './../userManagement/auth/auth.guard';
import { AuthService } from '../userManagement/auth/auth.service';
import { UserService } from '../userManagement/user/user.service';
import { Controller, Get, Req, UseInterceptors, ClassSerializerInterceptor, Param, UseGuards } from '@nestjs/common';
import { LogsService } from './master-logs.service';
import { Request } from 'express';

@UseInterceptors(ClassSerializerInterceptor)
//@UseGuards(AuthGuard)
@Controller('logs')
export class LogsController {
    constructor( 
        private logsService: LogsService,
        private userService: UserService,
        private authService: AuthService
        ){
    }

    @Get()
    async getAll() {
        return this.logsService.find_all_logs();
    }
    
    @Get('logs-user')
    async getLogsUser(@Req() request: Request) {

        const id = await this.authService.userId(request)
        let user = await this.userService.findOne(id);
        return this.logsService.find_user_logs(user.user_name);
    }

    @Get('logs-incident/:incidentId')
    async getLogsIncident(
            @Param('incidentId') incidentId: number,
        ) {
        return this.logsService.find_incident_logs(incidentId);
    }
}
