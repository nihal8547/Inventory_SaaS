import { IsString, IsNotEmpty, IsOptional, IsEmail, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Sheikh Nasser Al-Thani' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'nasser.thani@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+974 5511 2233' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'West Bay Lagoon, Villa 12, Doha' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  loyaltyPoints?: number;
}

export class UpdateCustomerDto extends CreateCustomerDto {}
