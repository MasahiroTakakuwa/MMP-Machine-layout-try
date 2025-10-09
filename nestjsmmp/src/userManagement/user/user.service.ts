import { ConfigService } from '@nestjs/config';
import { UpdateUserDto } from './models/update-user.dto';
import { Role } from './../entities/role.entity';
import { Position } from './../entities/position.entity';
import { Department } from './../entities/departments.entity';
import { CreateUserDto } from './models/create-user.dto';
import { LogsService } from './../../master-logs/master-logs.service';
import { PaginatedResult } from './../common/paginated-result.interface';
import { AbstractService } from '../common/abstract.service';
import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException, UnprocessableEntityException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/users.entity';
import { In, Raw, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { UserToken } from '../entities/user-tokens.entity';
import { ChangePasswordrDto } from './models/change-password.dto';
@Injectable()
export class UserService extends AbstractService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
        @InjectRepository(Position) private readonly positionRepository: Repository<Position>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
        @InjectRepository(UserToken) private readonly userTokenRepository: Repository<UserToken>,
        private jwtService: JwtService,
        private authService: AuthService,
        private logsService: LogsService,
        private configService : ConfigService
    ){
        super(userRepository);
        
    }
    

    async paginate(page = 1, relations = []): Promise<PaginatedResult> {

        const {data, meta} = await super.paginate(page, relations);

        return {
            data: data.map( user => {
                const {password, ...data} = user;
                return data;
            }),
            meta
        }
    }

    // EN: Create a new user. Validate password, hash it, and save user with relations.
    // JP: 新しいユーザーを作成します。パスワードを検証し、ハッシュ化し、リレーション付きで保存します。
    async createUser(dto: CreateUserDto): Promise<User> {
        try {
            // EN: Password must be at least 6 characters
            // JP: パスワードは6文字以上である必要があります
            if(dto.password.length < 6){
                throw new UnprocessableEntityException('Password must be at least 6 characters long', { cause: new Error(), description: 'Password must be at least 6 characters long' });
            }

            // EN: Check if password matches confirmation
            // JP: 確認用パスワードと一致するかチェックします
            if(dto.password !== dto.password_confirm){
                throw new UnprocessableEntityException('Password confirmation does not match', { cause: new Error(), description: 'Password confirmation does not match' });
            }

            // EN: Hash password with bcrypt
            // JP: bcryptでパスワードをハッシュ化します
            dto.password = await bcrypt.hash(dto.password, 12);
            dto.password_confirm = dto.password;
            dto.status = 'inactive';

            // EN: Fetch relations (department, position, roles) from DB if provided
            // JP: 部署・役職・ロールを指定されている場合はDBから取得します
            const department = dto.departmentId
                ? await this.departmentRepository.findOne({ where: { id: dto.departmentId } })
                : null;

            const position = dto.positionId
                ? await this.positionRepository.findOne({ where: { id: dto.positionId } })
                : null;

            const roles = dto.roleIds?.length
                ? await this.roleRepository.find({ where: { id: In(dto.roleIds) } })
                : [];

            // EN: Create user entity and save
            // JP: ユーザーエンティティを作成して保存します
            const newUser = this.userRepository.create({
                user_name: dto.user_name,
                first_name: dto.first_name,
                last_name: dto.last_name,
                email: dto.email,
                password: dto.password,
                phone_number: dto.phone_number,
                avatar: dto.avatar,
                status: dto.status,
                department,
                position,
                roles,
            });
            const resultRegister = await super.create(newUser);
            return resultRegister;
        } catch (err) {
            throw new InternalServerErrorException(err.message);
        }
    }

    //Lấy danh sách tất cả user
    async findAll(): Promise<User[]> {
        return super.find({}, ['department', 'position', 'roles', 'roles.permissions']);
    }

    //Lấy thông tin user theo ID
    async findOne(id: number): Promise<User> {
        const user = await super.findOne({id}, ['department', 'position', 'roles', 'roles.permissions']);
        if (!user) throw new NotFoundException(`User with ID ${id} does not exist.`);

        const permissions = [
            ...new Set(
                user.roles.flatMap(role => role.permissions.map(p => p.id))
            )
        ];
        const { password: _, ...userWithoutPass } = user;

        return {
            ...userWithoutPass,
            permissions,
        };
    }

    //Lấy thông tin user theo request
    async findOneRequest(request:Request): Promise<User> {
        const id_user = await this.authService.userId(request);
        const user = await this.findOne(id_user);
        if (!user) throw new NotFoundException(`User ID ${id_user} không tồn tại`);
        return user;
    }

    async updateUser(id: number, dto: UpdateUserDto, request: Request): Promise<User> {
        try{
            const user = await this.findOne(id);
            if (!user) {
                throw new NotFoundException(`User with ID ${id} does not exist.`);
            }
            if (dto.departmentId) {
                user.department = await this.departmentRepository.findOne({
                    where: { id: dto.departmentId },
                });
            }
            if (dto.positionId) {
                user.position = await this.positionRepository.findOne({
                    where: { id: dto.positionId },
                });
            }
            if (dto.roleIds?.length) {
                user.roles = await this.roleRepository.find({
                    where: { id: In(dto.roleIds) },
                });
            }

            user.first_name = dto.first_name ?? user.first_name;
            user.last_name = dto.last_name ?? user.last_name;
            user.email = dto.email ?? user.email;
            user.phone_number = dto.phone_number ?? user.phone_number;
            user.avatar = dto.avatar ?? user.avatar;
            user.status = dto.status ?? user.status;

            await this.userRepository.save(user);

            // log
            const id_user = await this.authService.userId(request);
            let actor = await this.userRepository.findOne({ where: { id: id_user } });
            await this.logsService.create({
                ip_address: request.ip,
                action: `Cập nhật user ID: ${id}`,
                users: actor ? actor.user_name : 'system',
            });
            return user;
        } catch(err){
            throw new InternalServerErrorException(
                'An unexpected error occurred while updating user.'
            );
        }
        
    }

    async changePassword(id: number, dto : ChangePasswordrDto, request: Request): Promise<User> {
        try {

            const user = await super.findOne({id}, ['department', 'position', 'roles', 'roles.permissions']);
            if (!user) {
                throw new NotFoundException(`User with ID ${id} does not exist.`);
            }

            if(!await bcrypt.compare(dto.password_current, user.password)){
                throw new BadRequestException('Current password is incorrect', { cause: new Error(), description: 'Current password is incorrect' });
            }

            if(dto.password !== dto.password_confirm){
                throw new BadRequestException('Password confirmation does not match', { cause: new Error(), description: 'Password confirmation does not match' });
            }

            const hashed = await bcrypt.hash(dto.password, 12);
            await super.update(id,{
                password: hashed
            });
            //log
            const id_user = await this.authService.userId(request);
            let actor = await this.userRepository.findOne({ where: { id: id_user } });
            await this.logsService.create({
                ip_address: request.ip,
                action: 'Updated password for user: ' + user.user_name,
                users: actor ? actor.user_name : 'system',
            })
            return user;
        }
        catch (err) {
            throw new InternalServerErrorException(
                'An unexpected error occurred while changing password.'
            );
        }
    }

    //Xóa user
    async remove(id: number, request: Request) {
        try{
            const user = await this.findOne(id);
            if (!user) {
                throw new NotFoundException(`User with ID ${id} does not exist.`);
            }
            await this.userRepository.remove(user);

            const id_user = await this.authService.userId(request);
            let actor = await this.userRepository.findOne({ where: { id: id_user } });
            await this.logsService.create({
                ip_address: request.ip,
                action: `Deleted user: ${user.user_name} - ${user.email}`,
                users: actor ? actor.user_name : 'system',
            });

            return { message: 'Delete user account successfully' };
        }
        catch(err){
            throw new InternalServerErrorException(
                'An unexpected error occurred while deleting user.'
            );
        }
        
    }

    private async hashToken(token: string) {
        // bcrypt or SHA-256; bcrypt adds salt — good for DB storage
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(token, salt);
    }

    private async compareTokenHash(token: string, hash: string) {
        return bcrypt.compare(token, hash);
    }

    async generateTokens(user: User) {
        const accessToken = await this.jwtService.signAsync(
        { sub: user.id },
        { expiresIn: '30m' }
        );
        const refreshToken = await this.jwtService.signAsync(
        { sub: user.id },
        { expiresIn: '7d' }
        );
        return { accessToken, refreshToken };
    }

    // EN: User login function. Verify username & password, then issue JWT tokens.
    // JP: ユーザーログイン機能。ユーザー名とパスワードを確認し、JWTトークンを発行します。
    async loginUser(user_name: string, password: string, response : Response, request: Request): Promise<User> {
        // EN: Find user by username
        // JP: ユーザー名でユーザーを検索します
        let user = await super.findOne({user_name:user_name}, ['department', 'position', 'roles', 'roles.permissions']);
        if(!user){
            throw new UnauthorizedException('User does not exist.', { cause: new Error(), description: 'User does not exist.' });
        }

        // EN: Check if user is active
        // JP: ユーザーが有効状態か確認します
        if(user.status !== 'active'){
            throw new ForbiddenException('User account is not active.', { cause: new Error(), description: 'User account is not active.' });
        }

        // EN: Compare input password with stored hash
        // JP: 入力されたパスワードと保存されているハッシュを比較します
        if(!await bcrypt.compare(password, user.password)){
            throw new UnauthorizedException('Invalid username or password.', { cause: new Error(), description: 'Invalid username or password.' });
        }

        // EN: Collect unique permissions from user roles
        // JP: ユーザーロールから権限をユニークに収集します
        const permissions = [
            ...new Set(
                user.roles.flatMap(role => role.permissions.map(p => p.id))
            )
        ];

        // EN: Remove password before returning user
        // JP: ユーザーを返す前にパスワードを除外します
        const { password: _, ...userWithoutPass } = user;

        // EN: Generate JWT tokens (access + refresh)
        // JP: JWTトークン（アクセストークン＋リフレッシュトークン）を生成します
        const { accessToken, refreshToken } = await this.generateTokens(user);

        // EN: Store hashed refresh token in DB
        // JP: ハッシュ化したリフレッシュトークンをDBに保存します
        const tokenRefreshHash = await this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d

        // Lưu refresh token đã hash vào DB
        await this.userTokenRepository.save(this.userTokenRepository.create({
            user: user,
            refresh_token: tokenRefreshHash,
            expired_at: expiresAt,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] || 'unknown',
        }));

        // EN: Send access and refresh token in HttpOnly cookies
        // JP: アクセストークンとリフレッシュトークンをHttpOnlyクッキーで送信します
        response.cookie('jwtmmpmachinelayout', accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 30 * 60 * 1000,
        })
        response.cookie('refresh_mmpmachinelayout', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
            ...userWithoutPass,
            permissions,
            accessToken,
            refreshToken,
        };
    }

    // Refresh endpoint: xác thực refresh token, rotate
    async refreshTokens(response: Response, request: Request): Promise<{ accessToken: string; refreshToken: string }> {
        // 🔹 Get refresh token from cookie
        // クッキーからリフレッシュトークンを取得
        const refreshToken = request.cookies['refresh_mmpmachinelayout'];
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token is missing.');
        }

        // 🔹 Verify refresh token
        // リフレッシュトークンを検証
        let payload: any;
        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'), 
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const userId = Number(payload.sub); // { sub: user.id }
        const user = await this.findOne(userId);
        if (!user) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // 🔹 Check stored refresh tokens in DB
        // DBに保存されたリフレッシュトークンを確認
        const candidates = await this.userTokenRepository.find({
            where: { user: { id: userId }, revoked: false },
        });
        
        let matched: any = null;
        const now = Date.now();

        for (const t of candidates) {
            
            const expiredAt = t.expired_at ? new Date(t.expired_at) : null;
            if (expiredAt && expiredAt.getTime() <= now) {
                await this.userTokenRepository.update(t.id, { revoked: true });
                continue;
            }

            const same = await this.compareTokenHash(refreshToken, t.refresh_token); // bcrypt.compare
            if (same) {
                matched = t;
                break;
            }
        }

        
        if (!matched) {
            // ❌ Reuse or invalid
            // トークン再利用または不正検出
            await this.userTokenRepository.update({ user: { id: userId } }, { revoked: true });
            throw new ForbiddenException('Invalid refresh token.');
        }

        // 🔹 Rotate: revoke old, issue new
        // ローテーション: 古いトークンを無効化、新しいトークンを発行
        await this.userTokenRepository.update(matched.id, { revoked: true });

        const { accessToken, refreshToken: newRefresh } = await this.generateTokens(user);
        const newHash = await this.hashToken(newRefresh);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await this.userTokenRepository.save(
            this.userTokenRepository.create({
            user,
            refresh_token: newHash,
            expired_at: expiresAt,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'] || 'unknown',
            }),
        );

        response.cookie('jwtmmpmachinelayout', accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 30 * 60 * 1000, // 30m
        });
        response.cookie('refresh_mmpmachinelayout', newRefresh, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
        });

        return { accessToken, refreshToken: newRefresh };
    }

    //Logout user
    async logoutUser(response: Response, request: Request): Promise<{ message: string }> {
        try {
            const refreshToken = request.cookies['refresh_mmpmachinelayout'];
            const id_user = await this.authService.userId(request);

            if (refreshToken) {
                const tokens = await this.userTokenRepository.find({
                    where: { user: { id: id_user }, revoked: false },
                });

                for (const t of tokens) {
                    if (await bcrypt.compare(refreshToken, t.refresh_token)) {
                        await this.userTokenRepository.update(t.id, { revoked: true });
                        break;
                    }
                }
            }

            // 🔹 Clear cookies
            // クッキーを削除
            response.clearCookie('jwtmmpmachinelayout');
            response.clearCookie('refresh_mmpmachinelayout');

            return { message: 'Successfully logged out.' };
        } catch (err) {
            // throw new InternalServerErrorException(err, { cause: new Error(), description: err });
            throw new InternalServerErrorException(
                'An unexpected error occurred while logging out.'
            );
        }
    }


}
