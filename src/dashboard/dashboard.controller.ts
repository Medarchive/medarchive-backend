import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('dashboard')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Dashboard fetched successfully')
  @ApiOperation({
    summary: 'Get patient dashboard',
    description:
      'Returns health overview, last 6 records, care ID, emergency contacts, ' +
      'wallet, and the 5 most recent clinical disclosure proofs (id, type, ' +
      'claim, status, timestamps — no cryptographic proof material). ' +
      'Response is cached per user (5 min TTL). Cache is invalidated on any ' +
      'profile/records/contacts/proof mutation.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Dashboard fetched successfully' },
            data: {
              example: {
                healthOverview: {
                  bloodGroup: 'O_POSITIVE',
                  genotype: 'AA',
                  heightCm: '170.50',
                  weightKg: '68.00',
                  currentlyTakingMedication: false,
                  conditions: [],
                },
                recentRecords: [],
                careId: { careId: 'MA-000001', status: 'VERIFIED' },
                emergencyContacts: [],
                wallet: null,
                recentClinicalProofs: [
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
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    type: ApiErrorResponse,
  })
  get(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.get(user.sub);
  }
}
