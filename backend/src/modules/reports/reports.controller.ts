import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('reports.dashboard')
  getDashboard(@CurrentTenant() tenantId: string, @Query('branchId') branchId?: string) {
    return this.reportsService.getDashboard(tenantId, branchId);
  }

  @Get('sales')
  @RequirePermissions('reports.sales')
  getSalesReport(@CurrentTenant() tenantId: string, @Query() query: { startDate?: string; endDate?: string; branchId?: string }) {
    return this.reportsService.getSalesReport(tenantId, query);
  }

  @Get('stock-valuation')
  @RequirePermissions('reports.inventory')
  getStockValuation(@CurrentTenant() tenantId: string, @Query('branchId') branchId?: string) {
    return this.reportsService.getStockValuation(tenantId, branchId);
  }

  @Get('purchases')
  @RequirePermissions('reports.purchasing')
  getPurchaseReport(@CurrentTenant() tenantId: string, @Query() query: { startDate?: string; endDate?: string }) {
    return this.reportsService.getPurchaseReport(tenantId, query);
  }

  @Post('email-report')
  @RequirePermissions('reports.sales')
  @ApiOperation({ summary: 'Dispatch executive report via email' })
  sendReportEmail(
    @CurrentTenant() tenantId: string,
    @Body() dto: { reportType: string; recipients: string[]; branchId?: string; startDate?: string; endDate?: string },
  ) {
    return this.reportsService.sendReportEmail(tenantId, dto);
  }

  @Post('email-test')
  @RequirePermissions('reports.dashboard')
  @ApiOperation({ summary: 'Trigger diagnostic test email' })
  sendTestEmail(@Body() dto: { recipients: string[]; subject?: string }) {
    return this.reportsService.sendTestEmail(dto);
  }
}
