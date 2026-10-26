import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenShiftDto {
  @ApiProperty({ example: 'branch-uuid' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  openingCash: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseShiftDto {
  @ApiProperty({ example: 5200 })
  @IsNumber()
  @Min(0)
  closingCash: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
