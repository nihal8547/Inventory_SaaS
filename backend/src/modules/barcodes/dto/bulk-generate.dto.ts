import { IsArray, ValidateNested, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenerateBarcodeDto } from './generate-barcode.dto';
import { BarcodeFormat } from './generate-barcode.dto';

export class BulkGenerateItemDto {
  @ApiProperty()
  productId: string;

  @ApiPropertyOptional()
  productVariantId?: string;

  @ApiPropertyOptional({ enum: BarcodeFormat })
  format?: BarcodeFormat;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quantity?: number = 1;
}

export class BulkGenerateDto {
  @ApiProperty({ type: [BulkGenerateItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkGenerateItemDto)
  items: BulkGenerateItemDto[];
}
