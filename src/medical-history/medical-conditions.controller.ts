import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MedicalHistoryService } from './medical-history.service';
import { CreateMedicalConditionDto } from './dto/create-medical-condition.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiErrorResponse } from '../common/swagger/api-responses';

@ApiTags('medical-conditions')
@Controller('medical-conditions')
export class MedicalConditionsController {
  constructor(private readonly medicalHistoryService: MedicalHistoryService) {}

  @Get()
  @Version('1')
  @ResponseMessage('Medical conditions fetched successfully')
  @ApiOperation({ summary: 'List all active medical conditions' })
  listConditions(@Query() dto: PaginationDto) {
    return this.medicalHistoryService.listConditions(dto);
  }

  @Post()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Version('1')
  @ResponseMessage('Condition created successfully')
  @ApiOperation({ summary: '[Admin] Create a medical condition' })
  @ApiBody({ type: CreateMedicalConditionDto })
  @ApiResponse({ status: 201, description: 'Condition created.' })
  @ApiResponse({
    status: 409,
    description: 'Condition already exists.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden.',
    type: ApiErrorResponse,
  })
  create(@Body() dto: CreateMedicalConditionDto) {
    return this.medicalHistoryService.createCondition(dto);
  }

  @Put()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Condition updated successfully')
  @ApiOperation({
    summary: '[Admin] Update a medical condition',
    description: 'Stub — not yet implemented.',
  })
  @ApiResponse({ status: 200, description: 'Condition updated.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden.',
    type: ApiErrorResponse,
  })
  async update(): Promise<null> {
    await this.medicalHistoryService.invalidateConditionsCache();
    return null;
  }

  @Delete()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Condition deactivated successfully')
  @ApiOperation({
    summary: '[Admin] Deactivate a medical condition',
    description: 'Stub — not yet implemented.',
  })
  @ApiResponse({ status: 200, description: 'Condition deactivated.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden.',
    type: ApiErrorResponse,
  })
  async deactivate(): Promise<null> {
    await this.medicalHistoryService.invalidateConditionsCache();
    return null;
  }
}
