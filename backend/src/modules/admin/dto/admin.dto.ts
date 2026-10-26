import { IsString, IsOptional, MinLength, MaxLength, IsEmail, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Qatar Luxe Retail' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'qatar-luxe' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'QAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'GROWTH' })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({ example: 'Doha' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'admin@qatarluxe.qa' })
  @IsEmail()
  adminEmail: string;

  @ApiPropertyOptional({ example: 'Hamad Al-Thani' })
  @IsOptional()
  @IsString()
  adminName?: string;

  @ApiPropertyOptional({ example: 'Admin123!' })
  @IsOptional()
  @IsString()
  adminPassword?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sendWelcomeEmail?: boolean;
}

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxBranches?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  extraBranches?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allowExtraBranches?: boolean;
}

export class UpdateBranchQuotaDto {
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxBranches?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  extraBranches?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allowExtraBranches?: boolean;
}
