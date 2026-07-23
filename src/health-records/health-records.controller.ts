import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { HealthRecordsService } from './health-records.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ApiErrorResponse, ApiSuccessResponse } from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('health-records')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('health-records')
export class HealthRecordsController {
  constructor(private readonly healthRecordsService: HealthRecordsService) {}

  @Post()
  @Version('1')
  @UseInterceptors(FileInterceptor('file'))
  @ResponseMessage('Health record uploaded successfully')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a health record',
    description: 'Accepts multipart/form-data. File is uploaded directly to S3.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title', 'recordType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', example: 'CBC Blood Test Report' },
        recordType: {
          type: 'string',
          enum: ['BLOOD_TEST', 'PRESCRIPTION', 'SCAN', 'LAB_TEST', 'REPORT', 'OTHER'],
          example: 'LAB_TEST',
        },
        labReportType: { type: 'string', example: 'Complete Blood Count' },
        description: { type: 'string', example: 'Routine check ordered by Dr. Okonkwo' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded. Returns saved record metadata.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Health record uploaded successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ApiErrorResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateHealthRecordDto,
  ) {
    return this.healthRecordsService.upload(user.sub, file, dto);
  }

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Health records fetched successfully')
  @ApiOperation({ summary: 'List health records', description: 'Paginated. Presigned URLs are refreshed automatically if < 5 days from expiry.' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Health records fetched successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  findAll(@CurrentUser() user: JwtPayload, @Query() pagination: PaginationDto) {
    return this.healthRecordsService.findAll(user.sub, pagination);
  }

  @Get(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Health record fetched successfully')
  @ApiOperation({ summary: 'Get a single health record' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Health record fetched successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Record not found.', type: ApiErrorResponse })
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.healthRecordsService.findOne(user.sub, id);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Health record deleted successfully')
  @ApiOperation({ summary: 'Delete a health record', description: 'Removes file from S3 and deletes the record.' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Record deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Record not found.', type: ApiErrorResponse })
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.healthRecordsService.remove(user.sub, id);
  }
}
