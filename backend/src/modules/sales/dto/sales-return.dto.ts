import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReturnLineDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Optional unit price override (ignored by server in favor of original sale line price)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreateSalesReturnDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  saleId: string;

  @ApiPropertyOptional({ example: 'Customer requested refund for unopened unit' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ type: [ReturnLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnLineDto)
  lines: ReturnLineDto[];
}
