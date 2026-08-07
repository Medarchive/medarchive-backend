import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AdminListUsersDto } from './dto/list-users.dto';
import { AdminListActivityLogsDto } from './dto/list-activity-logs.dto';
import { AdminListAccessRequestsDto } from './dto/list-access-requests.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('admin')
@ApiBearerAuth('jwt')
@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Stats ─────────────────────────────────────────────────────────
  @Get('stats')
  @Version('1')
  @ApiOperation({ summary: 'Dashboard overview stats' })
  getStats() {
    return this.adminService.getStats();
  }

  // ── Users ─────────────────────────────────────────────────────────
  @Get('users')
  @Version('1')
  @ApiOperation({ summary: 'List all users' })
  listUsers(@Query() dto: AdminListUsersDto) {
    return this.adminService.listUsers(dto);
  }

  @Get('users/:id')
  @Version('1')
  @ApiOperation({ summary: 'Get user detail' })
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Delete('users/:id')
  @Version('1')
  @ResponseMessage('User deleted successfully')
  @ApiOperation({ summary: 'Delete user' })
  deleteUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.adminService.deleteUser(id, user.sub);
  }

  @Patch('users/:id/verify-provider')
  @Version('1')
  @ResponseMessage('Provider verified successfully')
  @ApiOperation({ summary: 'Verify a provider account' })
  verifyProvider(@Param('id') id: string) {
    return this.adminService.verifyProvider(id);
  }

  // ── Invitations ────────────────────────────────────────────────────
  @Post('invites')
  @Version('1')
  @ResponseMessage('Provider invitation sent successfully')
  @ApiOperation({ summary: 'Invite a provider' })
  createInvite(@CurrentUser() user: JwtPayload, @Body() dto: CreateInviteDto) {
    return this.adminService.createProviderInvite(dto, user.sub);
  }

  @Get('invites')
  @Version('1')
  @ApiOperation({ summary: 'List all provider invitations' })
  listInvites(@Query() dto: PaginationDto) {
    return this.adminService.listInvites(dto.page, dto.take);
  }

  @Delete('invites/:id')
  @Version('1')
  @ResponseMessage('Invitation revoked successfully')
  @ApiOperation({ summary: 'Revoke a provider invitation' })
  revokeInvite(@Param('id') id: string) {
    return this.adminService.revokeInvite(id);
  }

  // ── Access Requests ────────────────────────────────────────────────
  @Get('access-requests')
  @Version('1')
  @ApiOperation({ summary: 'List all provider record access requests' })
  listAccessRequests(@Query() dto: AdminListAccessRequestsDto) {
    return this.adminService.listAccessRequests(dto);
  }

  // ── Wallets ────────────────────────────────────────────────────────
  @Get('wallets')
  @Version('1')
  @ApiOperation({ summary: 'List all wallets' })
  listWallets(@Query() dto: PaginationDto) {
    return this.adminService.listWallets(dto.page, dto.take);
  }

  // ── Activity Logs ──────────────────────────────────────────────────
  @Get('activity-logs')
  @Version('1')
  @ApiOperation({ summary: 'System-wide activity logs' })
  listActivityLogs(@Query() dto: AdminListActivityLogsDto) {
    return this.adminService.listActivityLogs(dto);
  }

  // ── Notifications ──────────────────────────────────────────────────
  @Post('notifications/broadcast')
  @Version('1')
  @ResponseMessage('Notification broadcast successfully')
  @ApiOperation({ summary: 'Broadcast notification to users by role or all' })
  broadcastNotification(@Body() dto: BroadcastNotificationDto) {
    return this.adminService.broadcastNotification(dto);
  }
}
