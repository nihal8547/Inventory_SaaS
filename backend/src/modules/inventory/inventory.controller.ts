import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateStockAdjustmentDto } from './dto/stock-adjustment.dto';
import { CreateStockTransferDto, UpdateTransferStatusDto } from './dto/stock-transfer.dto';
import { CreateStockCountDto, SubmitStockCountDto } from './dto/stock-count.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock')
  @RequirePermissions('inventory.read')
  getStock(@CurrentTenant() tenantId: string, @Query() query: PaginationDto & { branchId?: string; productId?: string; warehouseId?: string; search?: string }) {
    return this.inventoryService.getStock(tenantId, query);
  }

  @Get('ledger')
  @RequirePermissions('inventory.read')
  getLedger(@CurrentTenant() tenantId: string, @Query() query: PaginationDto & { branchId?: string; productId?: string }) {
    return this.inventoryService.getLedger(tenantId, query);
  }

  @Get('adjustments')
  @RequirePermissions('inventory.read')
  findAdjustments(@CurrentTenant() tenantId: string, @Query() query: PaginationDto & { branchId?: string; search?: string }) {
    return this.inventoryService.findAdjustments(tenantId, query);
  }

  @Get('adjustments/:id')
  @RequirePermissions('inventory.read')
  findOneAdjustment(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.findOneAdjustment(tenantId, id);
  }

  @Post('adjustments')
  @RequirePermissions('inventory.adjust')
  createAdjustment(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateStockAdjustmentDto) {
    return this.inventoryService.createAdjustment(tenantId, user.id, dto);
  }

  @Post('adjust')
  @RequirePermissions('inventory.adjust')
  createAdjustmentAlias(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateStockAdjustmentDto) {
    return this.inventoryService.createAdjustment(tenantId, user.id, dto);
  }

  @Post('transfers')
  @RequirePermissions('inventory.transfer.create')
  createTransfer(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateStockTransferDto) {
    return this.inventoryService.createTransfer(tenantId, user.id, dto);
  }

  @Get('transfers')
  @RequirePermissions('inventory.read')
  findTransfers(@CurrentTenant() tenantId: string, @Query() dto: PaginationDto & { status?: string; sourceBranchId?: string; destinationBranchId?: string }) {
    return this.inventoryService.findTransfers(tenantId, dto);
  }

  @Patch('transfers/:id/status')
  @RequirePermissions('inventory.transfer.approve')
  updateTransferStatus(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateTransferStatusDto) {
    return this.inventoryService.updateTransferStatus(tenantId, id, user.id, dto);
  }

  @Post('stock-counts')
  @RequirePermissions('inventory.stock-count.create')
  createStockCount(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateStockCountDto) {
    return this.inventoryService.createStockCount(tenantId, user.id, dto);
  }

  @Get('stock-counts')
  @RequirePermissions('inventory.read')
  findStockCounts(@CurrentTenant() tenantId: string, @Query() dto: PaginationDto & { status?: string; branchId?: string }) {
    return this.inventoryService.findStockCounts(tenantId, dto);
  }

  @Post('stock-counts/:id/submit')
  @Patch('stock-counts/:id/submit')
  @RequirePermissions('inventory.stock-count.create')
  submitStockCount(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: SubmitStockCountDto) {
    return this.inventoryService.submitStockCount(tenantId, id, user.id, dto);
  }

  @Post('stock-counts/:id/approve')
  @Patch('stock-counts/:id/approve')
  @RequirePermissions('inventory.stock-count.approve')
  approveStockCount(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: any) {
    return this.inventoryService.approveStockCount(tenantId, id, user.id);
  }
}
