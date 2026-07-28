import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('notifications')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Notifications fetched successfully')
  @ApiOperation({
    summary: 'List notifications',
    description:
      'Paginated. Filter by read status with ?read=true or ?read=false. Omit to return all.',
  })
  @ApiResponse({
    status: 200,
    schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: NotificationsQueryDto,
  ) {
    return this.notificationsService.findAll(user.sub, query);
  }

  @Patch(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Notification updated successfully')
  @ApiOperation({ summary: 'Mark notification as read or unread' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateNotificationDto })
  @ApiResponse({
    status: 200,
    schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 403, description: 'Forbidden.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Notification not found.', type: ApiErrorResponse })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(user.sub, id, dto.read);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Notification deleted successfully')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Notification deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 403, description: 'Forbidden.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Notification not found.', type: ApiErrorResponse })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.remove(user.sub, id);
  }
}
