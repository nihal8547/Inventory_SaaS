import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { VoidSaleDto } from './dto/void-sale.dto';
import { CreateSalesReturnDto } from './dto/sales-return.dto';
import { QuoteSaleDto } from './dto/quote-sale.dto';
import { QueryDailyRegisterDto } from './dto/query-daily-register.dto';
import { QueryMonthlyRegisterDto } from './dto/query-monthly-register.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, cashierId: string, dto: CreateSaleDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.sale.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { lines: true, payments: true },
      });
      if (existing) return existing;
    }

    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Cannot create sale with empty items list');
    }

    const saleNumber = `SALE-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Authoritative Backend Price, Tax, and Stock Verification
      let computedSubtotal = 0;
      let computedTax = 0;
      const validatedLines: Array<{
        productId: string;
        productVariantId?: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        tax: number;
        total: number;
        stockBalanceId: string;
        onHandBefore: number;
      }> = [];

      for (const line of dto.lines) {
        if (!line.quantity || line.quantity <= 0) {
          throw new BadRequestException(`Invalid quantity for line item ${line.productId}`);
        }

        // DB product lookup - never trust client unitPrice
        const product = await tx.product.findFirst({
          where: { id: line.productId, tenantId },
          include: { variants: true },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID "${line.productId}" not found in tenant catalog`);
        }

        let verifiedUnitPrice = Number(product.sellingPrice ?? 0);
        if (line.productVariantId) {
          const variant = product.variants.find((v) => v.id === line.productVariantId);
          if (variant && variant.sellingPrice != null) {
            verifiedUnitPrice = Number(variant.sellingPrice);
          }
        }

        // Financial 2-decimal rounded precision arithmetic
        const qty = Number(line.quantity);
        const requestedDiscount = Math.max(0, Number(line.discount ?? 0));
        // Discount cannot exceed line gross price
        const lineDiscount = Math.min(requestedDiscount, Math.round(qty * verifiedUnitPrice * 100) / 100);
        const lineSubtotal = Math.round((qty * verifiedUnitPrice - lineDiscount) * 100) / 100;

        const taxRate = Number(product.taxRate ?? 0);
        const lineTax = Math.round((lineSubtotal * (taxRate / 100)) * 100) / 100;
        const lineTotal = Math.round((lineSubtotal + lineTax) * 100) / 100;

        computedSubtotal += lineSubtotal;
        computedTax += lineTax;

        // Stock availability verification: Available = onHand - reserved
        const balance = await tx.stockBalance.findFirst({
          where: { tenantId, productId: line.productId, branchId: dto.branchId },
        });

        const onHand = balance ? Number(balance.onHand) : 0;
        const reserved = balance ? Number(balance.reserved) : 0;
        const availableStock = onHand - reserved;

        if (!balance || availableStock < qty) {
          throw new BadRequestException(
            `Insufficient available stock for "${product.name}". Available: ${availableStock}, Requested: ${qty}`
          );
        }

        validatedLines.push({
          productId: line.productId,
          productVariantId: line.productVariantId,
          productName: product.name,
          quantity: qty,
          unitPrice: verifiedUnitPrice,
          discount: lineDiscount,
          tax: lineTax,
          total: lineTotal,
          stockBalanceId: balance.id,
          onHandBefore: onHand,
        });
      }

      const total = Math.round((computedSubtotal + computedTax) * 100) / 100;
      const subtotal = Math.round(computedSubtotal * 100) / 100;
      const tax = Math.round(computedTax * 100) / 100;

      // 2. Validate payments total against computed total
      const totalPaid = (dto.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      if (dto.payments && dto.payments.length > 0 && totalPaid < total - 0.05) {
        throw new BadRequestException(
          `Payment amount insufficient. Total due: ${total}, Total tendered: ${totalPaid}`
        );
      }

      // 3. Create Sale record with verified amounts
      const sale = await tx.sale.create({
        data: {
          tenantId,
          saleNumber,
          branchId: dto.branchId,
          customerId: dto.customerId,
          cashierId,
          status: 'COMPLETED',
          subtotal,
          tax,
          total,
          notes: dto.notes,
          idempotencyKey: dto.idempotencyKey,
          lines: {
            create: validatedLines.map((l) => ({
              productId: l.productId,
              productVariantId: l.productVariantId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount,
              tax: l.tax,
              total: l.total,
            })),
          },
          payments: {
            create: (dto.payments || [{ method: 'CASH', amount: total }]).map((p) => ({
              method: p.method,
              amount: Number(p.amount),
              reference: p.reference,
            })),
          },
        },
        include: { lines: true, payments: true },
      });

      // 4. Atomic Stock Deduction & Immutable Ledger Entry
      for (const line of validatedLines) {
        const after = line.onHandBefore - line.quantity;

        // Atomic decrement
        await tx.stockBalance.update({
          where: { id: line.stockBalanceId },
          data: { onHand: { decrement: line.quantity } },
        });

        // Immutable Stock Ledger entry
        await tx.stockLedger.create({
          data: {
            tenantId,
            productId: line.productId,
            productVariantId: line.productVariantId ?? null,
            branchId: dto.branchId,
            transactionType: 'SALE',
            quantity: -line.quantity,
            balanceBefore: line.onHandBefore,
            balanceAfter: after,
            referenceType: 'sale',
            referenceId: sale.id,
            createdBy: cashierId,
            notes: `POS sale checkout #${saleNumber} for "${line.productName}"`,
          },
        });
      }

      // 5. Emit Outbox Event for real-time analytics
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventType: 'sale.completed',
          payload: { saleId: sale.id, saleNumber, total, branchId: dto.branchId } as any,
          status: 'PENDING',
        },
      });

      return sale;
    });
  }

  async findAll(tenantId: string, dto: PaginationDto & { branchId?: string; status?: string; startDate?: string; endDate?: string }) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (dto.branchId) where.branchId = dto.branchId;
    if (dto.status) where.status = dto.status;
    if (dto.search) {
      where.OR = [
        { saleNumber: { contains: dto.search, mode: 'insensitive' } },
        { customer: { name: { contains: dto.search, mode: 'insensitive' } } },
        { customer: { phone: { contains: dto.search, mode: 'insensitive' } } },
        { notes: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
      if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where, skip, take: limit,
        include: { lines: true, payments: true, customer: true, branch: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: { lines: { include: {} }, payments: true, customer: true, branch: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async voidSale(tenantId: string, id: string, userId: string, dto: VoidSaleDto) {
    const sale = await this.findOne(tenantId, id);
    if (sale.status === 'VOID') throw new ConflictException('Sale already voided');
    if (sale.status !== 'COMPLETED') throw new BadRequestException('Only completed sales can be voided');

    return this.prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id }, data: { status: 'VOID', notes: dto.reason } });

      for (const line of sale.lines) {
        const qty = Number(line.quantity);
        const balance = await tx.stockBalance.findFirst({
          where: { tenantId, productId: line.productId, branchId: sale.branchId },
        });
        const before = balance ? Number(balance.onHand) : 0;
        const after = before + qty;

        if (balance) {
          await tx.stockBalance.update({
            where: { id: balance.id },
            data: { onHand: { increment: qty } },
          });
        } else {
          await tx.stockBalance.create({
            data: {
              tenantId,
              productId: line.productId,
              productVariantId: line.productVariantId ?? null,
              branchId: sale.branchId,
              onHand: qty,
            },
          });
        }

        await tx.stockLedger.create({
          data: {
            tenantId,
            productId: line.productId,
            productVariantId: line.productVariantId ?? null,
            branchId: sale.branchId,
            transactionType: 'SALE_VOID',
            quantity: qty,
            balanceBefore: before,
            balanceAfter: after,
            referenceType: 'sale',
            referenceId: id,
            createdBy: userId,
            notes: dto.reason || 'Sale voided by cashier',
          },
        });
      }

      return tx.sale.findFirst({ where: { id }, include: { lines: true, payments: true } });
    });
  }

  // --- CUSTOMER MANAGEMENT ---
  async createCustomer(tenantId: string, dto: any) {
    return this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        loyaltyPoints: dto.loyaltyPoints ?? 0,
      },
    });
  }

  async findCustomers(tenantId: string, dto: PaginationDto) {
    const page = Math.max(1, Number(dto.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(dto.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId, isActive: true };
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { phone: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { sales: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOneCustomer(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        sales: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { payments: true },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async updateCustomer(tenantId: string, id: string, dto: any) {
    await this.findOneCustomer(tenantId, id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        loyaltyPoints: dto.loyaltyPoints,
      },
    });
  }

  async deleteCustomer(tenantId: string, id: string) {
    await this.findOneCustomer(tenantId, id);
    return this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // --- REALTIME AUTHORITATIVE QUOTATION ---
  async getSaleQuote(tenantId: string, dto: QuoteSaleDto) {
    if (!dto.lines || dto.lines.length === 0) {
      return {
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'QAR',
        lines: [],
        isValid: true,
      };
    }

    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, tenantId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID "${dto.branchId}" not found`);
    }

    let computedSubtotal = 0;
    let computedTax = 0;
    const quotedLines: Array<{
      productId: string;
      productVariantId: string | null;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      tax: number;
      taxRate: number;
      total: number;
      availableStock: number;
      isStockSufficient: boolean;
    }> = [];
    let isStockSufficientOverall = true;

    for (const line of dto.lines) {
      const product = await this.prisma.product.findFirst({
        where: { id: line.productId, tenantId },
        include: { variants: true },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID "${line.productId}" not found in catalog`);
      }

      let verifiedUnitPrice = Number(product.sellingPrice ?? product.costPrice ?? 0);
      if (line.productVariantId) {
        const variant = product.variants.find((v) => v.id === line.productVariantId);
        if (variant && variant.sellingPrice != null) {
          verifiedUnitPrice = Number(variant.sellingPrice);
        }
      }

      const qty = Number(line.quantity);
      const requestedDiscount = Math.max(0, Number(line.discount ?? 0));
      const lineGross = Math.round(qty * verifiedUnitPrice * 100) / 100;
      const lineDiscount = Math.min(requestedDiscount, lineGross);
      const lineSubtotal = Math.round((lineGross - lineDiscount) * 100) / 100;

      const taxRate = Number(product.taxRate ?? 0);
      const lineTax = Math.round((lineSubtotal * (taxRate / 100)) * 100) / 100;
      const lineTotal = Math.round((lineSubtotal + lineTax) * 100) / 100;

      computedSubtotal += lineSubtotal;
      computedTax += lineTax;

      // Available stock check: onHand - reserved
      const balance = await this.prisma.stockBalance.findFirst({
        where: {
          tenantId,
          productId: line.productId,
          productVariantId: line.productVariantId || null,
          branchId: dto.branchId,
        },
      });

      const onHand = balance ? Number(balance.onHand) : 0;
      const reserved = balance ? Number(balance.reserved) : 0;
      const availableStock = Math.max(0, onHand - reserved);
      const isSufficient = availableStock >= qty;
      if (!isSufficient) {
        isStockSufficientOverall = false;
      }

      quotedLines.push({
        productId: line.productId,
        productVariantId: line.productVariantId || null,
        productName: product.name,
        sku: product.sku,
        quantity: qty,
        unitPrice: verifiedUnitPrice,
        discount: lineDiscount,
        tax: lineTax,
        taxRate,
        total: lineTotal,
        availableStock,
        isStockSufficient: isSufficient,
      });
    }

    const subtotal = Math.round(computedSubtotal * 100) / 100;
    const tax = Math.round(computedTax * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    return {
      subtotal,
      tax,
      total,
      currency: 'QAR',
      branchId: dto.branchId,
      branchName: branch.name,
      lines: quotedLines,
      isStockSufficient: isStockSufficientOverall,
      isValid: true,
    };
  }

  // --- SALES RETURNS / REFUNDS (ZERO-TRUST AUTHORITATIVE) ---
  async createReturn(tenantId: string, userId: string, dto: CreateSalesReturnDto) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: dto.saleId, tenantId },
      include: {
        lines: true,
        returns: {
          include: { lines: true },
        },
      },
    });

    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'VOID') throw new BadRequestException('Cannot return items from voided sale');
    if (sale.status !== 'COMPLETED') throw new BadRequestException('Only completed sales can be returned');

    if (!dto.lines || !Array.isArray(dto.lines) || dto.lines.length === 0) {
      throw new BadRequestException('Return must contain at least one line item');
    }

    // Map previously returned quantities across all completed returns for this sale
    const alreadyReturnedMap = new Map<string, number>();
    for (const ret of sale.returns) {
      if (ret.status === 'COMPLETED') {
        for (const rLine of ret.lines) {
          const key = `${rLine.productId}_${rLine.productVariantId || 'null'}`;
          const current = alreadyReturnedMap.get(key) || 0;
          alreadyReturnedMap.set(key, current + Number(rLine.quantity));
        }
      }
    }

    const validatedReturnLines: Array<{
      productId: string;
      productVariantId: string | null;
      quantity: number;
      unitPrice: number;
      total: number;
    }> = [];

    let totalReturnAmount = 0;

    for (const line of dto.lines) {
      const returnQty = Number(line.quantity);
      if (isNaN(returnQty) || returnQty <= 0) {
        throw new BadRequestException('Return quantity must be a positive number');
      }

      const pVarId = line.productVariantId || null;
      const originalLine = sale.lines.find(
        (l) => l.productId === line.productId && (l.productVariantId || null) === pVarId
      );

      if (!originalLine) {
        throw new BadRequestException(
          `Product with ID "${line.productId}" was not part of original invoice #${sale.saleNumber}`
        );
      }

      const originalSoldQty = Number(originalLine.quantity);
      const key = `${line.productId}_${pVarId || 'null'}`;
      const alreadyReturned = alreadyReturnedMap.get(key) || 0;
      const maxReturnableQty = Math.max(0, originalSoldQty - alreadyReturned);

      if (returnQty > maxReturnableQty) {
        throw new BadRequestException(
          `Cannot return ${returnQty} units. Maximum remaining returnable quantity for this item is ${maxReturnableQty} (Original sold: ${originalSoldQty}, already returned: ${alreadyReturned})`
        );
      }

      // Authoritative effective unit price from original sale: (total / quantity)
      const effectiveUnitPrice = Math.round((Number(originalLine.total) / originalSoldQty) * 100) / 100;
      const lineRefundTotal = Math.round(returnQty * effectiveUnitPrice * 100) / 100;

      totalReturnAmount = Math.round((totalReturnAmount + lineRefundTotal) * 100) / 100;

      // Track within this batch to prevent duplicate rows within same request
      alreadyReturnedMap.set(key, alreadyReturned + returnQty);

      validatedReturnLines.push({
        productId: line.productId,
        productVariantId: pVarId,
        quantity: returnQty,
        unitPrice: effectiveUnitPrice,
        total: lineRefundTotal,
      });
    }

    const returnNumber = `RET-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      const salesReturn = await tx.salesReturn.create({
        data: {
          tenantId,
          returnNumber,
          saleId: sale.id,
          reason: dto.reason || 'Customer Return',
          status: 'COMPLETED',
          total: totalReturnAmount,
          createdBy: userId,
          lines: {
            create: validatedReturnLines.map((l) => ({
              productId: l.productId,
              productVariantId: l.productVariantId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              total: l.total,
            })),
          },
        },
        include: { lines: true },
      });

      // Restore stock balance atomically and write StockLedger audit entry
      for (const line of validatedReturnLines) {
        const balance = await tx.stockBalance.findFirst({
          where: {
            tenantId,
            productId: line.productId,
            productVariantId: line.productVariantId,
            branchId: sale.branchId,
          },
        });

        const before = balance ? Number(balance.onHand) : 0;
        const after = before + line.quantity;

        if (balance) {
          await tx.stockBalance.update({
            where: { id: balance.id },
            data: { onHand: { increment: line.quantity } },
          });
        } else {
          await tx.stockBalance.create({
            data: {
              tenantId,
              productId: line.productId,
              productVariantId: line.productVariantId,
              branchId: sale.branchId,
              onHand: line.quantity,
              reserved: 0,
            },
          });
        }

        await tx.stockLedger.create({
          data: {
            tenantId,
            productId: line.productId,
            productVariantId: line.productVariantId,
            branchId: sale.branchId,
            transactionType: 'RETURN',
            quantity: line.quantity,
            balanceBefore: before,
            balanceAfter: after,
            referenceType: 'sales_return',
            referenceId: salesReturn.id,
            createdBy: userId,
            notes: `Refund against sale #${sale.saleNumber}. Reason: ${dto.reason || 'Customer Return'}`,
          },
        });
      }

      return salesReturn;
    });
  }

  async findReturns(tenantId: string, dto: PaginationDto & { saleId?: string }) {
    const page = Math.max(1, Number(dto.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(dto.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (dto.saleId) where.saleId = dto.saleId;
    if (dto.search) {
      where.OR = [
        { returnNumber: { contains: dto.search, mode: 'insensitive' } },
        { reason: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.salesReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { lines: true, sale: { select: { saleNumber: true, branchId: true } } },
      }),
      this.prisma.salesReturn.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  // --- CASHIER SHIFTS ---
  async openShift(tenantId: string, userId: string, dto: any) {
    const active = await this.prisma.cashierShift.findFirst({
      where: { tenantId, branchId: dto.branchId, userId, endedAt: null },
    });
    if (active) throw new BadRequestException('You already have an active shift open at this branch');

    return this.prisma.cashierShift.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        userId,
        openingCash: dto.openingCash,
        notes: dto.notes,
      },
    });
  }

  async getCurrentShift(tenantId: string, userId: string, branchId?: string) {
    const where: any = { tenantId, userId, endedAt: null };
    if (branchId) where.branchId = branchId;
    return this.prisma.cashierShift.findFirst({
      where,
      orderBy: { startedAt: 'desc' },
    });
  }

  async closeShift(tenantId: string, userId: string, id: string, dto: any) {
    const shift = await this.prisma.cashierShift.findFirst({
      where: { id, tenantId },
    });
    if (!shift) throw new NotFoundException('Cashier shift not found');
    if (shift.endedAt) throw new BadRequestException('Shift already closed');

    return this.prisma.cashierShift.update({
      where: { id },
      data: {
        closingCash: dto.closingCash,
        endedAt: new Date(),
        notes: dto.notes,
      },
    });
  }

  // --- DAILY & MONTHLY REGISTERS ---
  async getDailyRegister(tenantId: string, query: QueryDailyRegisterDto) {
    let targetDate = new Date();
    if (query.date) {
      const parts = query.date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          targetDate = new Date(y, m, d);
        }
      }
    }

    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const where: any = {
      tenantId,
      status: 'COMPLETED',
      createdAt: { gte: startOfDay, lte: endOfDay },
    };

    if (query.branchId && query.branchId !== 'all' && query.branchId !== 'ALL') {
      where.branchId = query.branchId;
    }

    if (query.cashierId && query.cashierId !== 'all') {
      where.cashierId = query.cashierId;
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        lines: true,
        payments: true,
        cashier: { select: { id: true, firstName: true, lastName: true } },
        customer: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const productIds = Array.from(new Set(sales.flatMap((s) => s.lines.map((l) => l.productId))));
    const products = productIds.length > 0
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            name: true,
            sku: true,
            sellingPrice: true,
            category: { select: { id: true, name: true } },
          },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    let grossRevenue = 0;
    let subtotal = 0;
    let tax = 0;
    let discount = 0;
    let totalItemsSold = 0;

    const paymentMap = new Map<string, { method: string; amount: number; count: number }>();
    const itemsMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        category: string;
        quantitySold: number;
        unitPrice: number;
        totalRevenue: number;
        contributionPercent: number;
      }
    >();

    // Initialize 24 hourly buckets
    const hourlyMap = new Map<number, { hour: string; orders: number; items: number; revenue: number }>();
    for (let h = 0; h < 24; h++) {
      const startStr = `${h.toString().padStart(2, '0')}:00`;
      const endStr = `${((h + 1) % 24).toString().padStart(2, '0')}:00`;
      hourlyMap.set(h, { hour: `${startStr} - ${endStr}`, orders: 0, items: 0, revenue: 0 });
    }

    for (const sale of sales) {
      const saleTotal = Number(sale.total);
      grossRevenue += saleTotal;
      subtotal += Number(sale.subtotal);
      tax += Number(sale.tax);
      discount += Number(sale.discount);

      const saleHour = new Date(sale.createdAt).getHours();
      const hourEntry = hourlyMap.get(saleHour);
      if (hourEntry) {
        hourEntry.orders += 1;
        hourEntry.revenue = Math.round((hourEntry.revenue + saleTotal) * 100) / 100;
      }

      for (const line of sale.lines) {
        const qty = Number(line.quantity);
        totalItemsSold += qty;

        if (hourEntry) {
          hourEntry.items += qty;
        }

        const lineTotal = Number(line.total || qty * Number(line.unitPrice));
        const pId = line.productId;
        const prod = productMap.get(pId);
        const pName = prod?.name || `Product #${pId.slice(0, 8)}`;
        const pSku = prod?.sku || 'N/A';
        const pCategory = prod?.category?.name || 'General';
        const pPrice = Number(line.unitPrice || prod?.sellingPrice || 0);

        const existingItem = itemsMap.get(pId);
        if (existingItem) {
          existingItem.quantitySold += qty;
          existingItem.totalRevenue = Math.round((existingItem.totalRevenue + lineTotal) * 100) / 100;
        } else {
          itemsMap.set(pId, {
            productId: pId,
            productName: pName,
            sku: pSku,
            category: pCategory,
            quantitySold: qty,
            unitPrice: pPrice,
            totalRevenue: Math.round(lineTotal * 100) / 100,
            contributionPercent: 0,
          });
        }
      }

      for (const payment of sale.payments) {
        const method = payment.method || 'CASH';
        const amt = Number(payment.amount);
        const existing = paymentMap.get(method);
        if (existing) {
          existing.amount = Math.round((existing.amount + amt) * 100) / 100;
          existing.count += 1;
        } else {
          paymentMap.set(method, { method, amount: Math.round(amt * 100) / 100, count: 1 });
        }
      }
    }

    grossRevenue = Math.round(grossRevenue * 100) / 100;
    subtotal = Math.round(subtotal * 100) / 100;
    tax = Math.round(tax * 100) / 100;
    discount = Math.round(discount * 100) / 100;

    const itemsSold = Array.from(itemsMap.values())
      .map((item) => ({
        ...item,
        contributionPercent: grossRevenue > 0 ? Math.round((item.totalRevenue / grossRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold || b.totalRevenue - a.totalRevenue);

    const hourlyBreakdown = Array.from(hourlyMap.values()).filter((h) => h.orders > 0 || h.revenue > 0);

    const transactions = sales.map((s) => ({
      id: s.id,
      saleNumber: s.saleNumber,
      createdAt: s.createdAt,
      time: new Date(s.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      cashier: `${s.cashier?.firstName || ''} ${s.cashier?.lastName || ''}`.trim() || 'Cashier',
      customer: s.customer?.name || 'Walk-in Customer',
      customerPhone: s.customer?.phone || null,
      branchName: s.branch?.name || 'Main Branch',
      itemsCount: s.lines.reduce((acc, l) => acc + Number(l.quantity), 0),
      total: Number(s.total),
      paymentMethod: s.payments[0]?.method || 'CASH',
    }));

    const dateFormatted = `${targetDate.getFullYear()}-${(targetDate.getMonth() + 1).toString().padStart(2, '0')}-${targetDate.getDate().toString().padStart(2, '0')}`;

    return {
      date: dateFormatted,
      dateFormatted: targetDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
      currency: 'QAR',
      summary: {
        grossRevenue,
        subtotal,
        tax,
        discount,
        invoicesCount: sales.length,
        totalItemsSold,
        avgOrderValue: sales.length > 0 ? Math.round((grossRevenue / sales.length) * 100) / 100 : 0,
      },
      payments: Array.from(paymentMap.values()),
      itemsSold,
      hourlyBreakdown,
      transactions,
    };
  }

  async getMonthlyRegister(tenantId: string, query: QueryMonthlyRegisterDto) {
    const now = new Date();
    const year = query.year ? parseInt(String(query.year), 10) : now.getFullYear();
    const month = query.month ? parseInt(String(query.month), 10) : now.getMonth() + 1; // 1-12

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = endOfMonth.getDate();

    const where: any = {
      tenantId,
      status: 'COMPLETED',
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    };

    if (query.branchId && query.branchId !== 'all' && query.branchId !== 'ALL') {
      where.branchId = query.branchId;
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        lines: true,
        payments: true,
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const productIds = Array.from(new Set(sales.flatMap((s) => s.lines.map((l) => l.productId))));
    const products = productIds.length > 0
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            name: true,
            sku: true,
            sellingPrice: true,
            category: { select: { id: true, name: true } },
          },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const dailyMap = new Map<
      number,
      {
        date: string;
        dayNumber: number;
        dayOfWeek: string;
        invoicesCount: number;
        itemsSold: number;
        revenue: number;
        topItem: string;
        itemSales: Map<string, { name: string; qty: number }>;
      }
    >();

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let d = 1; d <= daysInMonth; d++) {
      const currentDayDate = new Date(year, month - 1, d);
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      dailyMap.set(d, {
        date: dateStr,
        dayNumber: d,
        dayOfWeek: dayNames[currentDayDate.getDay()],
        invoicesCount: 0,
        itemsSold: 0,
        revenue: 0,
        topItem: '—',
        itemSales: new Map(),
      });
    }

    let totalMonthRevenue = 0;
    let totalItemsSold = 0;
    const monthlyItemsMap = new Map<
      string,
      {
        productId: string;
        name: string;
        sku: string;
        category: string;
        quantitySold: number;
        totalRevenue: number;
      }
    >();

    const categoryMap = new Map<string, { name: string; itemsSold: number; revenue: number }>();

    for (const sale of sales) {
      const saleDate = new Date(sale.createdAt);
      const dayNum = saleDate.getDate();
      const saleTotal = Number(sale.total);

      totalMonthRevenue += saleTotal;

      const dayEntry = dailyMap.get(dayNum);
      if (dayEntry) {
        dayEntry.invoicesCount += 1;
        dayEntry.revenue = Math.round((dayEntry.revenue + saleTotal) * 100) / 100;
      }

      for (const line of sale.lines) {
        const qty = Number(line.quantity);
        totalItemsSold += qty;
        const lineTotal = Number(line.total || qty * Number(line.unitPrice));
        const pId = line.productId;
        const prod = productMap.get(pId);
        const pName = prod?.name || `Item #${pId.slice(0, 6)}`;
        const pSku = prod?.sku || 'N/A';
        const pCategory = prod?.category?.name || 'General';

        if (dayEntry) {
          dayEntry.itemsSold += qty;
          const currentItemInDay = dayEntry.itemSales.get(pId);
          if (currentItemInDay) {
            currentItemInDay.qty += qty;
          } else {
            dayEntry.itemSales.set(pId, {
              name: pName,
              qty,
            });
          }
        }

        const existingMonthlyItem = monthlyItemsMap.get(pId);
        if (existingMonthlyItem) {
          existingMonthlyItem.quantitySold += qty;
          existingMonthlyItem.totalRevenue = Math.round((existingMonthlyItem.totalRevenue + lineTotal) * 100) / 100;
        } else {
          monthlyItemsMap.set(pId, {
            productId: pId,
            name: pName,
            sku: pSku,
            category: pCategory,
            quantitySold: qty,
            totalRevenue: Math.round(lineTotal * 100) / 100,
          });
        }

        const existingCat = categoryMap.get(pCategory);
        if (existingCat) {
          existingCat.itemsSold += qty;
          existingCat.revenue = Math.round((existingCat.revenue + lineTotal) * 100) / 100;
        } else {
          categoryMap.set(pCategory, { name: pCategory, itemsSold: qty, revenue: Math.round(lineTotal * 100) / 100 });
        }
      }
    }

    totalMonthRevenue = Math.round(totalMonthRevenue * 100) / 100;

    const dailyBreakdown = Array.from(dailyMap.values()).map((day) => {
      let topItem = '—';
      let maxQty = 0;
      for (const [_, item] of day.itemSales) {
        if (item.qty > maxQty) {
          maxQty = item.qty;
          topItem = `${item.name} (${item.qty})`;
        }
      }
      return {
        date: day.date,
        dayNumber: day.dayNumber,
        dayOfWeek: day.dayOfWeek,
        invoicesCount: day.invoicesCount,
        itemsSold: day.itemsSold,
        revenue: day.revenue,
        topItem,
      };
    });

    const activeDays = dailyBreakdown.filter((d) => d.revenue > 0);
    const sortedByRevenue = [...activeDays].sort((a, b) => b.revenue - a.revenue);
    const peakDay = sortedByRevenue[0] || null;
    const lowestDay = sortedByRevenue[sortedByRevenue.length - 1] || null;

    const monthlyTopItems = Array.from(monthlyItemsMap.values()).sort(
      (a, b) => b.quantitySold - a.quantitySold || b.totalRevenue - a.totalRevenue,
    );

    const categoryDistribution = Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        percentage: totalMonthRevenue > 0 ? Math.round((c.revenue / totalMonthRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    return {
      year,
      month,
      monthName: `${monthNames[month - 1]} ${year}`,
      currency: 'QAR',
      summary: {
        totalRevenue: totalMonthRevenue,
        totalInvoices: sales.length,
        totalItemsSold,
        avgDailyRevenue: daysInMonth > 0 ? Math.round((totalMonthRevenue / daysInMonth) * 100) / 100 : 0,
        activeSellingDays: activeDays.length,
        peakDay: peakDay ? { date: peakDay.date, revenue: peakDay.revenue, itemsSold: peakDay.itemsSold } : null,
        lowestDay: lowestDay ? { date: lowestDay.date, revenue: lowestDay.revenue, itemsSold: lowestDay.itemsSold } : null,
      },
      dailyBreakdown,
      monthlyTopItems,
      categoryDistribution,
    };
  }
}


