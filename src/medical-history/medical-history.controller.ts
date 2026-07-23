import { Body, Controller, Delete, HttpCode, HttpStatus, Patch, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { MedicalHistoryService } from './medical-history.service';
import { MedicalHistoryDto } from './dto/medical-history.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ApiErrorResponse, ApiSuccessResponse } from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('medical-history')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('med-history')
export class MedicalHistoryController {
  constructor(private readonly medicalHistoryService: MedicalHistoryService) {}

  @Post()
  @Version('1')
  @ResponseMessage('Medical history updated successfully')
  @ApiOperation({
    summary: 'Add conditions to medical history',
    description: 'Appends the given conditions to the user\'s medical history. Duplicate entries are silently ignored.',
  })
  @ApiBody({ type: MedicalHistoryDto })
  @ApiResponse({
    status: 201,
    description: 'Conditions added. Returns updated full condition list.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Medical history updated successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or inactive condition IDs.', type: ApiErrorResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  add(@CurrentUser() user: JwtPayload, @Body() dto: MedicalHistoryDto) {
    return this.medicalHistoryService.add(user, dto);
  }

  @Patch()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Medical history replaced successfully')
  @ApiOperation({
    summary: 'Replace full medical history',
    description: 'Deletes all existing conditions and replaces them with the given set. Use this when the user resubmits the full selection.',
  })
  @ApiBody({ type: MedicalHistoryDto })
  @ApiResponse({
    status: 200,
    description: 'Conditions replaced. Returns updated full condition list.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Medical history replaced successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or inactive condition IDs.', type: ApiErrorResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  replace(@CurrentUser() user: JwtPayload, @Body() dto: MedicalHistoryDto) {
    return this.medicalHistoryService.replace(user, dto);
  }

  @Delete()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Conditions removed successfully')
  @ApiOperation({
    summary: 'Remove specific conditions from medical history',
    description: 'Removes the specified conditions from the user\'s medical history. Conditions not in the user\'s history are silently ignored.',
  })
  @ApiBody({ type: MedicalHistoryDto })
  @ApiResponse({
    status: 200,
    description: 'Conditions removed. Returns updated full condition list.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Conditions removed successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  remove(@CurrentUser() user: JwtPayload, @Body() dto: MedicalHistoryDto) {
    return this.medicalHistoryService.remove(user, dto);
  }
}
