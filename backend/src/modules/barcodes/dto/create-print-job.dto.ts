import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PrintJobItemDto {
  @ApiProperty()
  barcodeId: string;

  @ApiPropertyOptional()
  quantity?: number;
}

export class CreatePrintJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({ type: [PrintJobItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrintJobItemDto)
  items: PrintJobItemDto[];
}
