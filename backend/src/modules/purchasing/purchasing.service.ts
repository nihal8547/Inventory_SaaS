import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class PurchasingService {
  constructor(private prisma: PrismaService) {}

  // Suppliers
  async createSupplier(tenantId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: { tenantId, ...dto } });
  }

  async findSuppliers(tenantId: string, dto: PaginationDto) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, isActive: true };
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.supplier.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOneSupplier(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async updateSupplier(tenantId: string, id: string, dto: Partial<CreateSupplierDto>) {
    await this.findOneSupplier(tenantId, id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async deleteSupplier(tenantId: string, id: string) {
    await this.findOneSupplier(tenantId, id);
    return this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }

  // Purchase Orders (Authoritative Calculation)
  async createPurchaseOrder(tenantId: string, userId: string, dto: CreatePurchaseOrderDto) {
    const [supplier, branch] = await Promise.all([
      this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId } }),
      this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } }),
    ]);

    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!branch) throw new NotFoundException('Branch not found');
    if (!dto.lines || dto.lines.length === 0) throw new BadRequestException('Purchase order must contain at least one line item');

    let computedTotalAmount = 0;
    const validatedLines: Array<{
      productId: string;
      productVariantId: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    for (const line of dto.lines) {
      const qty = Number(line.quantity);
      if (isNaN(qty) || qty <= 0) throw new BadRequestException('Line quantity must be a positive number');

      const product = await this.prisma.product.findFirst({
        where: { id: line.productId, tenantId },
      });
      if (!product) throw new NotFoundException(`Product ${line.productId} not found in catalog`);

      const unitPrice = Number(
        line.unitPrice != null && Number(line.unitPrice) > 0
          ? line.unitPrice
          : (product.costPrice ?? product.sellingPrice ?? 0)
      );
      const lineTotal = Math.round(qty * unitPrice * 100) / 100;
      computedTotalAmount = Math.round((computedTotalAmount + lineTotal) * 100) / 100;

      validatedLines.push({
        productId: line.productId,
        productVariantId: line.productVariantId || null,
        quantity: qty,
        unitPrice,
        totalPrice: lineTotal,
      });
    }

    const poNumber = `PO-${Date.now()}`;

    return this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        poNumber,
        supplierId: dto.supplierId,
        branchId: dto.branchId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes,
        totalAmount: computedTotalAmount,
        createdBy: userId,
        lines: {
          create: validatedLines,
        },
      },
      include: { lines: true, supplier: true, branch: true },
    });
  }

  async findPurchaseOrders(tenantId: string, dto: PaginationDto & { status?: string; branchId?: string; supplierId?: string }) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.branchId) where.branchId = dto.branchId;
    if (dto.supplierId) where.supplierId = dto.supplierId;
    if (dto.search) {
      where.OR = [
        { poNumber: { contains: dto.search, mode: 'insensitive' } },
        { supplier: { name: { contains: dto.search, mode: 'insensitive' } } },
        { notes: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where, skip, take: limit,
        include: { supplier: true, branch: true, _count: { select: { lines: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOnePurchaseOrder(tenantId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: { lines: true, supplier: true, branch: true, receipts: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async approvePurchaseOrder(tenantId: string, id: string, userId: string) {
    const po = await this.findOnePurchaseOrder(tenantId, id);
    if (po.status !== 'DRAFT') throw new BadRequestException('Only draft orders can be approved');
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'APPROVED', approvedBy: userId } });
  }

  // Goods Receipt (Authoritative & Atomic)
  async receiveGoods(tenantId: string, userId: string, dto: ReceiveGoodsDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Goods receipt must contain at least one line item');
    }

    const receiptNumber = `GR-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      let po: any = null;
      if (dto.purchaseOrderId) {
        po = await tx.purchaseOrder.findFirst({
          where: { id: dto.purchaseOrderId, tenantId },
          include: { lines: true },
        });

        if (!po) throw new NotFoundException('Purchase order not found');
        if (po.status !== 'APPROVED' && po.status !== 'PARTIALLY_RECEIVED') {
          throw new BadRequestException(
            `Cannot receive goods for purchase order in "${po.status}" status. Only APPROVED or PARTIALLY_RECEIVED orders can be received.`
          );
        }

        // Validate each received line against PO quantities to prevent over-receipt
        for (const line of dto.lines) {
          const incomingQty = Number(line.quantity);
          if (isNaN(incomingQty) || incomingQty <= 0) {
            throw new BadRequestException('Received quantity must be a positive number');
          }

          const poLine = po.lines.find(
            (pl: any) =>
              pl.productId === line.productId &&
              (pl.productVariantId || null) === (line.productVariantId || null)
          );

          if (!poLine) {
            throw new BadRequestException(
              `Product ${line.productId} is not part of Purchase Order #${po.poNumber}`
            );
          }

          const orderedQty = Number(poLine.quantity);
          const alreadyReceived = Number(poLine.receivedQuantity || 0);

          if (alreadyReceived + incomingQty > orderedQty) {
            throw new BadRequestException(
              `Over-receiving rejected for item ${line.productId}. Ordered: ${orderedQty}, Already Received: ${alreadyReceived}, Incoming: ${incomingQty}`
            );
          }
        }
      }

      const receipt = await tx.goodsReceipt.create({
        data: {
          tenantId,
          receiptNumber,
          purchaseOrderId: dto.purchaseOrderId,
          branchId: dto.branchId,
          warehouseId: dto.warehouseId,
          supplierId: dto.supplierId,
          notes: dto.notes,
          status: 'RECEIVED',
          receivedBy: userId,
          lines: {
            create: dto.lines.map((l) => ({
              productId: l.productId,
              productVariantId: l.productVariantId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              batchNumber: l.batchNumber,
              expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
            })),
          },
        },
        include: { lines: true },
      });

      // Atomic Stock Balance increment & immutable StockLedger entry
      for (const line of dto.lines) {
        const qty = Number(line.quantity);
        const balance = await tx.stockBalance.findFirst({
          where: {
            tenantId,
            productId: line.productId,
            productVariantId: line.productVariantId || null,
            branchId: dto.branchId,
          },
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
              branchId: dto.branchId,
              warehouseId: dto.warehouseId ?? null,
              onHand: qty,
              reserved: 0,
            },
          });
        }

        await tx.stockLedger.create({
          data: {
            tenantId,
            productId: line.productId,
            productVariantId: line.productVariantId ?? null,
            branchId: dto.branchId,
            transactionType: 'PURCHASE_RECEIPT',
            quantity: qty,
            balanceBefore: before,
            balanceAfter: after,
            referenceType: 'goods_receipt',
            referenceId: receipt.id,
            createdBy: userId,
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
            notes: `Goods received against PO #${po?.poNumber || 'DIRECT'}`,
          },
        });
      }

      // Update PO line received quantities and overall PO status
      if (po) {
        for (const line of dto.lines) {
          await tx.purchaseOrderLine.updateMany({
            where: {
              purchaseOrderId: po.id,
              productId: line.productId,
              productVariantId: line.productVariantId || null,
            },
            data: { receivedQuantity: { increment: Number(line.quantity) } },
          });
        }

        // Re-check all lines to determine if fully fulfilled
        const refreshedPoLines = await tx.purchaseOrderLine.findMany({
          where: { purchaseOrderId: po.id },
        });

        const allFullyReceived = refreshedPoLines.every(
          (pl: any) => Number(pl.receivedQuantity || 0) >= Number(pl.quantity)
        );

        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
        });
      }

      return receipt;
    });
  }
}
