import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDailyRegisterDto {
  @ApiPropertyOptional({ description: 'Date in YYYY-MM-DD format (default: today)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Filter by specific branch ID or "all"' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filter by specific cashier ID' })
  @IsOptional()
  @IsString()
  cashierId?: string;
}
