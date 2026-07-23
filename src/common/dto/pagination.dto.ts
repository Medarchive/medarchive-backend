import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Records per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take: number = 20;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC, description: 'Sort direction' })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}

export interface PaginationMeta {
  totalCount: number;
  currentCount: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function buildMeta(totalCount: number, page: number, take: number, currentCount: number): PaginationMeta {
  const totalPages = Math.ceil(totalCount / take);
  return {
    totalCount,
    currentCount,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}
