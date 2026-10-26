import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GenerateBarcodeDto, BarcodeFormat } from './dto/generate-barcode.dto';
import { AssignBarcodeDto } from './dto/assign-barcode.dto';
import { BulkGenerateDto } from './dto/bulk-generate.dto';
import { CreatePrintJobDto } from './dto/create-print-job.dto';
import { CreateLabelTemplateDto } from './dto/create-label-template.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

function calculateEAN13CheckDigit(partial: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(partial[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

@Injectable()
export class BarcodesService {
  constructor(private prisma: PrismaService) {}

  private async getNextSequenceValue(tenantId: string, prefix: string, format: string): Promise<number> {
    const seq = await this.prisma.$transaction(async (tx) => {
      return tx.barcodeSequence.upsert({
        where: { tenantId_prefix: { tenantId, prefix } },
        create: { tenantId, prefix, nextValue: 1, format },
        update: { nextValue: { increment: 1 } },
      });
    });
    return seq.nextValue;
  }

  private generateBarcodeValue(seqNum: number, format: BarcodeFormat): string {
    if (format === BarcodeFormat.EAN13) {
      const padded = String(seqNum).padStart(11, '0');
      const partial = '2' + padded.substring(0, 11);
      const check = calculateEAN13CheckDigit(partial);
      return partial + check;
    }
    return `INT-${String(seqNum).padStart(8, '0')}`;
  }

  async generate(tenantId: string, userId: string, dto: GenerateBarcodeDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const format = dto.format ?? BarcodeFormat.EAN13;
    const prefix = format === BarcodeFormat.EAN13 ? '2' : 'INT';
    const seqNum = await this.getNextSequenceValue(tenantId, prefix, format);
    const barcodeValue = this.generateBarcodeValue(seqNum, format);

    if (dto.isPrimary) {
      await this.prisma.barcode.updateMany({
        where: { tenantId, productId: dto.productId, productVariantId: dto.productVariantId ?? null },
        data: { isPrimary: false },
      });
    }

    return this.prisma.barcode.create({
      data: {
        tenantId,
        productId: dto.productId,
        productVariantId: dto.productVariantId,
        barcodeValue,
        barcodeFormat: format,
        barcodeType: 'INTERNAL',
        isPrimary: dto.isPrimary ?? false,
        createdBy: userId,
      },
    });
  }

  async assignExternal(tenantId: string, userId: string, dto: AssignBarcodeDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.barcode.findFirst({ where: { tenantId, barcodeValue: dto.barcodeValue, barcodeType: 'EXTERNAL' } });
    if (existing) throw new ConflictException('Barcode value already assigned');

    if (dto.isPrimary) {
      await this.prisma.barcode.updateMany({
        where: { tenantId, productId: dto.productId, productVariantId: dto.productVariantId ?? null },
        data: { isPrimary: false },
      });
    }

    return this.prisma.barcode.create({
      data: {
        tenantId,
        productId: dto.productId,
        productVariantId: dto.productVariantId,
        barcodeValue: dto.barcodeValue,
        barcodeFormat: dto.format ?? BarcodeFormat.CODE128,
        barcodeType: 'EXTERNAL',
        isPrimary: dto.isPrimary ?? false,
        createdBy: userId,
      },
    });
  }

  async lookup(tenantId: string, value: string) {
    const barcode = await this.prisma.barcode.findFirst({
      where: { tenantId, barcodeValue: value, isActive: true },
      include: {
        product: { include: { category: true, brand: true } },
        productVariant: true,
      },
    });
    if (!barcode) throw new NotFoundException('Barcode not found');
    return barcode;
  }

  async findByProduct(tenantId: string, productId: string) {
    return this.prisma.barcode.findMany({
      where: { tenantId, productId, isActive: true },
      include: { productVariant: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(tenantId: string, dto: PaginationDto) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, isActive: true };
    if ((dto as any).format && (dto as any).format !== 'all') where.barcodeFormat = (dto as any).format;
    if ((dto as any).type && (dto as any).type !== 'all') where.barcodeType = (dto as any).type;
    if (dto.search) {
      where.OR = [
        { barcodeValue: { contains: dto.search, mode: 'insensitive' } },
        { product: { name: { contains: dto.search, mode: 'insensitive' } } },
        { product: { sku: { contains: dto.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.barcode.findMany({
        where, skip, take: limit,
        include: { product: true, productVariant: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.barcode.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async bulkGenerate(tenantId: string, userId: string, dto: BulkGenerateDto) {
    const results: any[] = [];
    for (const item of dto.items) {
      const qty = item.quantity ?? 1;
      for (let i = 0; i < qty; i++) {
        const barcode = await this.generate(tenantId, userId, {
          productId: item.productId,
          productVariantId: item.productVariantId,
          format: item.format,
          isPrimary: i === 0,
        });
        results.push(barcode);
      }
    }
    return results;
  }

  async createPrintJob(tenantId: string, userId: string, dto: CreatePrintJobDto) {
    return this.prisma.barcodePrintJob.create({
      data: {
        tenantId,
        userId,
        templateId: dto.templateId,
        status: 'PENDING',
        items: dto.items as any,
      },
    });
  }

  async findPrintJobs(tenantId: string, dto: PaginationDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.barcodePrintJob.findMany({
        where: { tenantId }, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { template: true },
      }),
      this.prisma.barcodePrintJob.count({ where: { tenantId } }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getLabelTemplates(tenantId: string) {
    return this.prisma.barcodeLabelTemplate.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async createLabelTemplate(tenantId: string, dto: CreateLabelTemplateDto) {
    if (dto.isDefault) {
      await this.prisma.barcodeLabelTemplate.updateMany({ where: { tenantId }, data: { isDefault: false } });
    }
    return this.prisma.barcodeLabelTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        width: dto.width ?? 50,
        height: dto.height ?? 25,
        showProductName: dto.showProductName ?? true,
        showSku: dto.showSku ?? true,
        showBarcode: dto.showBarcode ?? true,
        showBarcodeValue: dto.showBarcodeValue ?? true,
        showPrice: dto.showPrice ?? false,
        showCategory: dto.showCategory ?? false,
        customText: dto.customText,
        fontSize: dto.fontSize ?? 8,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async updateLabelTemplate(tenantId: string, id: string, dto: Partial<CreateLabelTemplateDto>) {
    const tmpl = await this.prisma.barcodeLabelTemplate.findFirst({ where: { id, tenantId } });
    if (!tmpl) throw new NotFoundException('Label template not found');
    if (dto.isDefault) {
      await this.prisma.barcodeLabelTemplate.updateMany({ where: { tenantId }, data: { isDefault: false } });
    }
    return this.prisma.barcodeLabelTemplate.update({ where: { id }, data: dto as any });
  }

  async deactivateBarcode(tenantId: string, id: string) {
    const barcode = await this.prisma.barcode.findFirst({ where: { id, tenantId } });
    if (!barcode) throw new NotFoundException('Barcode not found');
    return this.prisma.barcode.update({ where: { id }, data: { isActive: false } });
  }
}
