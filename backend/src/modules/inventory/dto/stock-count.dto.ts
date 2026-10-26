import { IsString, IsArray, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CountLineDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiProperty()
  @IsNumber()
  countedQuantity: number;
}

export class CreateStockCountDto {
  @ApiProperty()
  @IsString()
  branchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitStockCountDto {
  @ApiProperty({ type: [CountLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountLineDto)
  lines: CountLineDto[];
}
