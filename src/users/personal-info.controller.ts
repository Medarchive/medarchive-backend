import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
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
import { PersonalInfoService } from './personal-info.service';
import { PersonalInfoDto } from './dto/personal-info.dto';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/swagger/api-responses';
import type { JwtPayload } from '../auth/auth.types';

@ApiTags('personal-info')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('personal-info')
export class PersonalInfoController {
  constructor(private readonly personalInfoService: PersonalInfoService) {}

  @Post()
  @Version('1')
  @ResponseMessage('Personal information submitted successfully')
  @ApiOperation({
    summary: 'Submit personal information',
    description:
      'Creates personal information for the authenticated user. Can only be submitted once.',
  })
  @ApiBody({ type: PersonalInfoDto })
  @ApiResponse({
    status: 201,
    description: 'Personal information created.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Personal information submitted successfully' },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 409,
    description: 'Personal information already submitted.',
    type: ApiErrorResponse,
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: PersonalInfoDto) {
    return this.personalInfoService.create(user, dto);
  }

  @Patch()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Personal information updated successfully')
  @ApiOperation({
    summary: 'Update personal information',
    description:
      'Updates one or more personal information fields. Requires personal info to exist — call POST first.',
  })
  @ApiBody({ type: UpdatePersonalInfoDto })
  @ApiResponse({
    status: 200,
    description: 'Personal information updated.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponse) },
        {
          properties: {
            message: { example: 'Personal information updated successfully' },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Personal information not found.',
    type: ApiErrorResponse,
  })
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePersonalInfoDto) {
    return this.personalInfoService.update(user, dto);
  }
}
