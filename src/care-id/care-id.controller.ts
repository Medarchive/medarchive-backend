import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { CareIdService } from './care-id.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('care-id')
@Controller('care-id')
export class CareIdController {
  constructor(private readonly careIdService: CareIdService) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Care ID generated successfully')
  @ApiOperation({
    summary: 'Generate care ID',
    description:
      'Idempotent — returns existing care ID if already generated. Format: MA-000001.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Care ID generated successfully' },
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
  generate(@CurrentUser() user: JwtPayload) {
    return this.careIdService.getOrCreate(user.sub);
  }

  @Get()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Care ID fetched successfully')
  @ApiOperation({ summary: 'Get care ID' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: { message: { example: 'Care ID fetched successfully' } },
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
    return this.careIdService.get(user.sub);
  }

  @Post('share-link')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Share link generated successfully')
  @ApiOperation({
    summary: 'Generate a shareable care identity link',
    description:
      'Returns a token valid for 24 hours. Share as /care-id/view/:token.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Share link generated successfully' },
            data: { example: { token: 'abc123...', expiresInHours: 24 } },
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
  @ApiResponse({
    status: 404,
    description: 'Care ID not generated yet.',
    type: ApiErrorResponse,
  })
  generateShareLink(@CurrentUser() user: JwtPayload) {
    return this.careIdService.generateShareLink(user.sub);
  }

  @Get('view/:token')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Care identity fetched successfully')
  @ApiOperation({
    summary: 'View shared care identity (public)',
    description: 'No auth required. Token expires after 24 hours.',
  })
  @ApiParam({ name: 'token', type: String })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Care identity fetched successfully' },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Share link invalid or expired.',
    type: ApiErrorResponse,
  })
  viewShared(@Param('token') token: string) {
    return this.careIdService.resolveShareLink(token);
  }
}
