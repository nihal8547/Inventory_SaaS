import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class InviteUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiProperty() @IsString() roleId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() password?: string;
}

class UpdateMembershipDto {
  @ApiPropertyOptional() @IsOptional() @IsString() roleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  findMembers(@CurrentTenant() tenantId: string, @Query() dto: PaginationDto & { roleId?: string; status?: string }) {
    return this.usersService.findMembers(tenantId, dto);
  }

  @Get('members')
  @RequirePermissions('users.read')
  findMembersAlias(@CurrentTenant() tenantId: string, @Query() dto: PaginationDto & { roleId?: string; status?: string }) {
    return this.usersService.findMembers(tenantId, dto);
  }

  @Post('invite')
  @RequirePermissions('users.invite')
  inviteUser(@CurrentTenant() tenantId: string, @Body() dto: InviteUserDto) {
    return this.usersService.inviteUser(tenantId, dto);
  }

  @Patch([':userId/membership', 'members/:userId'])
  @RequirePermissions('users.update')
  updateMembership(@CurrentTenant() tenantId: string, @Param('userId') userId: string, @Body() dto: UpdateMembershipDto) {
    return this.usersService.updateMembership(tenantId, userId, dto);
  }

  @Delete([':userId/membership', 'members/:userId'])
  @RequirePermissions('users.delete')
  removeMembership(@CurrentTenant() tenantId: string, @Param('userId') userId: string) {
    return this.usersService.removeMembership(tenantId, userId);
  }
}
