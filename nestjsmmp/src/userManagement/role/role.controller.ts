import { UpdateRoleDto } from './models/update-role.dto';
import { CreateRoleDto } from './models/create-role.dto';
import { Role } from './../entities/role.entity';
import { AuthGuard } from './../auth/auth.guard';
import { HasPermission } from './../permission/has-permission.decorator';
import { RoleService } from './role.service';
import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
@Controller('roles')
export class RoleController {

    constructor( 
            private roleService: RoleService,
        ){

    }

    // Tạo mới một vai trò và danh sách quyền
    // Create a new role and list of permissions
    @Post()
    @HasPermission(4)
    //@UseGuards(AuthGuard)
    async create(@Body() dto: CreateRoleDto, @Req() request: Request) {
        return this.roleService.createRole(dto, request);
    }

    //Lấy tất cả các vai trò và quyền
    // Get all roles and permissions
    @Get()
    async findAll():Promise<Role[]> {
        return this.roleService.findAll();
    }
        
    // Lấy vai trò theo id
    // Get role by id
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.roleService.findOne(+id);
    }

    // Update a role by id
    @Put(':id')
    @HasPermission(4)
    //@UseGuards(AuthGuard)
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateRoleDto,
        @Req() request: Request,
    ) {
        return this.roleService.updateRole(+id, dto, request);
    }
    
    // Delete a role by id
    @Delete(':id')
    @HasPermission(4)
    //@UseGuards(AuthGuard)
    async remove(@Param('id') id: string, @Req() request: Request) {
        return this.roleService.deleteRole(+id, request);
    }
}
