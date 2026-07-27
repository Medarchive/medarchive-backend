import {
  BadRequestException,
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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
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
import { HealthRecordsQueryDto } from './dto/health-records-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ApiErrorResponse, ApiSuccessResponse } from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';
import type { Request } from 'express';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_FILES = 10;

const multerOptions = {
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Only images (JPEG, PNG, WEBP, HEIC) and PDF files are allowed'), false);
    }
  },
};

@ApiTags('health-records')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('health-records')
export class HealthRecordsController {
  constructor(private readonly healthRecordsService: HealthRecordsService) {}

  @Post()
  @Version('1')
  @UseInterceptors(FilesInterceptor('files', MAX_FILES, multerOptions))
  @ResponseMessage('Health record created successfully')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a health record',
    description: 'Accepts multipart/form-data. Optionally attach up to 10 files (JPEG, PNG, WEBP, HEIC, PDF, max 20 MB each). Required fields vary by recordType.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'recordType'],
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Optional. Up to 10 files — images (JPEG/PNG/WEBP/HEIC) or PDF, max 20 MB each',
        },
        title: { type: 'string', example: 'CBC Blood Test Report' },
        recordType: {
          type: 'string',
          enum: ['BLOOD_TEST', 'PRESCRIPTION', 'SCAN', 'LAB_TEST', 'MEDICATION', 'REPORT', 'ALLERGY', 'OTHER'],
          example: 'LAB_TEST',
        },
        testName: { type: 'string', example: 'Complete Blood Count', description: 'Required for LAB_TEST' },
        referredBy: { type: 'string', example: 'Dr. Mike JP', description: 'LAB_TEST: referring physician' },
        drugClass: { type: 'string', example: 'Antibiotic', description: 'PRESCRIPTION: drug class' },
        prescribedBy: { type: 'string', example: 'Dr. Okonkwo', description: 'PRESCRIPTION: prescribing physician' },
        drug: { type: 'string', example: 'Amoxicillin', description: 'Required for MEDICATION' },
        dosage: { type: 'string', example: '500mg', description: 'MEDICATION: dosage' },
        frequency: { type: 'string', example: 'BID', description: 'MEDICATION: frequency (e.g. OD, BID, TID, PRN)' },
        endDate: { type: 'string', format: 'date', example: '2026-08-26', description: 'MEDICATION: end date (omit if ongoing)' },
        allergyType: {
          type: 'string',
          enum: ['FOOD', 'DRUG', 'ENVIRONMENTAL', 'INSECT', 'LATEX', 'OTHER'],
          description: 'Required for ALLERGY',
        },
        cause: { type: 'string', example: 'Peanuts', description: 'Required for ALLERGY — what triggers it' },
        management: { type: 'string', example: 'Carry EpiPen at all times', description: 'ALLERGY: management plan' },
        recordDate: { type: 'string', format: 'date', example: '2026-07-26', description: 'Date of test / prescription / medication' },
        description: { type: 'string', example: 'Routine check ordered by Dr. Okonkwo' },
      },
    },
  })
  @ApiResponse({ status: 201, schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] } })
  @ApiResponse({ status: 400, description: 'Validation error or unsupported file type.', type: ApiErrorResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateHealthRecordDto,
  ) {
    return this.healthRecordsService.upload(user.sub, files ?? [], dto);
  }

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Health records fetched successfully')
  @ApiOperation({ summary: 'List health records', description: 'Paginated with filtering. Each record includes its files array. Presigned URLs are refreshed automatically if < 5 days from expiry.' })
  @ApiResponse({ status: 200, schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] } })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: HealthRecordsQueryDto) {
    return this.healthRecordsService.findAll(user.sub, query);
  }

  @Get(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Health record fetched successfully')
  @ApiOperation({ summary: 'Get a single health record' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] } })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Record not found.', type: ApiErrorResponse })
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.healthRecordsService.findOne(user.sub, id);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Health record deleted successfully')
  @ApiOperation({ summary: 'Delete a health record', description: 'Removes all associated files from S3 and deletes the record.' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Record deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Record not found.', type: ApiErrorResponse })
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.healthRecordsService.remove(user.sub, id);
  }
}
