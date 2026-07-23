import { Controller, Get, HttpCode, HttpStatus, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ApiErrorResponse, ApiSuccessResponse } from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('dashboard')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Dashboard fetched successfully')
  @ApiOperation({
    summary: 'Get patient dashboard',
    description: 'Returns health overview, last 6 records, care ID, and emergency contacts. Response is cached per user (5 min TTL). Cache is invalidated on any profile/records/contacts mutation.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Dashboard fetched successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  get(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.get(user.sub);
  }
}
