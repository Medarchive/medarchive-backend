import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ProviderProfileService } from './provider-profile.service';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { PatientRecordsQueryDto } from './dto/patient-records-query.dto';
import { CreateRecordRequestDto } from './dto/create-record-request.dto';
import { ProviderPatientSearchDto } from './dto/provider-patient-search.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';
import type { Request } from 'express';

const ALLOWED_PICTURE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

const MAX_PICTURE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const multerPictureOptions = {
  limits: { fileSize: MAX_PICTURE_SIZE_BYTES },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (ALLOWED_PICTURE_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          'Only JPEG, PNG, WEBP, or HEIC images are allowed',
        ),
        false,
      );
    }
  },
};

@ApiTags('provider-profile')
@ApiBearerAuth('jwt')
@Roles('PROVIDER')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('provider/profile')
export class ProviderProfileController {
  constructor(
    private readonly providerProfileService: ProviderProfileService,
  ) {}

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Profile fetched successfully')
  @ApiOperation({ summary: 'Get provider profile' })
  @ApiResponse({
    status: 200,
    schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — provider role required.',
    type: ApiErrorResponse,
  })
  findOne(@CurrentUser() user: JwtPayload) {
    return this.providerProfileService.findOne(user.sub);
  }

  @Get('patients/records')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Patient records fetched successfully')
  @ApiOperation({
    summary: 'Look up patient health records',
    description:
      'Provide exactly one of: careId, userId, or email. Returns the matched patient identity and all their health records.',
  })
  @ApiResponse({
    status: 200,
    schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] },
  })
  @ApiResponse({
    status: 400,
    description: 'Missing or conflicting query params.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — provider role required.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Patient not found.',
    type: ApiErrorResponse,
  })
  getPatientRecords(@Query() query: PatientRecordsQueryDto) {
    return this.providerProfileService.lookupPatientRecords(query);
  }

  @Post('record-requests')
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Record access request sent successfully')
  @ApiOperation({ summary: 'Request access to patient records' })
  @ApiBody({ type: CreateRecordRequestDto })
  @ApiResponse({
    status: 201,
    schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or conflicting patient identifiers.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — provider role required.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Patient not found.',
    type: ApiErrorResponse,
  })
  createRecordRequest(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRecordRequestDto,
  ) {
    return this.providerProfileService.createRecordRequest(user.sub, dto);
  }

  @Get('patients/search')
  @Version('1')
  @ResponseMessage('Patient found')
  @ApiOperation({ summary: 'Search patient by care ID' })
  searchPatient(@Query() dto: ProviderPatientSearchDto) {
    return this.providerProfileService.searchPatient(dto);
  }

  @Get('patients/:patientId/records')
  @Version('1')
  @ResponseMessage('Approved records fetched successfully')
  @ApiOperation({ summary: 'List approved health records for a patient' })
  getApprovedRecords(
    @CurrentUser() user: JwtPayload,
    @Param('patientId') patientId: string,
  ) {
    return this.providerProfileService.getApprovedRecords(user.sub, patientId);
  }

  @Get('patients/:patientId/records/:recordId')
  @Version('1')
  @ResponseMessage('Record fetched successfully')
  @ApiOperation({ summary: 'Get a single approved health record' })
  getApprovedRecord(
    @CurrentUser() user: JwtPayload,
    @Param('patientId') patientId: string,
    @Param('recordId') recordId: string,
  ) {
    return this.providerProfileService.getApprovedRecord(user.sub, patientId, recordId);
  }

  @Get('record-requests/:id')
  @Version('1')
  @ResponseMessage('Record request fetched successfully')
  @ApiOperation({ summary: 'Get a single record request' })
  getRecordRequest(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.providerProfileService.getRecordRequest(user.sub, id);
  }

  @Get('activity')
  @Version('1')
  @ResponseMessage('Activity log fetched successfully')
  @ApiOperation({ summary: "Get provider's own activity log" })
  getActivity(@CurrentUser() user: JwtPayload, @Query() dto: PaginationDto) {
    return this.providerProfileService.getOwnActivity(user.sub, dto);
  }

  @Patch()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Profile updated successfully')
  @ApiOperation({ summary: 'Update provider profile text fields' })
  @ApiBody({ type: UpdateProviderProfileDto })
  @ApiResponse({
    status: 200,
    schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — provider role required.',
    type: ApiErrorResponse,
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProviderProfileDto,
  ) {
    return this.providerProfileService.update(user.sub, dto);
  }

  @Post('picture')
  @Version('1')
  @UseInterceptors(FileInterceptor('file', multerPictureOptions))
  @ResponseMessage('Profile picture uploaded successfully')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload provider profile picture',
    description:
      'Accepts a single JPEG, PNG, WEBP, or HEIC image (max 5 MB). Replaces any existing profile picture in S3.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture — JPEG, PNG, WEBP, or HEIC, max 5 MB',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Picture uploaded. Returns updated profile.',
    schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or file too large.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — provider role required.',
    type: ApiErrorResponse,
  })
  uploadPicture(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.providerProfileService.uploadPicture(user.sub, file);
  }
}
