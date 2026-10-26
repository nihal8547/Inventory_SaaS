import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BarcodeFormat } from './generate-barcode.dto';

export class AssignBarcodeDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsString()
  barcodeValue: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiPropertyOptional({ enum: BarcodeFormat, default: BarcodeFormat.CODE128 })
  @IsOptional()
  @IsEnum(BarcodeFormat)
  format?: BarcodeFormat = BarcodeFormat.CODE128;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
