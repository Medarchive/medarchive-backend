import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { HealthRecordType } from './create-health-record.dto';

export enum HealthRecordSortBy {
  CREATED_AT = 'createdAt',
  RECORD_DATE = 'recordDate',
}

export class HealthRecordsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: HealthRecordType,
    description: 'Filter by record type',
  })
  @IsOptional()
  @IsEnum(HealthRecordType)
  recordType?: HealthRecordType;

  @ApiPropertyOptional({
    example: 'blood test',
    description: 'Search by title (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Filter records on or after this date (uses recordDate)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Filter records on or before this date (uses recordDate)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: HealthRecordSortBy,
    default: HealthRecordSortBy.CREATED_AT,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(HealthRecordSortBy)
  sortBy: HealthRecordSortBy = HealthRecordSortBy.CREATED_AT;
}
