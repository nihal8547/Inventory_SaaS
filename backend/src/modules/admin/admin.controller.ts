import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateTenantDto, UpdateTenantDto, UpdateBranchQuotaDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SuperAdminOnly } from '../../common/decorators/permissions.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SuperAdminOnly()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform statistics & live system health telemetry' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('plans')
  @ApiOperation({ summary: 'List SaaS subscription plans & subscriber counts' })
  getPlans() {
    return this.adminService.getPlans();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants with advanced metrics' })
  findTenants(@Query() dto: PaginationDto) {
    return this.adminService.findTenants(dto);
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get full tenant 360 overview' })
  getTenant(@Param('id') id: string) {
    return this.adminService.getTenant(id);
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Provision new tenant organization with admin credentials' })
  createTenant(@Body() dto: CreateTenantDto) {
    return this.adminService.createTenant(dto);
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Update tenant organization details and tier plan' })
  updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.adminService.updateTenant(id, dto);
  }

  @Patch('tenants/:id/branch-quota')
  @ApiOperation({ summary: 'Update tenant allowed branches and extra branch quota' })
  updateBranchQuota(@Param('id') id: string, @Body() dto: UpdateBranchQuotaDto) {
    return this.adminService.updateBranchQuota(id, dto);
  }

  @Delete('tenants/:id')
  @ApiOperation({ summary: 'Delete tenant organization' })
  deleteTenant(@Param('id') id: string) {
    return this.adminService.deleteTenant(id);
  }

  @Post('tenants/:id/suspend')
  @ApiOperation({ summary: 'Suspend tenant' })
  suspendTenant(@Param('id') id: string) {
    return this.adminService.suspendTenant(id);
  }

  @Post('tenants/:id/activate')
  @ApiOperation({ summary: 'Activate tenant' })
  activateTenant(@Param('id') id: string) {
    return this.adminService.activateTenant(id);
  }
}
