import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class VoidSaleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
