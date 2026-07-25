import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActivityLogService } from './activity-log.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import type { JwtPayload } from '../auth/auth.types.js';

@ApiTags('activity')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('activity')
export class ActivityLogController {
  constructor(private readonly activityLog: ActivityLogService) {}

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Activity log fetched successfully')
  @ApiOperation({ summary: 'Get activity log', description: 'Returns paginated audit trail of actions taken by the authenticated user.' })
  findAll(@CurrentUser() user: JwtPayload, @Query() pagination: PaginationDto) {
    return this.activityLog.findAll(user.sub, pagination);
  }
}
