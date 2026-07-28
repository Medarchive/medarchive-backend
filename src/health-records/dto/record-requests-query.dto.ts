import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class RecordRequestsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['PENDING', 'APPROVED', 'DECLINED'],
    description: 'Filter by request status',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'DECLINED'])
  status?: 'PENDING' | 'APPROVED' | 'DECLINED';
}
