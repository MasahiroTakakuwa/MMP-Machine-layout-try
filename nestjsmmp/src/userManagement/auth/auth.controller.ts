import { CreateUserDto } from './../user/models/create-user.dto';

import { UserService } from './../user/user.service';
import { Body, Controller, Post, Res, Get, Req, UseInterceptors, ClassSerializerInterceptor, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from './auth.guard';
import { User } from '../entities/users.entity';
import { LoginDto } from './models/login.dto';

@UseInterceptors(ClassSerializerInterceptor)
@Controller()
export class AuthController {
    constructor(
        private userService: UserService,
        ) {
    }

    // Register a user
    @Post('register')
    async register(
            @Body() body: CreateUserDto
        ): Promise<User> {
        return this.userService.createUser(body);
    }

    //Login with user
    @Post('login')
    async login(
        @Body() body: LoginDto,
        @Res({ passthrough: true }) response: Response,
        @Req() request: Request
    ): Promise<User> {
        // Ensure loginUser returns a single User, not an array
        return this.userService.loginUser(body, response, request);
    }

    //Get info user by token
    @UseGuards(AuthGuard)
    @Get('user')
    async user(@Req() request: Request){
        return this.userService.findOneRequest(request);
    }


    //Logout
    // @UseGuards(AuthGuard)
    @Post('logout')
    async logout(
        @Res({passthrough:true}) response: Response,
        @Req() request: Request
    ){
        return this.userService.logoutUser(response, request);
    }

    //REfresh token
    @Post('refresh')
    async refreshToken(
        @Res({passthrough:true}) response: Response,
        @Req() request: Request
    ){
        return this.userService.refreshTokens(response, request);
    }
}
