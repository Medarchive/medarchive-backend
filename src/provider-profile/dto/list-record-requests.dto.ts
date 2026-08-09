import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListRecordRequestsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'DECLINED', 'REVOKED'] })
  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'DECLINED', 'REVOKED'])
  status?: 'PENDING' | 'APPROVED' | 'DECLINED' | 'REVOKED';
}
