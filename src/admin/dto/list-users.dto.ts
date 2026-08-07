import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AdminListUsersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['PATIENT', 'PROVIDER', 'ADMIN'] })
  @IsOptional()
  @IsEnum(['PATIENT', 'PROVIDER', 'ADMIN'])
  role?: 'PATIENT' | 'PROVIDER' | 'ADMIN';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
