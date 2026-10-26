import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PurchasingService } from './purchasing.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Purchasing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchasing')
export class PurchasingController {
  constructor(private readonly purchasingService: PurchasingService) {}

  // Suppliers
  @Post('suppliers')
  @RequirePermissions('purchasing.suppliers.create')
  createSupplier(@CurrentTenant() tenantId: string, @Body() dto: CreateSupplierDto) {
    return this.purchasingService.createSupplier(tenantId, dto);
  }

  @Get('suppliers')
  @RequirePermissions('purchasing.read')
  findSuppliers(@CurrentTenant() tenantId: string, @Query() dto: PaginationDto) {
    return this.purchasingService.findSuppliers(tenantId, dto);
  }

  @Get('suppliers/:id')
  @RequirePermissions('purchasing.read')
  findOneSupplier(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.purchasingService.findOneSupplier(tenantId, id);
  }

  @Patch('suppliers/:id')
  @RequirePermissions('purchasing.suppliers.create')
  updateSupplier(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateSupplierDto>) {
    return this.purchasingService.updateSupplier(tenantId, id, dto);
  }

  @Delete('suppliers/:id')
  @RequirePermissions('purchasing.suppliers.create')
  deleteSupplier(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.purchasingService.deleteSupplier(tenantId, id);
  }

  // Purchase Orders
  @Post('orders')
  @RequirePermissions('purchasing.orders.create')
  createPurchaseOrder(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchasingService.createPurchaseOrder(tenantId, user.id, dto);
  }

  @Get('orders')
  @RequirePermissions('purchasing.read')
  findPurchaseOrders(@CurrentTenant() tenantId: string, @Query() dto: PaginationDto & { status?: string; branchId?: string; supplierId?: string }) {
    return this.purchasingService.findPurchaseOrders(tenantId, dto);
  }

  @Get('orders/:id')
  @RequirePermissions('purchasing.read')
  findOnePurchaseOrder(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.purchasingService.findOnePurchaseOrder(tenantId, id);
  }

  @Patch('orders/:id/approve')
  @RequirePermissions('purchasing.orders.approve')
  approvePurchaseOrder(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: any) {
    return this.purchasingService.approvePurchaseOrder(tenantId, id, user.id);
  }

  // Goods Receipt
  @Post('receipts')
  @RequirePermissions('purchasing.orders.receive')
  receiveGoods(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: ReceiveGoodsDto) {
    return this.purchasingService.receiveGoods(tenantId, user.id, dto);
  }

  @Post('receive')
  @RequirePermissions('purchasing.orders.receive')
  receiveGoodsAlias(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: ReceiveGoodsDto) {
    return this.purchasingService.receiveGoods(tenantId, user.id, dto);
  }
}
