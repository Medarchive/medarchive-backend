import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { WalletNonceDto, WalletLoginDto } from './dto/wallet-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
  AuthTokensData,
  LoginWithTokensData,
  OtpResendData,
  RegisterResponseData,
} from '../common/swagger/api-responses';
import type { JwtPayload } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Version('1')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ResponseMessage(
    'Registration successful. Check your email for a verification OTP.',
  )
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a patient or provider account and sends a 6-digit OTP to the provided email for verification.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User created. OTP sent to email.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            statusCode: { example: 201 },
            message: {
              example:
                'Registration successful. Check your email for a verification OTP.',
            },
            data: { $ref: getSchemaPath(RegisterResponseData) },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests.',
    type: ApiErrorResponse,
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('validate-otp')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ResponseMessage('Email verified successfully')
  @ApiOperation({
    summary: 'Verify email with OTP',
    description:
      "Validates the 6-digit OTP sent to the user's email. OTP expires after 10 minutes.",
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email successfully verified.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Email verified successfully' },
            data: { example: null },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired OTP.',
    type: ApiErrorResponse,
  })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.otp);
  }

  @Post('resend-otp')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 3, ttl: 60_000 } })
  @ResponseMessage('OTP resent successfully')
  @ApiOperation({
    summary: 'Resend email OTP',
    description:
      'Resends a new 6-digit OTP. Subject to a 60-second resend cooldown.',
  })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent. Returns seconds until another resend is allowed.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'OTP resent successfully' },
            data: { $ref: getSchemaPath(OtpResendData) },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cooldown active, email not found, or already verified.',
    type: ApiErrorResponse,
  })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.email);
  }

  @Post('login')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ResponseMessage('Login successful')
  @ApiOperation({
    summary: 'Login',
    description: 'Validates email and password. Returns JWT tokens.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Credentials valid. Returns JWT tokens.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Login successful' },
            data: { $ref: getSchemaPath(LoginWithTokensData) },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or email not verified.',
    type: ApiErrorResponse,
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('wallet-nonce')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ResponseMessage('Nonce generated successfully')
  @ApiOperation({
    summary: 'Get wallet login nonce',
    description: 'Takes a wallet address, returns a nonce to sign. Proceed to POST /auth/use-wallet.',
  })
  @ApiBody({ type: WalletNonceDto })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        { properties: { message: { example: 'Nonce generated successfully' }, data: { example: { nonce: '01960000-0000-7000-0000-000000000000' } } } },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'No wallet found for this address.', type: ApiErrorResponse })
  walletNonce(@Body() dto: WalletNonceDto) {
    return this.authService.walletNonce(dto.address);
  }

  @Post('use-wallet')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ResponseMessage('Login successful')
  @ApiOperation({
    summary: 'Login with Stellar wallet',
    description: 'Sign the nonce from POST /auth/wallet-nonce with your Stellar private key and submit here. Wallet must be verified (POST /wallet/verify) before this works.',
  })
  @ApiBody({ type: WalletLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Wallet verified. Returns JWT tokens.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Login successful' },
            data: { $ref: getSchemaPath(AuthTokensData) },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid nonce / bad signature / wallet not verified.', type: ApiErrorResponse })
  useWallet(@Body() dto: WalletLoginDto) {
    return this.authService.walletLogin(dto.address, dto.nonce, dto.signature);
  }

  @Post('refresh')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ResponseMessage('Token refreshed successfully')
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchanges a valid refresh token for a new access + refresh token pair. The old refresh token is revoked (rotation).',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({
    status: 200,
    description: 'New token pair issued.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Token refreshed successfully' },
            data: { $ref: getSchemaPath(AuthTokensData) },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalid, expired, or already revoked.',
    type: ApiErrorResponse,
  })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ResponseMessage('Logged out successfully')
  @ApiOperation({
    summary: 'Logout',
    description:
      'Revokes the provided refresh token. Requires a valid access token in the Authorization header.',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({
    status: 200,
    description: 'Refresh token revoked.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Logged out successfully' },
            data: { example: null },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token.',
    type: ApiErrorResponse,
  })
  logout(@Body() dto: RefreshDto, @CurrentUser() _user: JwtPayload) {
    return this.authService.logout(dto.refreshToken);
  }
}
