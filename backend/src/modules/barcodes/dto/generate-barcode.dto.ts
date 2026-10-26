import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BarcodeFormat {
  CODE128 = 'CODE128',
  EAN13 = 'EAN13',
  EAN8 = 'EAN8',
  UPCA = 'UPCA',
  UPCE = 'UPCE',
  CODE39 = 'CODE39',
  QR_CODE = 'QR_CODE',
}

export class GenerateBarcodeDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiPropertyOptional({ enum: BarcodeFormat, default: BarcodeFormat.EAN13 })
  @IsOptional()
  @IsEnum(BarcodeFormat)
  format?: BarcodeFormat = BarcodeFormat.EAN13;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
