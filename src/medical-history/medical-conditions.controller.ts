import { Controller, Delete, HttpCode, HttpStatus, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MedicalHistoryService } from './medical-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ApiErrorResponse } from '../common/swagger/api-responses';

@ApiTags('medical-conditions')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('medical-conditions')
export class MedicalConditionsController {
  constructor(private readonly medicalHistoryService: MedicalHistoryService) {}

  @Post()
  @Version('1')
  @ResponseMessage('Condition created successfully')
  @ApiOperation({ summary: '[Admin] Create a medical condition', description: 'Stub — not yet implemented.' })
  @ApiResponse({ status: 201, description: 'Condition created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 403, description: 'Forbidden.', type: ApiErrorResponse })
  create() {
    return null;
  }

  @Put()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Condition updated successfully')
  @ApiOperation({ summary: '[Admin] Update a medical condition', description: 'Stub — not yet implemented. Will invalidate the active conditions cache on update.' })
  @ApiResponse({ status: 200, description: 'Condition updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 403, description: 'Forbidden.', type: ApiErrorResponse })
  async update() {
    await this.medicalHistoryService.invalidateConditionsCache();
    return null;
  }

  @Delete()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Condition deactivated successfully')
  @ApiOperation({ summary: '[Admin] Deactivate a medical condition', description: 'Stub — not yet implemented. Will invalidate the active conditions cache on deactivation.' })
  @ApiResponse({ status: 200, description: 'Condition deactivated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 403, description: 'Forbidden.', type: ApiErrorResponse })
  async deactivate() {
    await this.medicalHistoryService.invalidateConditionsCache();
    return null;
  }
}
