import { Department } from './../entities/departments.entity';
import { AuthGuard } from './../auth/auth.guard';
import { HasPermission } from './../permission/has-permission.decorator';
import { UpdateDepartmentDto } from './models/update-department.dto';
import { CreateDepartmentDto } from './models/create-department.dto';
import { DepartmentService } from './department.service';
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';


@Controller('departments')
export class DepartmentController {
    constructor (
            private departmentService: DepartmentService
        ){}

    // Tạo mới một bộ phận
    // Create a new department
    @Post()
    @HasPermission(6)
    //@UseGuards(AuthGuard)
    async create(@Body() dto: CreateDepartmentDto, @Req() request: Request): Promise<Department> {
        return this.departmentService.createDepartment(dto, request);
    }

    // Lấy tất cả các bộ phận
    // Get all departments
    @Get()
    findAll(): Promise<Department[]> {
        return this.departmentService.findAll();
    }

    //Lấy bộ phận theo id
    @Get(':id')
    findOne(@Param('id') id: string): Promise<Department> {
        return this.departmentService.findOne(+id);
    }

    //cập nhật bộ phận theo id
    // Update department by id
    @Put(':id')
    @HasPermission(6)
    //@UseGuards(AuthGuard)
    update(
        @Param('id') id: string,
        @Body() dto: UpdateDepartmentDto,
        @Req() request: Request,
    ):Promise<Department> {
        return this.departmentService.updateDepartment(+id, dto, request);
    }
    
    //Xoá bộ phận theo id
    // Delete department by id
    @Delete(':id')
    @HasPermission(6)
    //@UseGuards(AuthGuard)
    remove(@Param('id') id: string, @Req() request: Request) {
        return this.departmentService.deleteDepartment(+id, request);
    }

}
