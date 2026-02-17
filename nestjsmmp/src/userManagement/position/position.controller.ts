import { Position } from './../entities/position.entity';
import { UpdatePositionDto } from './models/update-position.dto';
import { CreatePositionDto } from './models/create-position.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PositionService } from './position.service';
import { HasPermission } from '../permission/has-permission.decorator';
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';


@Controller('positions')
export class PositionController {
    constructor (
            private positionService: PositionService
        ){}

    // Tạo mới một bộ phận
    // Create a new department
    @Post()
    @HasPermission(10)
    //@UseGuards(AuthGuard)
    async create(@Body() dto: CreatePositionDto, @Req() request: Request):Promise<Position> {
        return this.positionService.createPosition(dto, request);
    }
        
    //Lấy tất cả các bộ phận
    // Get all departments
    @Get()
    findAll(): Promise<Position[]> {
        return this.positionService.findAll();
    }

    //Lấy bộ phận theo id
    // Get department by id
    @Get(':id')
    findOne(@Param('id') id: string): Promise<Position> {
        return this.positionService.findOne(+id);
    }

    //update a department by id
    @Put(':id')
    @HasPermission(10)
    //@UseGuards(AuthGuard)
    async update(@Param('id') id: string, @Body() dto: UpdatePositionDto, @Req() request: Request): Promise<Position> {
        return this.positionService.updatePosition(+id, dto, request);
    }
    
    //Delete a department by id
    @Delete(':id')
    @HasPermission(10)
    //@UseGuards(AuthGuard)
    async remove(@Param('id') id: string, @Req() request: Request) {
        return this.positionService.deletePosition(+id, request);
    }

}
