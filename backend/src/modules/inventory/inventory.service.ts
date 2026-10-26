import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStockAdjustmentDto } from './dto/stock-adjustment.dto';
import { CreateStockTransferDto, UpdateTransferStatusDto } from './dto/stock-transfer.dto';
import { CreateStockCountDto, SubmitStockCountDto } from './dto/stock-count.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getStock(tenantId: string, query: { branchId?: string; productId?: string; warehouseId?: string; search?: string } & PaginationDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.branchId) where.branchId = query.branchId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.productId) where.productId = query.productId;
    if (query.search) {
      where.product = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.stockBalance.findMany({
        where, skip, take: limit,
        include: {
          product: { include: { category: true, brand: true } },
          branch: true,
          warehouse: true,
        },
        orderBy: { product: { name: 'asc' } },
      }),
      this.prisma.stockBalance.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getLedger(tenantId: string, query: { branchId?: string; productId?: string } & PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.branchId) where.branchId = query.branchId;
    if (query.productId) where.productId = query.productId;

    const [data, total] = await Promise.all([
      this.prisma.stockLedger.findMany({
        where, skip, take: limit,
        include: { product: true, branch: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockLedger.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  private async upsertStockBalance(
    tx: any,
    tenantId: string,
    productId: string,
    productVariantId: string | null,
    branchId: string,
    warehouseId: string | null,
    delta: number,
  ) {
    const existing = await tx.stockBalance.findFirst({
      where: { tenantId, productId, productVariantId: productVariantId ?? null, branchId, warehouseId: warehouseId ?? null },
    });

    if (existing) {
      const newOnHand = Number(existing.onHand) + delta;
      if (newOnHand < 0) throw new BadRequestException(`Insufficient stock for product ${productId}`);
      return tx.stockBalance.update({
        where: { id: existing.id },
        data: { onHand: newOnHand },
      });
    } else {
      if (delta < 0) throw new BadRequestException(`Insufficient stock for product ${productId}`);
      return tx.stockBalance.create({
        data: { tenantId, productId, productVariantId: productVariantId ?? null, branchId, warehouseId: warehouseId ?? null, onHand: delta },
      });
    }
  }

  private async createLedgerEntry(
    tx: any,
    tenantId: string,
    productId: string,
    productVariantId: string | null,
    branchId: string,
    transactionType: string,
    quantity: number,
    balanceBefore: number,
    balanceAfter: number,
    referenceType: string,
    referenceId: string,
    userId: string,
    notes?: string,
  ) {
    return tx.stockLedger.create({
      data: {
        tenantId, productId, productVariantId, branchId,
        transactionType, quantity, balanceBefore, balanceAfter,
        referenceType, referenceId, notes, createdBy: userId,
      },
    });
  }

  async reserveStock(
    tx: any,
    tenantId: string,
    productId: string,
    productVariantId: string | null,
    branchId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    userId: string,
    notes?: string,
  ) {
    if (quantity <= 0) throw new BadRequestException('Reservation quantity must be positive');
    const balance = await tx.stockBalance.findFirst({
      where: { tenantId, productId, productVariantId: productVariantId ?? null, branchId },
    });

    const onHand = balance ? Number(balance.onHand) : 0;
    const reserved = balance ? Number(balance.reserved) : 0;
    const available = onHand - reserved;

    if (available < quantity) {
      throw new BadRequestException(
        `Insufficient available stock for reservation. Available: ${available}, Requested: ${quantity}`
      );
    }

    const updated = await tx.stockBalance.update({
      where: { id: balance.id },
      data: { reserved: { increment: quantity } },
    });

    await tx.stockLedger.create({
      data: {
        tenantId,
        productId,
        productVariantId,
        branchId,
        transactionType: 'RESERVE_STOCK',
        quantity: -quantity,
        balanceBefore: available,
        balanceAfter: available - quantity,
        referenceType,
        referenceId,
        createdBy: userId,
        notes: notes || `Stock reserved for ${referenceType} #${referenceId}`,
      },
    });

    return updated;
  }

  async releaseStock(
    tx: any,
    tenantId: string,
    productId: string,
    productVariantId: string | null,
    branchId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    userId: string,
    notes?: string,
  ) {
    if (quantity <= 0) throw new BadRequestException('Release quantity must be positive');
    const balance = await tx.stockBalance.findFirst({
      where: { tenantId, productId, productVariantId: productVariantId ?? null, branchId },
    });

    if (!balance) throw new NotFoundException('Stock balance not found for stock release');

    const currentReserved = Number(balance.reserved);
    const releaseQty = Math.min(quantity, currentReserved);

    const updated = await tx.stockBalance.update({
      where: { id: balance.id },
      data: { reserved: { decrement: releaseQty } },
    });

    const onHand = Number(balance.onHand);
    const availableBefore = onHand - currentReserved;
    const availableAfter = availableBefore + releaseQty;

    await tx.stockLedger.create({
      data: {
        tenantId,
        productId,
        productVariantId,
        branchId,
        transactionType: 'RELEASE_STOCK',
        quantity: releaseQty,
        balanceBefore: availableBefore,
        balanceAfter: availableAfter,
        referenceType,
        referenceId,
        createdBy: userId,
        notes: notes || `Stock released for ${referenceType} #${referenceId}`,
      },
    });

    return updated;
  }

  async createAdjustment(tenantId: string, userId: string, dto: CreateStockAdjustmentDto) {
    const adjNumber = `ADJ-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      const defaultWarehouse = dto.warehouseId
        ? null
        : await tx.warehouse.findFirst({
            where: { branchId: dto.branchId, isDefault: true },
          });
      const targetWarehouseId = dto.warehouseId || defaultWarehouse?.id || null;

      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId,
          adjustmentNumber: adjNumber,
          branchId: dto.branchId,
          reason: dto.reason,
          notes: dto.notes,
          status: 'APPROVED',
          approvedBy: userId,
          createdBy: userId,
          lines: {
            create: dto.lines.map(l => ({
              productId: l.productId,
              productVariantId: l.productVariantId,
              quantity: l.quantity,
              reason: l.reason,
            })),
          },
        },
        include: { lines: true },
      });

      for (const line of dto.lines) {
        const balance = await tx.stockBalance.findFirst({
          where: {
            tenantId,
            productId: line.productId,
            branchId: dto.branchId,
            warehouseId: targetWarehouseId ?? undefined,
          },
        });
        const before = balance ? Number(balance.onHand) : 0;
        const after = before + line.quantity;
        if (after < 0) throw new BadRequestException(`Insufficient stock for product ${line.productId}`);

        await this.upsertStockBalance(tx, tenantId, line.productId, line.productVariantId ?? null, dto.branchId, targetWarehouseId, line.quantity);
        await this.createLedgerEntry(tx, tenantId, line.productId, line.productVariantId ?? null, dto.branchId,
          line.quantity >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT', Math.abs(line.quantity), before, after,
          'stock_adjustment', adjustment.id, userId, dto.notes);
      }

      return adjustment;
    });
  }

  async findAdjustments(tenantId: string, dto: PaginationDto & { branchId?: string; search?: string }) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (dto.branchId) where.branchId = dto.branchId;
    if (dto.search) {
      where.OR = [
        { adjustmentNumber: { contains: dto.search, mode: 'insensitive' } },
        { reason: { contains: dto.search, mode: 'insensitive' } },
        { notes: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [adjustments, total] = await Promise.all([
      this.prisma.stockAdjustment.findMany({
        where,
        skip,
        take: limit,
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockAdjustment.count({ where }),
    ]);

    const productIds = Array.from(new Set(adjustments.flatMap(a => a.lines.map(l => l.productId))));
    const branchIds = Array.from(new Set(adjustments.map(a => a.branchId)));

    const [products, branches] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true, sellingPrice: true, costPrice: true },
      }),
      this.prisma.branch.findMany({
        where: { id: { in: branchIds } },
        select: { id: true, name: true, code: true },
      }),
    ]);

    const productMap = new Map(products.map(p => [p.id, p]));
    const branchMap = new Map(branches.map(b => [b.id, b]));

    const enriched = adjustments.map(adj => ({
      ...adj,
      branch: branchMap.get(adj.branchId) || null,
      lines: adj.lines.map(line => ({
        ...line,
        product: productMap.get(line.productId) || null,
      })),
    }));

    return paginate(enriched, total, page, limit);
  }

  async findOneAdjustment(tenantId: string, id: string) {
    const adj = await this.prisma.stockAdjustment.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });
    if (!adj) throw new NotFoundException('Stock adjustment not found');

    const productIds = adj.lines.map(l => l.productId);
    const [products, branch] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true, sellingPrice: true, costPrice: true },
      }),
      this.prisma.branch.findFirst({
        where: { id: adj.branchId },
        select: { id: true, name: true, code: true },
      }),
    ]);

    const productMap = new Map(products.map(p => [p.id, p]));
    return {
      ...adj,
      branch,
      lines: adj.lines.map(line => ({
        ...line,
        product: productMap.get(line.productId) || null,
      })),
    };
  }

  async createTransfer(tenantId: string, userId: string, dto: CreateStockTransferDto) {
    const transferNumber = `TRF-${Date.now()}`;

    return this.prisma.stockTransfer.create({
      data: {
        tenantId,
        transferNumber,
        status: 'DRAFT',
        sourceBranchId: dto.sourceBranchId,
        destinationBranchId: dto.destinationBranchId,
        sourceWarehouseId: dto.sourceWarehouseId,
        destinationWarehouseId: dto.destinationWarehouseId,
        requestedBy: userId,
        notes: dto.notes,
        lines: {
          create: dto.lines.map(l => ({
            productId: l.productId,
            productVariantId: l.productVariantId,
            requestedQuantity: l.requestedQuantity,
          })),
        },
      },
      include: { lines: true, sourceBranch: true, destinationBranch: true },
    });
  }

  async findTransfers(tenantId: string, dto: PaginationDto & { status?: string; sourceBranchId?: string; destinationBranchId?: string }) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.sourceBranchId) where.sourceBranchId = dto.sourceBranchId;
    if (dto.destinationBranchId) where.destinationBranchId = dto.destinationBranchId;
    if (dto.search) {
      where.OR = [
        { transferNumber: { contains: dto.search, mode: 'insensitive' } },
        { notes: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where, skip, take: limit,
        include: { lines: true, sourceBranch: true, destinationBranch: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async updateTransferStatus(tenantId: string, id: string, userId: string, dto: UpdateTransferStatusDto) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId },
      include: { lines: true, sourceBranch: true, destinationBranch: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');

    const validTransitions: Record<string, string[]> = {
      DRAFT: ['APPROVED', 'CANCELLED'],
      APPROVED: ['IN_TRANSIT', 'CANCELLED'],
      IN_TRANSIT: ['RECEIVED', 'CANCELLED'],
    };

    if (!validTransitions[transfer.status]?.includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${transfer.status} to ${dto.status}`);
    }

    // 1. Transition to APPROVED: Hold / Reserve stock on source branch
    if (dto.status === 'APPROVED') {
      await this.prisma.$transaction(async (tx) => {
        for (const line of transfer.lines) {
          const qty = Number(line.requestedQuantity);
          await this.reserveStock(
            tx,
            tenantId,
            line.productId,
            line.productVariantId,
            transfer.sourceBranchId,
            qty,
            'stock_transfer',
            transfer.id,
            userId,
            `Reserved for stock transfer #${transfer.transferNumber}`
          );
        }

        await tx.stockTransfer.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedBy: userId,
            notes: dto.notes ?? transfer.notes,
          },
        });
      });

      return this.prisma.stockTransfer.findFirst({
        where: { id },
        include: { lines: true, sourceBranch: true, destinationBranch: true },
      });
    }

    // 2. Transition to IN_TRANSIT
    if (dto.status === 'IN_TRANSIT') {
      await this.prisma.stockTransfer.update({
        where: { id },
        data: {
          status: 'IN_TRANSIT',
          dispatchedBy: userId,
          notes: dto.notes ?? transfer.notes,
        },
      });

      return this.prisma.stockTransfer.findFirst({
        where: { id },
        include: { lines: true, sourceBranch: true, destinationBranch: true },
      });
    }

    // 3. Transition to RECEIVED: Release reservation, decrement source, increment destination
    if (dto.status === 'RECEIVED') {
      await this.prisma.$transaction(async (tx) => {
        for (const line of transfer.lines) {
          const qty = Number(line.requestedQuantity);

          const srcBalance = await tx.stockBalance.findFirst({
            where: {
              tenantId,
              productId: line.productId,
              productVariantId: line.productVariantId || null,
              branchId: transfer.sourceBranchId,
            },
          });

          const srcOnHandBefore = srcBalance ? Number(srcBalance.onHand) : 0;
          const srcReserved = srcBalance ? Number(srcBalance.reserved) : 0;
          const releaseReserved = Math.min(qty, srcReserved);

          // Atomic source update (decrement onHand and reserved)
          if (srcBalance) {
            await tx.stockBalance.update({
              where: { id: srcBalance.id },
              data: {
                onHand: { decrement: qty },
                reserved: { decrement: releaseReserved },
              },
            });
          }

          // Atomic destination update
          const dstBalance = await tx.stockBalance.findFirst({
            where: {
              tenantId,
              productId: line.productId,
              productVariantId: line.productVariantId || null,
              branchId: transfer.destinationBranchId,
            },
          });
          const dstOnHandBefore = dstBalance ? Number(dstBalance.onHand) : 0;

          if (dstBalance) {
            await tx.stockBalance.update({
              where: { id: dstBalance.id },
              data: { onHand: { increment: qty } },
            });
          } else {
            await tx.stockBalance.create({
              data: {
                tenantId,
                productId: line.productId,
                productVariantId: line.productVariantId || null,
                branchId: transfer.destinationBranchId,
                warehouseId: transfer.destinationWarehouseId || null,
                onHand: qty,
                reserved: 0,
              },
            });
          }

          await this.createLedgerEntry(
            tx,
            tenantId,
            line.productId,
            line.productVariantId,
            transfer.sourceBranchId,
            'TRANSFER_OUT',
            -qty,
            srcOnHandBefore,
            srcOnHandBefore - qty,
            'stock_transfer',
            id,
            userId,
            `Transferred to ${transfer.destinationBranch?.name || transfer.destinationBranchId}`
          );

          await this.createLedgerEntry(
            tx,
            tenantId,
            line.productId,
            line.productVariantId,
            transfer.destinationBranchId,
            'TRANSFER_IN',
            qty,
            dstOnHandBefore,
            dstOnHandBefore + qty,
            'stock_transfer',
            id,
            userId,
            `Received from ${transfer.sourceBranch?.name || transfer.sourceBranchId}`
          );

          await tx.stockTransferLine.update({
            where: { id: line.id },
            data: { receivedQuantity: qty, dispatchedQuantity: qty },
          });
        }

        await tx.stockTransfer.update({
          where: { id },
          data: { status: 'RECEIVED', receivedBy: userId, notes: dto.notes ?? transfer.notes },
        });
      });

      return this.prisma.stockTransfer.findFirst({
        where: { id },
        include: { lines: true, sourceBranch: true, destinationBranch: true },
      });
    }

    // 4. Transition to CANCELLED: If was APPROVED or IN_TRANSIT, release reserved stock
    if (dto.status === 'CANCELLED') {
      if (transfer.status === 'APPROVED' || transfer.status === 'IN_TRANSIT') {
        await this.prisma.$transaction(async (tx) => {
          for (const line of transfer.lines) {
            const qty = Number(line.requestedQuantity);
            await this.releaseStock(
              tx,
              tenantId,
              line.productId,
              line.productVariantId,
              transfer.sourceBranchId,
              qty,
              'stock_transfer',
              transfer.id,
              userId,
              `Released reservation due to cancellation of transfer #${transfer.transferNumber}`
            );
          }

          await tx.stockTransfer.update({
            where: { id },
            data: { status: 'CANCELLED', notes: dto.notes ?? transfer.notes },
          });
        });
      } else {
        await this.prisma.stockTransfer.update({
          where: { id },
          data: { status: 'CANCELLED', notes: dto.notes ?? transfer.notes },
        });
      }

      return this.prisma.stockTransfer.findFirst({
        where: { id },
        include: { lines: true, sourceBranch: true, destinationBranch: true },
      });
    }

    return this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes ?? transfer.notes,
      },
    });
  }

  async createStockCount(tenantId: string, userId: string, dto: CreateStockCountDto) {
    const countNumber = `CNT-${Date.now()}`;
    const balances = await this.prisma.stockBalance.findMany({
      where: { tenantId, branchId: dto.branchId },
    });

    return this.prisma.stockCount.create({
      data: {
        tenantId,
        countNumber,
        branchId: dto.branchId,
        warehouseId: dto.warehouseId,
        notes: dto.notes,
        status: 'DRAFT',
        createdBy: userId,
        lines: {
          create: balances.map(b => ({
            productId: b.productId,
            productVariantId: b.productVariantId,
            expectedQuantity: b.onHand,
          })),
        },
      },
      include: { lines: true },
    });
  }

  async findStockCounts(tenantId: string, dto: PaginationDto & { status?: string; branchId?: string }) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.branchId) where.branchId = dto.branchId;
    if (dto.search) {
      where.OR = [
        { countNumber: { contains: dto.search, mode: 'insensitive' } },
        { notes: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.stockCount.findMany({
        where, skip, take: limit,
        include: { branch: true, _count: { select: { lines: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockCount.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async submitStockCount(tenantId: string, id: string, userId: string, dto: SubmitStockCountDto) {
    const count = await this.prisma.stockCount.findFirst({ where: { id, tenantId } });
    if (!count) throw new NotFoundException('Stock count not found');
    if (count.status !== 'DRAFT') throw new BadRequestException('Stock count already submitted');

    await this.prisma.$transaction(async (tx) => {
      for (const line of dto.lines) {
        const existing = await tx.stockCountLine.findFirst({
          where: { countId: id, productId: line.productId, productVariantId: line.productVariantId ?? null },
        });
        if (existing) {
          await tx.stockCountLine.update({
            where: { id: existing.id },
            data: {
              countedQuantity: line.countedQuantity,
              variance: line.countedQuantity - Number(existing.expectedQuantity),
            },
          });
        } else {
          await tx.stockCountLine.create({
            data: {
              countId: id,
              productId: line.productId,
              productVariantId: line.productVariantId,
              expectedQuantity: 0,
              countedQuantity: line.countedQuantity,
              variance: line.countedQuantity,
            },
          });
        }
      }

      await tx.stockCount.update({ where: { id }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
    });

    return this.prisma.stockCount.findFirst({ where: { id }, include: { lines: true } });
  }

  async approveStockCount(tenantId: string, id: string, userId: string) {
    const count = await this.prisma.stockCount.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });
    if (!count) throw new NotFoundException('Stock count not found');
    if (count.status !== 'IN_PROGRESS') throw new BadRequestException('Stock count not in progress');

    await this.prisma.$transaction(async (tx) => {
      for (const line of count.lines) {
        if (line.countedQuantity === null) continue;

        const balance = await tx.stockBalance.findFirst({
          where: { tenantId, productId: line.productId, branchId: count.branchId },
        });
        const before = balance ? Number(balance.onHand) : 0;
        const counted = Number(line.countedQuantity);

        await this.upsertStockBalance(tx, tenantId, line.productId, line.productVariantId, count.branchId, count.warehouseId, counted - before);
        await this.createLedgerEntry(tx, tenantId, line.productId, line.productVariantId, count.branchId,
          'STOCK_COUNT', counted, before, counted, 'stock_count', id, userId);
      }

      await tx.stockCount.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date(), approvedBy: userId },
      });
    });

    return this.prisma.stockCount.findFirst({ where: { id }, include: { lines: true } });
  }
}
