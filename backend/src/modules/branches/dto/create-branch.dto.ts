import { IsString, IsOptional, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ example: 'Al Khor Retail Branch' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  // --- Branch Manager Access Credentials ---
  @ApiPropertyOptional({ example: 'manager.khor@demoretail.qa' })
  @IsOptional()
  @IsString()
  managerEmail?: string;

  @ApiPropertyOptional({ example: 'Manager123!' })
  @IsOptional()
  @IsString()
  managerPassword?: string;

  @ApiPropertyOptional({ example: 'Khalid Al-Kuwari' })
  @IsOptional()
  @IsString()
  managerName?: string;

  @ApiPropertyOptional({ example: 'Manager' })
  @IsOptional()
  @IsString()
  roleName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sendCredentialsEmail?: boolean;
}

export class AssignBranchStaffDto {
  @ApiProperty({ example: 'staff.lusail@store.qa' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ example: 'Staff123!' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: 'Ahmed Al-Thani' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Cashier' })
  @IsOptional()
  @IsString()
  roleName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sendCredentialsEmail?: boolean;
}

export class ResendStaffCredentialsDto {
  @ApiProperty({ example: 'user-id-or-email' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: 'NewPass123!' })
  @IsOptional()
  @IsString()
  newPassword?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}
