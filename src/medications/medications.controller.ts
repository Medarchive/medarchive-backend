import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { MedicationsService } from './medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ApiErrorResponse, ApiSuccessResponse } from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('medications')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('medications')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  @Version('1')
  @ResponseMessage('Medication added successfully')
  @ApiOperation({ summary: 'Add a medication' })
  @ApiBody({ type: CreateMedicationDto })
  @ApiResponse({
    status: 201,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Medication added successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ApiErrorResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMedicationDto) {
    return this.medicationsService.create(user.sub, dto);
  }

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Medications fetched successfully')
  @ApiOperation({ summary: 'List all medications' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Medications fetched successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.medicationsService.findAll(user.sub);
  }

  @Patch(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Medication updated successfully')
  @ApiOperation({ summary: 'Update a medication' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateMedicationDto })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Medication updated successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Medication not found.', type: ApiErrorResponse })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.medicationsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Medication removed successfully')
  @ApiOperation({ summary: 'Delete a medication' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Medication removed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Medication not found.', type: ApiErrorResponse })
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.medicationsService.remove(user.sub, id);
  }
}
