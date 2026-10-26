import { IsString, IsArray, IsOptional, IsNumber, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferLineDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiProperty()
  @IsNumber()
  requestedQuantity: number;
}

export class CreateStockTransferDto {
  @ApiProperty()
  @IsString()
  sourceBranchId: string;

  @ApiProperty()
  @IsString()
  destinationBranchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceWarehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destinationWarehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [TransferLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  lines: TransferLineDto[];
}

export class UpdateTransferStatusDto {
  @ApiProperty({ enum: ['APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'] })
  @IsEnum(['APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
