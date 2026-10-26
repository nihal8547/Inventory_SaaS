import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('expenses')
  @ApiOperation({ summary: 'Record operational expense voucher' })
  createExpense(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.financeService.createExpense(tenantId, user.id, dto);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'List expenses with server-side pagination and filters' })
  findAllExpenses(
    @CurrentTenant() tenantId: string,
    @Query() dto: QueryExpenseDto,
  ) {
    return this.financeService.findAllExpenses(tenantId, dto);
  }

  @Delete('expenses/:id')
  @ApiOperation({ summary: 'Delete expense voucher' })
  deleteExpense(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.financeService.deleteExpense(tenantId, id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get financial P&L summary, revenue, COGS, and accounts overview' })
  getFinancialSummary(
    @CurrentTenant() tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.financeService.getFinancialSummary(tenantId, branchId);
  }
}
