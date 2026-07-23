import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { MedicalHistoryService } from './medical-history.service';
import { UpdateMedicalProfileDto } from './dto/medical-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ApiErrorResponse, ApiSuccessResponse } from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('medical-profile')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('medical-profile')
export class MedicalProfileController {
  constructor(private readonly medicalHistoryService: MedicalHistoryService) {}

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Medical profile fetched successfully')
  @ApiOperation({ summary: 'Get medical profile', description: 'Returns blood group, genotype, height, weight, medication status, and active conditions.' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Medical profile fetched successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  get(@CurrentUser() user: JwtPayload) {
    return this.medicalHistoryService.getMedicalProfile(user.sub);
  }

  @Patch()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Medical profile updated successfully')
  @ApiOperation({ summary: 'Update medical profile', description: 'All fields optional. Only provided fields are updated.' })
  @ApiBody({ type: UpdateMedicalProfileDto })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Medical profile updated successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ApiErrorResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMedicalProfileDto) {
    return this.medicalHistoryService.updateMedicalProfile(user.sub, dto);
  }
}
