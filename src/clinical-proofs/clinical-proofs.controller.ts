import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { ClinicalProofsService } from './clinical-proofs.service';
import {
  CreateClinicalProofDto,
  ClinicalProofType,
} from './dto/create-clinical-proof.dto';
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

@ApiTags('clinical-proofs')
@ApiBearerAuth('jwt')
@Roles('PATIENT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clinical-proofs')
export class ClinicalProofsController {
  constructor(private readonly clinicalProofs: ClinicalProofsService) {}

  @Get('types')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Supported clinical proof types fetched successfully')
  @ApiOperation({
    summary: 'List supported clinical disclosure proof types',
    description:
      'Static reference list for the Clinical Disclosure Selection screen. ' +
      'Use these values as the proofType field of POST /clinical-proofs.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: {
              example: 'Supported clinical proof types fetched successfully',
            },
            data: {
              example: Object.values(ClinicalProofType),
            },
          },
        },
      ],
    },
  })
  listTypes() {
    return Object.values(ClinicalProofType);
  }

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Clinical proof generation started')
  @ApiOperation({
    summary: 'Generate a clinical disclosure proof',
    description:
      'Validates the claim against your medical records first — you cannot ' +
      'generate a proof of a false claim. Once accepted, a ZK proof is ' +
      'generated in the background (poll GET /clinical-proofs/:id, or check ' +
      'GET /dashboard, for status) without exposing your full record.',
  })
  @ApiBody({
    type: CreateClinicalProofDto,
    examples: {
      BLOOD_GROUP: {
        summary: 'BLOOD_GROUP',
        description: "Must match your medical profile's bloodGroup exactly.",
        value: {
          proofType: 'BLOOD_GROUP',
          claimData: { bloodGroup: 'O_POSITIVE' },
        },
      },
      GENOTYPE: {
        summary: 'GENOTYPE',
        description: "Must match your medical profile's genotype exactly.",
        value: { proofType: 'GENOTYPE', claimData: { genotype: 'AA' } },
      },
      DIAGNOSIS_CATEGORY: {
        summary: 'DIAGNOSIS_CATEGORY',
        description:
          'You must have at least one recorded condition in this category ' +
          '— the specific condition is never revealed, only the category.',
        value: {
          proofType: 'DIAGNOSIS_CATEGORY',
          claimData: { category: 'DISEASE' },
        },
      },
      CHRONIC_CONDITION: {
        summary: 'CHRONIC_CONDITION',
        description:
          'conditionId comes from GET /medical-conditions. hasCondition ' +
          'can prove presence (true) or absence (false).',
        value: {
          proofType: 'CHRONIC_CONDITION',
          claimData: {
            conditionId: '019fdd0c-216c-71e5-a515-0ba76eb5933d',
            hasCondition: true,
          },
        },
      },
      ALLERGY_CONFIRMATION: {
        summary: 'ALLERGY_CONFIRMATION',
        description: 'healthRecordId must be your own, of type ALLERGY.',
        value: {
          proofType: 'ALLERGY_CONFIRMATION',
          claimData: { healthRecordId: '019fdd0c-216c-71e5-a515-0ba76eb5933d' },
        },
      },
      PRIOR_PRESCRIPTION_PATTERN: {
        summary: 'PRIOR_PRESCRIPTION_PATTERN',
        description:
          'Matched against your own PRESCRIPTION/MEDICATION records’ drugClass.',
        value: {
          proofType: 'PRIOR_PRESCRIPTION_PATTERN',
          claimData: { drugClass: 'antihistamines' },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Claim accepted; proof generation started (status PENDING).',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Clinical proof generation started' },
            data: {
              example: {
                id: '019fdd0c-216c-71e5-a515-0ba76eb5933d',
                userId: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
                proofType: 'BLOOD_GROUP',
                claimData: { bloodGroup: 'O_POSITIVE' },
                status: 'PENDING',
                commitment: null,
                generatedAt: null,
                createdAt: '2026-07-23T10:00:00.000Z',
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Claim does not match your medical records (e.g. claimed blood group ' +
      "does not match your profile's), or claimData is malformed for the " +
      'given proofType.',
    type: ApiErrorResponse,
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateClinicalProofDto) {
    return this.clinicalProofs.create(user.sub, dto);
  }

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Clinical proofs fetched successfully')
  @ApiOperation({
    summary: 'List your generated clinical proofs',
    description: 'Most recent first. Includes proofs of every status.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Clinical proofs fetched successfully' },
            data: {
              example: [
                {
                  id: '019fdd0c-216c-71e5-a515-0ba76eb5933d',
                  proofType: 'BLOOD_GROUP',
                  claimData: { bloodGroup: 'O_POSITIVE' },
                  status: 'GENERATED',
                  generatedAt: '2026-07-23T10:00:05.000Z',
                  createdAt: '2026-07-23T10:00:00.000Z',
                },
              ],
            },
          },
        },
      ],
    },
  })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.clinicalProofs.findAll(user.sub);
  }

  @Get(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Clinical proof fetched successfully')
  @ApiOperation({
    summary: 'Get a single clinical proof (status + details)',
    description:
      'Poll this for the Generate Clinical Proof screen. status moves ' +
      'PENDING -> GENERATED (commitment populated) or PENDING -> FAILED ' +
      '(error populated).',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Clinical proof fetched successfully' },
            data: {
              example: {
                id: '019fdd0c-216c-71e5-a515-0ba76eb5933d',
                proofType: 'BLOOD_GROUP',
                claimData: { bloodGroup: 'O_POSITIVE' },
                status: 'GENERATED',
                commitment: '0x3f2a1b...',
                generatedAt: '2026-07-23T10:00:05.000Z',
                createdAt: '2026-07-23T10:00:00.000Z',
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No such proof, or it belongs to a different patient.',
    type: ApiErrorResponse,
  })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clinicalProofs.findOne(user.sub, id);
  }
}
