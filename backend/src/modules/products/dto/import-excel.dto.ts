import { IsString, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DuplicateHandlingMode {
  SKIP = 'SKIP',
  UPDATE_INFO_ADD_STOCK = 'UPDATE_INFO_ADD_STOCK',
  UPDATE_INFO_REPLACE_STOCK = 'UPDATE_INFO_REPLACE_STOCK',
  UPDATE_INFO_ONLY = 'UPDATE_INFO_ONLY',
}

export class ExcelItemRowDto {
  @ApiProperty({ description: 'Product name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Unique Stock Keeping Unit' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Barcode value' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ description: 'Category name' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Brand name' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Cost price in QAR' })
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Selling price in QAR' })
  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @ApiPropertyOptional({ description: 'VAT / Tax percentage rate' })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Initial stock on hand' })
  @IsOptional()
  @IsNumber()
  initialStock?: number;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ImportExcelDto {
  @ApiProperty({ description: 'Target branch ID where stock is initialized' })
  @IsString()
  branchId: string;

  @ApiPropertyOptional({
    enum: DuplicateHandlingMode,
    default: DuplicateHandlingMode.UPDATE_INFO_ADD_STOCK,
    description: 'Deduplication strategy for matching items',
  })
  @IsOptional()
  @IsEnum(DuplicateHandlingMode)
  duplicateMode?: DuplicateHandlingMode = DuplicateHandlingMode.UPDATE_INFO_ADD_STOCK;

  @ApiPropertyOptional({
    type: [ExcelItemRowDto],
    description: 'Parsed rows payload (if parsed client-side)',
  })
  @IsOptional()
  @IsArray()
  items?: ExcelItemRowDto[];
}
