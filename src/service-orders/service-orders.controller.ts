import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
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

@ApiTags('service-orders')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly serviceOrders: ServiceOrdersService) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @Roles('PROVIDER')
  @ResponseMessage('Service order created successfully')
  @ApiOperation({
    summary: 'Create a healthcare service/order for a patient',
    description:
      'Requires the calling provider to have a linked and verified Stellar ' +
      'wallet with an established USDC trustline — its address is ' +
      'snapshotted onto the order at creation time as the fixed payment ' +
      'destination (changing your wallet later does not affect existing ' +
      'orders). Order starts in status PENDING.',
  })
  @ApiBody({ type: CreateServiceOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Order created, awaiting payment.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Service order created successfully' },
            data: {
              example: {
                id: '019fdd0c-216c-71e5-a515-0ba76eb5933d',
                reference: 'ORD-1A2B3C4D',
                patientId: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
                providerId: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4c',
                providerWalletAddress:
                  'GPROVIDERWALLETADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                description: 'Consultation — General Checkup',
                amount: '25.5000000',
                assetCode: 'USDC',
                status: 'PENDING',
                txHash: null,
                paidAt: null,
                createdAt: '2026-07-23T10:00:00.000Z',
                updatedAt: '2026-07-23T10:00:00.000Z',
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
      'Provider has no verified wallet, or no USDC trustline yet ' +
      '(established automatically within a few minutes of wallet creation ' +
      '— retry shortly).',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — PROVIDER role required.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'No patient found for the given patientId.',
    type: ApiErrorResponse,
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateServiceOrderDto) {
    return this.serviceOrders.create(user.sub, dto);
  }

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Service orders fetched successfully')
  @ApiOperation({
    summary: 'List service orders for the logged-in patient or provider',
    description:
      'Returns orders where the caller is either the patient or the ' +
      'provider — role determines which side of each order you are. ' +
      'status is one of PENDING | PAID.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Service orders fetched successfully' },
            data: {
              example: {
                data: [
                  {
                    id: '019fdd0c-216c-71e5-a515-0ba76eb5933d',
                    reference: 'ORD-1A2B3C4D',
                    patientId: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
                    providerId: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4c',
                    description: 'Consultation — General Checkup',
                    amount: '25.5000000',
                    assetCode: 'USDC',
                    status: 'PAID',
                    txHash:
                      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
                    paidAt: '2026-07-23T10:05:00.000Z',
                    createdAt: '2026-07-23T10:00:00.000Z',
                  },
                ],
                meta: {
                  totalCount: 1,
                  currentCount: 1,
                  page: 1,
                  totalPages: 1,
                  hasNext: false,
                  hasPrevious: false,
                },
              },
            },
          },
        },
      ],
    },
  })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationDto) {
    return this.serviceOrders.findAll(user.sub, query);
  }

  @Get(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Service order fetched successfully')
  @ApiOperation({
    summary: 'Get a single service order',
    description:
      'Caller must be either the patient or the provider on this order.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Service order UUID' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Service order fetched successfully' },
            data: {
              example: {
                id: '019fdd0c-216c-71e5-a515-0ba76eb5933d',
                reference: 'ORD-1A2B3C4D',
                patientId: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
                providerId: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4c',
                providerWalletAddress:
                  'GPROVIDERWALLETADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                description: 'Consultation — General Checkup',
                amount: '25.5000000',
                assetCode: 'USDC',
                status: 'PENDING',
                txHash: null,
                paidAt: null,
                createdAt: '2026-07-23T10:00:00.000Z',
                updatedAt: '2026-07-23T10:00:00.000Z',
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 403,
    description: 'You are neither the patient nor the provider on this order.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'No such order.',
    type: ApiErrorResponse,
  })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrders.findOne(user.sub, id);
  }

  @Get(':id/payment-intent')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @Roles('PATIENT')
  @ResponseMessage('Payment intent fetched successfully')
  @ApiOperation({
    summary: 'Get payment details to build a USDC transaction',
    description:
      'Returns everything your wallet needs to build, sign, and submit the ' +
      'payment yourself — Med Archive never builds, holds a key for, or ' +
      'signs this transaction. Send exactly this destination/assetCode/' +
      'assetIssuer/amount, with memo set as a TEXT memo (not hash/id), then ' +
      'call POST /service-orders/:id/payment/verify with the resulting ' +
      'transaction hash. Requires your own wallet to already have a USDC ' +
      'trustline (established automatically within a few minutes of ' +
      'wallet creation).',
  })
  @ApiParam({ name: 'id', type: String, description: 'Service order UUID' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Payment intent fetched successfully' },
            data: {
              example: {
                orderId: '019fdd0c-216c-71e5-a515-0ba76eb5933d',
                reference: 'ORD-1A2B3C4D',
                destination:
                  'GPROVIDERWALLETADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                assetCode: 'USDC',
                assetIssuer:
                  'GISSUERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                amount: '25.5000000',
                memo: 'ORD-1A2B3C4D',
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
      'Order is not PENDING (already paid), you have no wallet linked, or ' +
      'your wallet has no USDC trustline yet.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden — PATIENT role required, or you are not the order’s patient.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'No such order.',
    type: ApiErrorResponse,
  })
  getPaymentIntent(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrders.getPaymentIntent(user.sub, id);
  }

  @Post(':id/payment/verify')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @Roles('PATIENT')
  @ResponseMessage('Payment verified successfully')
  @ApiOperation({
    summary: 'Verify a submitted Stellar transaction and mark order as paid',
    description:
      'Fetches the transaction from Stellar Horizon and checks, in order: ' +
      'it succeeded, the memo (text) matches this order’s reference, a ' +
      'payment operation exists, the asset is exactly USDC from the ' +
      'configured issuer, the destination is this order’s provider wallet, ' +
      'and the amount matches exactly. Only on all of that passing does the ' +
      'order flip PENDING -> PAID. A background sweep also retries this ' +
      'automatically every 5 minutes, so calling this yourself is only for ' +
      'instant UI feedback, not strictly required.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Service order UUID' })
  @ApiBody({ type: VerifyPaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Transaction verified; order is now PAID.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Payment verified successfully' },
            data: {
              example: {
                id: '019fdd0c-216c-71e5-a515-0ba76eb5933d',
                reference: 'ORD-1A2B3C4D',
                status: 'PAID',
                txHash:
                  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
                paidAt: '2026-07-23T10:05:00.000Z',
                updatedAt: '2026-07-23T10:05:00.000Z',
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
      'Order is not PENDING, or the transaction failed one of the checks ' +
      '(not found on Horizon, wrong memo, wrong asset, wrong destination, ' +
      'or wrong amount) — the exact reason is in the error message.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden — PATIENT role required, or you are not the order’s patient.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'No such order.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 409,
    description:
      'This transaction hash was already used to pay a different order, ' +
      'or this order was already paid by a concurrent request.',
    type: ApiErrorResponse,
  })
  verifyPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.serviceOrders.verifyPayment(user.sub, id, dto.txHash);
  }
}
