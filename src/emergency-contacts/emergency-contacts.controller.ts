import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { EmergencyContactsService } from './emergency-contacts.service';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ApiErrorResponse, ApiSuccessResponse } from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('emergency-contacts')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('emergency-contacts')
export class EmergencyContactsController {
  constructor(private readonly emergencyContactsService: EmergencyContactsService) {}

  @Post()
  @Version('1')
  @ResponseMessage('Emergency contact added successfully')
  @ApiOperation({ summary: 'Add emergency contact' })
  @ApiBody({ type: CreateEmergencyContactDto })
  @ApiResponse({
    status: 201,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Emergency contact added successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ApiErrorResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateEmergencyContactDto) {
    return this.emergencyContactsService.create(user.sub, dto);
  }

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Emergency contacts fetched successfully')
  @ApiOperation({ summary: 'List all emergency contacts' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Emergency contacts fetched successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.emergencyContactsService.findAll(user.sub);
  }

  @Patch(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Emergency contact updated successfully')
  @ApiOperation({ summary: 'Update an emergency contact' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateEmergencyContactDto })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Emergency contact updated successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Contact not found.', type: ApiErrorResponse })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmergencyContactDto,
  ) {
    return this.emergencyContactsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Emergency contact removed successfully')
  @ApiOperation({ summary: 'Delete an emergency contact' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Contact removed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Contact not found.', type: ApiErrorResponse })
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.emergencyContactsService.remove(user.sub, id);
  }
}
