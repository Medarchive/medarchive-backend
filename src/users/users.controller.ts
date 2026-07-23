import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginatedUsersData,
  UserProfileData,
} from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('users')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Version('1')
  @ResponseMessage('Profile retrieved successfully')
  @ApiOperation({
    summary: 'Get own profile',
    description: 'Returns the authenticated user\'s profile including their patient or provider sub-profile.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Profile retrieved successfully' },
            data: { $ref: getSchemaPath(UserProfileData) },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMe(user);
  }

  @Patch('me')
  @Version('1')
  @ResponseMessage('Profile updated successfully')
  @ApiOperation({
    summary: 'Update own profile',
    description:
      'Updates the authenticated user\'s profile fields. ' +
      'Password change requires `currentPassword`. ' +
      '`specialty` and `licenseNumber` are provider-only fields.',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Updated user profile.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Profile updated successfully' },
            data: { $ref: getSchemaPath(UserProfileData) },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'currentPassword required or validation error.', type: ApiErrorResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 403, description: 'Current password incorrect.', type: ApiErrorResponse })
  @ApiResponse({ status: 409, description: 'Email already in use.', type: ApiErrorResponse })
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(user, dto);
  }

  @Get()
  @Version('1')
  @Roles('ADMIN')
  @ResponseMessage('Users retrieved successfully')
  @ApiOperation({
    summary: '[Admin] List all users with pagination',
    description: 'Paginated list of all users. Supports filtering by role and searching by email. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated user list.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Users retrieved successfully' },
            data: { $ref: getSchemaPath(PaginatedUsersData) },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required.', type: ApiErrorResponse })
  listUsers(@Query() dto: ListUsersDto) {
    return this.usersService.listUsers(dto);
  }

  @Get(':id')
  @Version('1')
  @Roles('ADMIN')
  @ResponseMessage('User retrieved successfully')
  @ApiOperation({
    summary: '[Admin] Get user by ID',
    description: 'Retrieves a single user\'s full profile by UUID. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'User UUID (uuidv7)', example: '01960000-0000-7000-0000-000000000000' })
  @ApiResponse({
    status: 200,
    description: 'User profile.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'User retrieved successfully' },
            data: { $ref: getSchemaPath(UserProfileData) },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 403, description: 'Forbidden.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'User not found.', type: ApiErrorResponse })
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/verify-provider')
  @Version('1')
  @Roles('ADMIN')
  @ResponseMessage('Provider verified successfully')
  @ApiOperation({
    summary: '[Admin] Verify a provider account',
    description: 'Sets `verifiedAt` on the provider\'s profile. Can only be called once per provider. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'Provider user UUID', example: '01960000-0000-7000-0000-000000000000' })
  @ApiResponse({
    status: 200,
    description: 'Provider verified.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Provider verified successfully' },
            data: { example: null },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Provider already verified.', type: ApiErrorResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.', type: ApiErrorResponse })
  @ApiResponse({ status: 403, description: 'Forbidden.', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Provider profile not found.', type: ApiErrorResponse })
  verifyProvider(@Param('id') id: string) {
    return this.usersService.verifyProvider(id);
  }
}
