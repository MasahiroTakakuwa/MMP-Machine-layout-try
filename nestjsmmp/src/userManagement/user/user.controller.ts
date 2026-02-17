import { ChangePasswordrDto } from './models/change-password.dto';
import { HasPermission } from './../permission/has-permission.decorator';
import { AuthService } from './../auth/auth.service';
import { AuthGuard } from './../auth/auth.guard';
import { User } from '../entities/users.entity';
import { UserService } from './user.service';
import { Controller, Get, Post, Body, UseInterceptors, ClassSerializerInterceptor, UseGuards, Param, Put, Delete, Req } from '@nestjs/common';
import { Request } from 'express';
import { UpdateUserDto } from './models/update-user.dto';

@UseInterceptors(ClassSerializerInterceptor)
//@UseGuards(AuthGuard)
@Controller('users')
export class UserController {

    constructor(
        private userService : UserService,
        private authService : AuthService
        ){

    }

    //Get all users
    @Get()
    @HasPermission(1)
    async getAll(){
        return await this.userService.findAll();
    }

    // Get users by id
    @Get(':id')
    @HasPermission(1)
    async get(@Param('id') id: number) {
        return this.userService.findOne(id);
    }

    // update info user in profile
    @Put('change-info/:id')
    @HasPermission(2)
    async updateInfo(
        @Param('id') id: number,
        @Body() body: UpdateUserDto,
        @Req() request: Request
    ): Promise<User>{
        return await this.userService.updateUser(id, body, request);
    } 

    // update pw user in profile
    @Put('change-password/:id')
    async changePassword(
        @Param('id') id: number,
        @Body() body: ChangePasswordrDto,
        @Req() request: Request
    ): Promise<User>{
        return this.userService.changePassword(id, body, request)
    } 

    
    // Delete user by id
    @Delete(':id')
    @HasPermission(2)
    async delete(
            @Param('id') id: number,
            @Req() request: Request
        ) {
        return await this.userService.remove(id, request);
    }


}
