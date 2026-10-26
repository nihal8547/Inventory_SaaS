import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLabelTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showProductName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showSku?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showBarcode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showBarcodeValue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPrice?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showCategory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customText?: string;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(24)
  fontSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
