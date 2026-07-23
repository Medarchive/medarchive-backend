import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiSuccessResponse<T = unknown> {
  @ApiProperty({ example: 200 })
  declare statusCode: number;

  @ApiProperty({ example: 'Success' })
  declare message: string;

  @ApiProperty({ example: '2026-07-23T10:00:00.000Z' })
  declare timestamp: string;

  @ApiPropertyOptional()
  declare data: T | null;
}

export class ApiErrorResponse {
  @ApiProperty({ example: 400 })
  declare statusCode: number;

  @ApiProperty({ example: 'Validation failed.' })
  declare message: string;

  @ApiProperty({ example: '2026-07-23T10:00:00.000Z' })
  declare timestamp: string;

  @ApiPropertyOptional({
    example: 'email must be an email',
    description: 'Single validation error string (present on 400/422 only)',
  })
  declare error: string;
}

export class RegisterResponseData {
  @ApiProperty({ example: 60, description: 'Seconds to wait before requesting another OTP' })
  declare resendAfterSeconds: number;
}

export class OtpResendData {
  @ApiProperty({ example: 60 })
  declare resendAfterSeconds: number;
}

export class LoginWithTokensData {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  declare accessToken: string;

  @ApiProperty({ example: '01960000-0000-7000-0000-000000000000' })
  declare refreshToken: string;

  @ApiProperty({ example: 900 })
  declare expiresIn: number;

  @ApiProperty({ example: false })
  declare walletRequired: boolean;
}

export class LoginWithNonceData {
  @ApiProperty({ example: '01960000-0000-7000-0000-000000000000', description: 'Nonce to sign with Stellar keypair' })
  declare nonce: string;

  @ApiProperty({ example: true })
  declare walletRequired: boolean;
}

export class AuthTokensData {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  declare accessToken: string;

  @ApiProperty({ example: '01960000-0000-7000-0000-000000000000' })
  declare refreshToken: string;

  @ApiProperty({ example: 900 })
  declare expiresIn: number;
}

export class PatientProfileData {
  @ApiProperty({ example: '01960000-0000-7000-0000-000000000001' })
  declare id: string;

  @ApiProperty({ example: '01960000-0000-7000-0000-000000000002' })
  declare userId: string;

  @ApiProperty({ example: '01960000-0000-7000-0000-000000000003', description: 'Unique care identifier' })
  declare careId: string;

  @ApiProperty({ example: '2026-07-23T10:00:00.000Z' })
  declare createdAt: string;

  @ApiProperty({ example: '2026-07-23T10:00:00.000Z' })
  declare updatedAt: string;
}

export class ProviderProfileData {
  @ApiProperty({ example: '01960000-0000-7000-0000-000000000001' })
  declare id: string;

  @ApiProperty({ example: '01960000-0000-7000-0000-000000000002' })
  declare userId: string;

  @ApiPropertyOptional({ example: 'Cardiology' })
  declare specialty: string | null;

  @ApiPropertyOptional({ example: 'LIC-12345' })
  declare licenseNumber: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  declare verifiedAt: string | null;

  @ApiProperty({ example: '2026-07-23T10:00:00.000Z' })
  declare createdAt: string;

  @ApiProperty({ example: '2026-07-23T10:00:00.000Z' })
  declare updatedAt: string;
}

export class UserProfileData {
  @ApiProperty({ example: '01960000-0000-7000-0000-000000000000' })
  declare id: string;

  @ApiProperty({ example: 'John Doe' })
  declare fullName: string;

  @ApiProperty({ example: 'patient@example.com' })
  declare email: string;

  @ApiPropertyOptional({ example: '+2348012345678', nullable: true })
  declare phone: string | null;

  @ApiProperty({ example: 'PATIENT', enum: ['PATIENT', 'PROVIDER', 'ADMIN'] })
  declare role: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  declare walletAddress: string | null;

  @ApiPropertyOptional({ example: '2026-07-23T10:00:00.000Z', nullable: true })
  declare emailVerifiedAt: string | null;

  @ApiProperty({ example: '2026-07-23T10:00:00.000Z' })
  declare createdAt: string;

  @ApiProperty({ example: '2026-07-23T10:00:00.000Z' })
  declare updatedAt: string;

  @ApiPropertyOptional({ type: () => PatientProfileData, nullable: true })
  declare profile: PatientProfileData | ProviderProfileData | null;
}

export class PaginationMetaData {
  @ApiProperty({ example: 142 })
  declare totalCount: number;

  @ApiProperty({ example: 20 })
  declare currentCount: number;

  @ApiProperty({ example: 1 })
  declare page: number;

  @ApiProperty({ example: 8 })
  declare totalPages: number;

  @ApiProperty({ example: true })
  declare hasNext: boolean;

  @ApiProperty({ example: false })
  declare hasPrevious: boolean;
}

export class PaginatedUsersData {
  @ApiProperty({ type: [UserProfileData] })
  declare data: UserProfileData[];

  @ApiProperty({ type: PaginationMetaData })
  declare meta: PaginationMetaData;
}
