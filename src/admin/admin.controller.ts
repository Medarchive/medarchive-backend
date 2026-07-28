import { Body, Controller, Post, UseGuards, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateInviteDto } from './dto/create-invite.dto';
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

@ApiTags('admin')
@ApiBearerAuth('jwt')
@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('invites')
  @Version('1')
  @ResponseMessage('Provider invitation sent successfully')
  @ApiOperation({
    summary: 'Invite a provider',
    description:
      'Generates a one-time activation link and sends it to the specified email. Link expires in 7 days. Admin only.',
  })
  @ApiBody({ type: CreateInviteDto })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent. Returns invite metadata (never the token).',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Provider invitation sent successfully' },
            data: {
              example: {
                email: 'dr.okonkwo@hospital.ng',
                name: 'Dr. Okonkwo',
                expiresAt: '2026-08-03T00:00:00.000Z',
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 409,
    description: 'A user with this email already exists.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — admin role required.',
    type: ApiErrorResponse,
  })
  createInvite(@CurrentUser() user: JwtPayload, @Body() dto: CreateInviteDto) {
    return this.adminService.createProviderInvite(dto, user.sub);
  }
}
