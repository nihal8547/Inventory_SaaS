import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateRoleDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() permissionCodes?: string[];
}

class UpdateRoleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() permissionCodes?: string[];
}

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List roles' })
  findAll(@CurrentTenant() tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List all permissions' })
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.rolesService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create role' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role' })
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.rolesService.remove(tenantId, id);
  }
}
