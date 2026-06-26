import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/control/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/control/roles.guard.js';
import { Roles } from '../../auth/control/roles.decorator.js';
import { AdminUsersService } from '../control/admin-users.service.js';
import { QueryAdminUsersDto } from '../dto/query-admin-users.dto.js';
import { CreateAdminUserDto } from '../dto/create-admin-user.dto.js';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto.js';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto.js';

@Controller('api/admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  async getUsersList(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: QueryAdminUsersDto,
  ) {
    return await this.adminUsersService.getUsersList(query);
  }

  @Get(':userId')
  async getUserDetail(@Param('userId') userId: string) {
    return await this.adminUsersService.getUserDetail(userId);
  }

  @Post()
  async createUser(
    @Req() req: any,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateAdminUserDto,
  ) {
    const actorUserId = req.user.userId;
    return await this.adminUsersService.createUser(actorUserId, dto);
  }

  @Put(':userId/roles')
  async updateUserRoles(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateUserRolesDto,
  ) {
    const actorUserId = req.user.userId;
    return await this.adminUsersService.updateUserRoles(actorUserId, userId, dto);
  }

  @Patch(':userId/status')
  async updateUserStatus(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateUserStatusDto,
  ) {
    const actorUserId = req.user.userId;
    return await this.adminUsersService.updateUserStatus(actorUserId, userId, dto);
  }

  @Post(':userId/password-reset')
  async triggerPasswordReset(
    @Req() req: any,
    @Param('userId') userId: string,
  ) {
    const actorUserId = req.user.userId;
    return await this.adminUsersService.triggerPasswordReset(actorUserId, userId);
  }
}
