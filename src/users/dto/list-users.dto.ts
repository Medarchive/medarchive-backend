import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum UserRoleFilter {
  PATIENT = 'PATIENT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

export enum UserSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  FULL_NAME = 'fullName',
  EMAIL = 'email',
}

export class ListUsersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: UserSortBy, default: UserSortBy.CREATED_AT, description: 'Field to sort by' })
  @IsOptional()
  @IsEnum(UserSortBy)
  sortBy: UserSortBy = UserSortBy.CREATED_AT;

  @ApiPropertyOptional({ enum: UserRoleFilter, description: 'Filter by user role' })
  @IsOptional()
  @IsEnum(UserRoleFilter)
  role?: UserRoleFilter;

  @ApiPropertyOptional({ example: 'john', description: 'Search by email (partial match)' })
  @IsOptional()
  @IsString()
  search?: string;
}
