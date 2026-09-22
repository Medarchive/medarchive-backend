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
      'Requires the provider to have a linked and verified Stellar wallet — its address is snapshotted onto the order as the payment destination.',
  })
  @ApiResponse({
    status: 201,
    schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] },
  })
  @ApiResponse({ status: 400, type: ApiErrorResponse })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateServiceOrderDto) {
    return this.serviceOrders.create(user.sub, dto);
  }

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Service orders fetched successfully')
  @ApiOperation({
    summary: 'List service orders for the logged-in patient or provider',
  })
  @ApiResponse({
    status: 200,
    schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] },
  })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationDto) {
    return this.serviceOrders.findAll(user.sub, query);
  }

  @Get(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Service order fetched successfully')
  @ApiOperation({ summary: 'Get a single service order' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] },
  })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
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
      'Returns the provider destination address, asset, amount, and memo. ' +
      'The patient wallet signs and submits the transaction directly — Med ' +
      'Archive never holds a signing key for this flow.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] },
  })
  @ApiResponse({ status: 400, type: ApiErrorResponse })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
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
      'Confirms the transaction succeeded, used the correct asset/amount, ' +
      'paid the correct provider wallet, and belongs to this order (memo ' +
      'match) before updating the order to PAID.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    schema: { allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }] },
  })
  @ApiResponse({ status: 400, type: ApiErrorResponse })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  @ApiResponse({ status: 409, type: ApiErrorResponse })
  verifyPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.serviceOrders.verifyPayment(user.sub, id, dto.txHash);
  }
}
