import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMonthlyRegisterDto {
  @ApiPropertyOptional({ description: 'Year e.g. 2026' })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional({ description: 'Month number 1 to 12' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ description: 'Filter by specific branch ID or "all"' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
