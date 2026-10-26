import { IsString, IsNumber, IsBoolean, IsOptional, IsEmail, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SmtpConfigDto {
  @ApiProperty({ example: 'smtp.gmail.com' })
  @IsString()
  host: string;

  @ApiProperty({ example: 587 })
  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  secure: boolean;

  @ApiProperty({ example: 'notifications@yourstore.qa' })
  @IsString()
  user: string;

  @ApiPropertyOptional({ example: 'app-password-here' })
  @IsOptional()
  @IsString()
  pass?: string;

  @ApiProperty({ example: 'InventoryOS Qatar Alerts' })
  @IsString()
  fromName: string;

  @ApiProperty({ example: 'no-reply@yourstore.qa' })
  @IsEmail()
  fromEmail: string;
}

export class TestEmailDto {
  @ApiProperty({ example: 'admin@yourstore.qa' })
  @IsEmail()
  targetEmail: string;

  @ApiPropertyOptional()
  @IsOptional()
  config?: SmtpConfigDto;
}
