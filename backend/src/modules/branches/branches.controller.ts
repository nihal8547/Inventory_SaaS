import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto, AssignBranchStaffDto, ResendStaffCredentialsDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @RequirePermissions('branches.create')
  @ApiOperation({ summary: 'Create branch' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions('branches.read')
  @ApiOperation({ summary: 'List branches' })
  findAll(@CurrentTenant() tenantId: string, @Query() dto: PaginationDto) {
    return this.branchesService.findAll(tenantId, dto);
  }

  @Get('quota')
  @RequirePermissions('branches.read')
  @ApiOperation({ summary: 'Get branch allocation and usage quota' })
  getQuota(@CurrentTenant() tenantId: string) {
    return this.branchesService.getQuota(tenantId);
  }

  @Get(':id')
  @RequirePermissions('branches.read')
  @ApiOperation({ summary: 'Get branch by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.branchesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('branches.update')
  @ApiOperation({ summary: 'Update branch' })
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(tenantId, id, dto);
  }

  @Patch(':id/set-default')
  @RequirePermissions('branches.update')
  @ApiOperation({ summary: 'Set default branch' })
  setDefault(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.branchesService.setDefault(tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('branches.delete')
  @ApiOperation({ summary: 'Deactivate branch' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.branchesService.remove(tenantId, id);
  }

  @Post(':id/warehouses')
  @RequirePermissions('branches.update')
  @ApiOperation({ summary: 'Create warehouse in branch' })
  createWarehouse(@CurrentTenant() tenantId: string, @Param('id') branchId: string, @Body() dto: CreateWarehouseDto) {
    return this.branchesService.createWarehouse(tenantId, branchId, dto);
  }

  @Get(':id/warehouses')
  @RequirePermissions('branches.read')
  @ApiOperation({ summary: 'List warehouses in branch' })
  getWarehouses(@CurrentTenant() tenantId: string, @Param('id') branchId: string) {
    return this.branchesService.getWarehouses(tenantId, branchId);
  }

  @Get(':id/access')
  @RequirePermissions('branches.read')
  @ApiOperation({ summary: 'List staff with access to branch' })
  getBranchStaff(@CurrentTenant() tenantId: string, @Param('id') branchId: string) {
    return this.branchesService.getBranchStaff(tenantId, branchId);
  }

  @Post(':id/access')
  @RequirePermissions('branches.update')
  @ApiOperation({ summary: 'Assign staff to branch with email credentials' })
  assignBranchStaff(
    @CurrentTenant() tenantId: string,
    @Param('id') branchId: string,
    @Body() dto: AssignBranchStaffDto,
  ) {
    return this.branchesService.assignBranchStaff(tenantId, branchId, dto);
  }

  @Delete(':id/access/:userId')
  @RequirePermissions('branches.update')
  @ApiOperation({ summary: 'Remove staff access from branch' })
  removeBranchStaff(
    @CurrentTenant() tenantId: string,
    @Param('id') branchId: string,
    @Param('userId') userId: string,
  ) {
    return this.branchesService.removeBranchStaff(tenantId, branchId, userId);
  }

  @Post(':id/access/resend')
  @RequirePermissions('branches.update')
  @ApiOperation({ summary: 'Resend credentials email to staff member' })
  resendCredentials(
    @CurrentTenant() tenantId: string,
    @Param('id') branchId: string,
    @Body() dto: ResendStaffCredentialsDto,
  ) {
    return this.branchesService.resendStaffCredentials(tenantId, branchId, dto);
  }
}
