import { AuthGuard } from './../auth/auth.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { HasPermission } from './has-permission.decorator';

//@UseGuards(AuthGuard)
@Controller('permissions')
export class PermissionController {
    constructor(private permissionService : PermissionService){
    }

    //Get all permissions
    @Get()
    @HasPermission(7)
    async all() {
        return this.permissionService.all();
    }
}
