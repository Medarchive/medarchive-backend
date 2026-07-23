import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { AddWalletDto } from './dto/add-wallet.dto';
import { VerifyWalletDto } from './dto/verify-wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ApiErrorResponse, ApiSuccessResponse } from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('wallet')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @Version('1')
  @ResponseMessage('Wallet linked successfully')
  @ApiOperation({
    summary: 'Link a Stellar wallet',
    description: 'Validates public key format, stores wallet, and returns a nonce to sign for verification. Proceed to POST /wallet/verify.',
  })
  @ApiBody({ type: AddWalletDto })
  @ApiResponse({
    status: 201,
    description: 'Wallet linked. Returns wallet + nonce to sign.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Wallet linked successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid Stellar public key.', type: ApiErrorResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 409, description: 'Wallet already linked.', type: ApiErrorResponse })
  add(@CurrentUser() user: JwtPayload, @Body() dto: AddWalletDto) {
    return this.walletService.add(user.sub, dto);
  }

  @Post('verify')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Wallet verified successfully')
  @ApiOperation({
    summary: 'Verify wallet ownership',
    description: 'Signs the nonce from POST /wallet with the Stellar private key locally, then submits here. Sets verifiedAt on the wallet.',
  })
  @ApiBody({ type: VerifyWalletDto })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Wallet verified successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired nonce / bad signature.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'No wallet linked.', type: ApiErrorResponse })
  verify(@CurrentUser() user: JwtPayload, @Body() dto: VerifyWalletDto) {
    return this.walletService.verify(user.sub, dto.nonce, dto.signature);
  }

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Wallet fetched successfully')
  @ApiOperation({ summary: 'Get linked wallet', description: 'Returns wallet metadata and live XLM balance from Stellar Horizon. Balance is null if account is unfunded.' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Wallet fetched successfully' } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'No wallet linked.', type: ApiErrorResponse })
  get(@CurrentUser() user: JwtPayload) {
    return this.walletService.get(user.sub);
  }

  @Delete()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Wallet unlinked successfully')
  @ApiOperation({ summary: 'Unlink wallet' })
  @ApiResponse({ status: 200, description: 'Wallet unlinked.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'No wallet linked.', type: ApiErrorResponse })
  remove(@CurrentUser() user: JwtPayload) {
    return this.walletService.remove(user.sub);
  }
}
