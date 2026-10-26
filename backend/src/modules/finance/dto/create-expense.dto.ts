import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Store Rent & Lease' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Qatar Real Estate Co.' })
  @IsString()
  @IsNotEmpty()
  payee: string;

  @ApiProperty({ example: 12500 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'Bank Transfer (QNB)' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsString()
  expenseDate?: string;

  @ApiPropertyOptional({ example: 'Monthly showroom retail lease' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
