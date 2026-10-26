import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async getDashboard(tenantId: string, branchId?: string) {
    const branchFilter = branchId && branchId !== 'ALL' && branchId !== 'all' ? { branchId } : {};
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const startOfYesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const endOfYesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    const fourteenDaysAgo = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      todaySalesAgg,
      yesterdaySalesAgg,
      monthSalesAgg,
      lastMonthSalesAgg,
      stockBalances,
      recentSales,
      topSaleLines,
      past14DaysSales,
      paymentMethodStats,
      pendingTransfers,
      pendingPOs,
      pendingGoodsReceipts,
      totalCustomers,
      branches,
    ] = await Promise.all([
      // 1. Total active products
      this.prisma.product.count({ where: { tenantId, isActive: true } }),

      // 2. Today's sales aggregate
      this.prisma.sale.aggregate({
        where: { tenantId, ...branchFilter, status: 'COMPLETED', createdAt: { gte: startOfDay, lte: endOfDay } },
        _count: { id: true },
        _sum: { total: true, subtotal: true, tax: true, discount: true },
        _avg: { total: true },
      }),

      // 3. Yesterday's sales aggregate
      this.prisma.sale.aggregate({
        where: { tenantId, ...branchFilter, status: 'COMPLETED', createdAt: { gte: startOfYesterday, lte: endOfYesterday } },
        _count: { id: true },
        _sum: { total: true },
      }),

      // 4. This month's sales aggregate
      this.prisma.sale.aggregate({
        where: { tenantId, ...branchFilter, status: 'COMPLETED', createdAt: { gte: startOfMonth } },
        _count: { id: true },
        _sum: { total: true, subtotal: true, tax: true, discount: true },
        _avg: { total: true },
      }),

      // 5. Last month's sales aggregate
      this.prisma.sale.aggregate({
        where: { tenantId, ...branchFilter, status: 'COMPLETED', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _count: { id: true },
        _sum: { total: true },
      }),

      // 6. Stock balances with product, category, and branch details
      this.prisma.stockBalance.findMany({
        where: { tenantId, ...branchFilter },
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true } },
            },
          },
          branch: { select: { id: true, name: true, code: true } },
        },
      }),

      // 7. Recent Sales (last 6 transactions)
      this.prisma.sale.findMany({
        where: { tenantId, ...branchFilter },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          cashier: { select: { id: true, firstName: true, lastName: true } },
          branch: { select: { id: true, name: true } },
          payments: { select: { method: true, amount: true } },
        },
      }),

      // 8. Top sold product lines
      this.prisma.saleLine.groupBy({
        by: ['productId'],
        where: { sale: { tenantId, ...branchFilter, status: 'COMPLETED' } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // 9. Past 14 days completed sales for trend
      this.prisma.sale.findMany({
        where: {
          tenantId,
          ...branchFilter,
          status: 'COMPLETED',
          createdAt: { gte: fourteenDaysAgo },
        },
        select: {
          createdAt: true,
          total: true,
        },
        orderBy: { createdAt: 'asc' },
      }),

      // 10. Payment method stats
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { sale: { tenantId, ...branchFilter, status: 'COMPLETED' } },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // 11. Operational workflow counts
      this.prisma.stockTransfer.count({ where: { tenantId, status: { in: ['DRAFT', 'APPROVED', 'IN_TRANSIT'] } } }),
      this.prisma.purchaseOrder.count({ where: { tenantId, status: { in: ['DRAFT', 'APPROVED'] } } }),
      this.prisma.goodsReceipt.count({ where: { tenantId, status: 'DRAFT' } }),
      this.prisma.customer.count({ where: { tenantId, isActive: true } }),
      this.prisma.branch.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true, code: true } }),
    ]);

    // Top Products Enrichment
    const topProductIds = topSaleLines.map((l) => l.productId);
    const topProductsInfo = topProductIds.length > 0
      ? await this.prisma.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, name: true, sku: true, sellingPrice: true },
        })
      : [];
    const topProductsMap = new Map(topProductsInfo.map((p) => [p.id, p]));

    const topSellingProducts = topSaleLines.map((line) => {
      const p = topProductsMap.get(line.productId);
      return {
        productId: line.productId,
        name: p?.name || 'Unknown Product',
        sku: p?.sku || 'N/A',
        unitsSold: Number(line._sum.quantity || 0),
        totalRevenue: Number(line._sum.total || 0),
      };
    });

    // Inventory & Category Aggregations
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    const categoryMap = new Map<string, { count: number; value: number }>();
    const lowStockItems: any[] = [];

    for (const b of stockBalances) {
      const onHand = Number(b.onHand || 0);
      const cost = Number(b.product?.costPrice || 0);
      const retail = Number(b.product?.sellingPrice || 0);
      const minStock = Number(b.reorderLevel ?? 10);

      totalCostValue += onHand * cost;
      totalRetailValue += onHand * retail;

      if (onHand <= 0) {
        outOfStockCount++;
        lowStockCount++;
        lowStockItems.push({
          id: b.id,
          productId: b.productId,
          productName: b.product?.name || 'Product',
          sku: b.product?.sku || 'N/A',
          branchName: b.branch?.name || 'Main Branch',
          onHand,
          minStock,
          status: 'OUT_OF_STOCK',
        });
      } else if (onHand <= minStock) {
        lowStockCount++;
        lowStockItems.push({
          id: b.id,
          productId: b.productId,
          productName: b.product?.name || 'Product',
          sku: b.product?.sku || 'N/A',
          branchName: b.branch?.name || 'Main Branch',
          onHand,
          minStock,
          status: 'LOW_STOCK',
        });
      } else {
        inStockCount++;
      }

      const catName = b.product?.category?.name || 'General';
      const existing = categoryMap.get(catName) || { count: 0, value: 0 };
      existing.count += 1;
      existing.value += onHand * retail;
      categoryMap.set(catName, existing);
    }

    // Category Distribution Formatting
    const categoryDistribution = Array.from(categoryMap.entries()).map(([name, stat]) => ({
      name,
      productCount: stat.count,
      stockValue: Number(stat.value.toFixed(2)),
      percentage: totalRetailValue > 0 ? Number(((stat.value / totalRetailValue) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.stockValue - a.stockValue);

    // 14-Day Sales Velocity Trend
    const trendMap = new Map<string, { date: string; label: string; revenue: number; count: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trendMap.set(key, { date: key, label, revenue: 0, count: 0 });
    }

    for (const sale of past14DaysSales) {
      const key = new Date(sale.createdAt).toISOString().split('T')[0];
      if (trendMap.has(key)) {
        const entry = trendMap.get(key)!;
        entry.revenue += Number(sale.total);
        entry.count += 1;
      }
    }
    const salesTrend = Array.from(trendMap.values());

    // Growth rates
    const todayRev = Number(todaySalesAgg._sum.total ?? 0);
    const yestRev = Number(yesterdaySalesAgg._sum.total ?? 0);
    const revenueGrowthDay = yestRev > 0
      ? Number((((todayRev - yestRev) / yestRev) * 100).toFixed(1))
      : todayRev > 0 ? 100 : 0;

    const monthRev = Number(monthSalesAgg._sum.total ?? 0);
    const lastMonthRev = Number(lastMonthSalesAgg._sum.total ?? 0);
    const revenueGrowthMonth = lastMonthRev > 0
      ? Number((((monthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1))
      : monthRev > 0 ? 100 : 0;

    const potentialProfit = totalRetailValue - totalCostValue;
    const profitMargin = totalRetailValue > 0 ? Number(((potentialProfit / totalRetailValue) * 100).toFixed(1)) : 0;

    return {
      // Legacy backwards-compatible fields
      totalProducts,
      todaySalesCount: todaySalesAgg._count.id,
      todayRevenue: todayRev,
      lowStockCount,
      pendingTransfers,
      pendingPOs,
      salesTrend,
      sales: {
        today: todaySalesAgg._count.id,
        month: monthSalesAgg._count.id,
        yesterday: yesterdaySalesAgg._count.id,
      },
      revenue: {
        today: todayRev,
        yesterday: yestRev,
        month: monthRev,
        lastMonth: lastMonthRev,
        dayGrowthPercent: revenueGrowthDay,
        monthGrowthPercent: revenueGrowthMonth,
      },

      // Advanced Analytics Fields
      financials: {
        todayAOV: Number((todaySalesAgg._avg.total ?? 0).toFixed(2)),
        todayTax: Number(todaySalesAgg._sum.tax ?? 0),
        todayDiscount: Number(todaySalesAgg._sum.discount ?? 0),
        monthAOV: Number((monthSalesAgg._avg.total ?? 0).toFixed(2)),
        monthTax: Number(monthSalesAgg._sum.tax ?? 0),
        monthDiscount: Number(monthSalesAgg._sum.discount ?? 0),
      },
      inventory: {
        totalCostValue: Number(totalCostValue.toFixed(2)),
        totalRetailValue: Number(totalRetailValue.toFixed(2)),
        potentialProfit: Number(potentialProfit.toFixed(2)),
        profitMarginPercent: profitMargin,
        inStockCount,
        lowStockCount,
        outOfStockCount,
        categoryDistribution,
        lowStockWatchlist: lowStockItems.slice(0, 8),
      },
      operations: {
        pendingTransfers,
        pendingPOs,
        pendingGoodsReceipts,
        totalCustomers,
        activeBranches: branches.length,
      },
      topSellingProducts,
      recentSales: recentSales.map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        customerName: s.customer?.name || 'Walk-in Customer',
        customerPhone: s.customer?.phone || null,
        cashierName: `${s.cashier?.firstName || ''} ${s.cashier?.lastName || ''}`.trim() || 'Cashier',
        branchName: s.branch?.name || 'Main Branch',
        total: Number(s.total),
        paymentMethod: s.payments?.[0]?.method || 'CASH',
        status: s.status,
        createdAt: s.createdAt,
      })),
      paymentMethodStats: paymentMethodStats.map((p) => ({
        method: p.method,
        count: p._count.id,
        amount: Number(p._sum.amount ?? 0),
      })),
    };
  }

  async getSalesReport(tenantId: string, query: { startDate?: string; endDate?: string; branchId?: string }) {
    const where: any = { tenantId, status: 'COMPLETED' };
    if (query.startDate) where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
    if (query.endDate) where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) };
    if (query.branchId) where.branchId = query.branchId;

    const [summary, dailySales] = await Promise.all([
      this.prisma.sale.aggregate({
        where,
        _sum: { total: true, subtotal: true, tax: true, discount: true },
        _count: { id: true },
        _avg: { total: true },
      }),
      this.prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total) as revenue
        FROM sales
        WHERE tenant_id = ${tenantId}
          AND status = 'COMPLETED'
          ${query.startDate ? this.prisma.$queryRaw`AND created_at >= ${new Date(query.startDate)}` : this.prisma.$queryRaw``}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `.catch(() => []),
    ]);

    return {
      summary: {
        totalSales: summary._count.id,
        totalRevenue: Number(summary._sum.total ?? 0),
        totalSubtotal: Number(summary._sum.subtotal ?? 0),
        totalTax: Number(summary._sum.tax ?? 0),
        totalDiscount: Number(summary._sum.discount ?? 0),
        avgOrderValue: Number(summary._avg.total ?? 0),
      },
      dailySales,
    };
  }

  async getStockValuation(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    const balances = await this.prisma.stockBalance.findMany({
      where,
      include: { product: true },
    });

    const totalValue = balances.reduce((sum, b) => {
      return sum + Number(b.onHand) * Number(b.product.costPrice);
    }, 0);

    const totalRetailValue = balances.reduce((sum, b) => {
      return sum + Number(b.onHand) * Number(b.product.sellingPrice);
    }, 0);

    return {
      totalCostValue: totalValue,
      totalRetailValue,
      itemCount: balances.length,
      items: balances.map(b => ({
        productId: b.productId,
        productName: b.product.name,
        sku: b.product.sku,
        onHand: Number(b.onHand),
        costPrice: Number(b.product.costPrice),
        sellingPrice: Number(b.product.sellingPrice),
        costValue: Number(b.onHand) * Number(b.product.costPrice),
        retailValue: Number(b.onHand) * Number(b.product.sellingPrice),
      })),
    };
  }

  async getPurchaseReport(tenantId: string, query: { startDate?: string; endDate?: string }) {
    const where: any = { tenantId };
    if (query.startDate) where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
    if (query.endDate) where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) };

    const [summary, byStatus] = await Promise.all([
      this.prisma.purchaseOrder.aggregate({
        where,
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.purchaseOrder.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      summary: {
        totalOrders: summary._count.id,
        totalAmount: Number(summary._sum.totalAmount ?? 0),
      },
      byStatus,
    };
  }

  async sendReportEmail(
    tenantId: string,
    dto: { reportType: string; recipients: string[]; branchId?: string; startDate?: string; endDate?: string },
  ) {
    const dashboard = await this.getDashboard(tenantId, dto.branchId);
    return this.mailService.sendExecutiveReport(
      dto.recipients,
      `Inventory & Sales Report [${(dto.reportType || 'summary').toUpperCase()}] — QAR Standard`,
      dto.reportType || 'executive_summary',
      dashboard,
    );
  }

  async sendTestEmail(dto: { recipients: string[]; subject?: string }) {
    return this.mailService.sendMail(
      dto.recipients,
      dto.subject || 'Diagnostic Test Email — InventoryOS Qatar',
      `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h3 style="color: #2563eb;">Diagnostic SMTP Test Successful</h3>
        <p>This automated message confirms that your SMTP email server integration is active and operating correctly.</p>
        <p style="color: #64748b; font-size: 12px;">Standardized Currency: QAR (Qatar)</p>
      </div>`,
    );
  }
}
