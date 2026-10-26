import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuoteSaleDto } from './dto/quote-sale.dto';
import { VoidSaleDto } from './dto/void-sale.dto';
import { QuerySaleDto } from './dto/query-sale.dto';
import { QueryDailyRegisterDto } from './dto/query-daily-register.dto';
import { QueryMonthlyRegisterDto } from './dto/query-monthly-register.dto';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { CreateSalesReturnDto } from './dto/sales-return.dto';
import { OpenShiftDto, CloseShiftDto } from './dto/cashier-shift.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // --- SALES & POS ---
  @Post('quote')
  @RequirePermissions('sales.read')
  @ApiOperation({ summary: 'Calculate realtime server-authoritative cart quote, taxes, and stock availability' })
  quote(@CurrentTenant() tenantId: string, @Body() dto: QuoteSaleDto) {
    return this.salesService.getSaleQuote(tenantId, dto);
  }

  @Post(['', 'checkout'])
  @RequirePermissions('sales.create')
  @ApiOperation({ summary: 'Create sale (POS checkout)' })
  create(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateSaleDto) {
    return this.salesService.create(tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('sales.read')
  @ApiOperation({ summary: 'List sales' })
  findAll(@CurrentTenant() tenantId: string, @Query() dto: QuerySaleDto) {
    return this.salesService.findAll(tenantId, dto);
  }

  // --- DAILY & MONTHLY REGISTERS ---
  @Get('daily-register')
  @RequirePermissions('sales.read')
  @ApiOperation({ summary: 'Get daily sales register with item-by-item breakdown and financial metrics' })
  getDailyRegister(@CurrentTenant() tenantId: string, @Query() dto: QueryDailyRegisterDto) {
    return this.salesService.getDailyRegister(tenantId, dto);
  }

  @Get('monthly-register')
  @RequirePermissions('sales.read')
  @ApiOperation({ summary: 'Get monthly sales register with day-by-day calendar breakdown' })
  getMonthlyRegister(@CurrentTenant() tenantId: string, @Query() dto: QueryMonthlyRegisterDto) {
    return this.salesService.getMonthlyRegister(tenantId, dto);
  }

  // --- CUSTOMER MANAGEMENT ---
  @Post('customers')
  @RequirePermissions('sales.create')
  @ApiOperation({ summary: 'Create retail customer profile' })
  createCustomer(@CurrentTenant() tenantId: string, @Body() dto: CreateCustomerDto) {
    return this.salesService.createCustomer(tenantId, dto);
  }

  @Get('customers')
  @RequirePermissions('sales.read')
  @ApiOperation({ summary: 'List customers with server-side search and pagination' })
  findCustomers(@CurrentTenant() tenantId: string, @Query() dto: PaginationDto) {
    return this.salesService.findCustomers(tenantId, dto);
  }

  @Get('customers/:id')
  @RequirePermissions('sales.read')
  @ApiOperation({ summary: 'Get customer details and past invoices' })
  findOneCustomer(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesService.findOneCustomer(tenantId, id);
  }

  @Patch('customers/:id')
  @RequirePermissions('sales.create')
  @ApiOperation({ summary: 'Update customer profile' })
  updateCustomer(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.salesService.updateCustomer(tenantId, id, dto);
  }

  @Delete('customers/:id')
  @RequirePermissions('sales.create')
  @ApiOperation({ summary: 'Deactivate customer profile' })
  deleteCustomer(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesService.deleteCustomer(tenantId, id);
  }

  // --- RETURNS & REFUNDS ---
  @Post('returns')
  @RequirePermissions('sales.create')
  @ApiOperation({ summary: 'Process sales return and item restocking refund' })
  createReturn(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateSalesReturnDto) {
    return this.salesService.createReturn(tenantId, user.id, dto);
  }

  @Get('returns')
  @RequirePermissions('sales.read')
  @ApiOperation({ summary: 'List sales returns and refunds' })
  findReturns(@CurrentTenant() tenantId: string, @Query() dto: PaginationDto & { saleId?: string }) {
    return this.salesService.findReturns(tenantId, dto);
  }

  // --- CASHIER SHIFTS ---
  @Post('shifts/open')
  @RequirePermissions('sales.create')
  @ApiOperation({ summary: 'Open cashier register shift' })
  openShift(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: OpenShiftDto) {
    return this.salesService.openShift(tenantId, user.id, dto);
  }

  @Get('shifts/current')
  @RequirePermissions('sales.read')
  @ApiOperation({ summary: 'Get current active cashier shift' })
  getCurrentShift(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Query('branchId') branchId?: string) {
    return this.salesService.getCurrentShift(tenantId, user.id, branchId);
  }

  @Post('shifts/:id/close')
  @RequirePermissions('sales.create')
  @ApiOperation({ summary: 'Close cashier shift with reconciliation' })
  closeShift(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: CloseShiftDto) {
    return this.salesService.closeShift(tenantId, user.id, id, dto);
  }

  // --- SINGLE SALE & VOID ---
  @Get(':id')
  @RequirePermissions('sales.read')
  @ApiOperation({ summary: 'Get sale by id' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesService.findOne(tenantId, id);
  }

  @Post(':id/void')
  @Patch(':id/void')
  @RequirePermissions('sales.void')
  @ApiOperation({ summary: 'Void sale' })
  voidSale(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: VoidSaleDto) {
    return this.salesService.voidSale(tenantId, id, user.id, dto);
  }
}
