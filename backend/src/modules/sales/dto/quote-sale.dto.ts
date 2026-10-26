import { IsString, IsArray, IsOptional, IsNumber, ValidateNested, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuoteLineDto {
  @ApiProperty({ description: 'Catalog Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'Optional Variant ID' })
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiProperty({ example: 1, description: 'Requested Quantity' })
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @ApiPropertyOptional({ default: 0, description: 'Requested discount amount in QAR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class QuoteSaleDto {
  @ApiProperty({ description: 'Branch / Store ID where sale will be fulfilled' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ type: [QuoteLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  lines: QuoteLineDto[];
}
