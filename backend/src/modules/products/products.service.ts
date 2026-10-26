import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { DuplicateHandlingMode, ImportExcelDto } from './dto/import-excel.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateProductDto) {
    const sku = dto.sku ?? `SKU-${Date.now()}`;
    const existing = await this.prisma.product.findFirst({ where: { tenantId, sku } });
    if (existing) throw new ConflictException('SKU already exists');

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        name: dto.name,
        sku,
        description: dto.description,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        unitId: dto.unitId,
        imageUrl: dto.imageUrl,
        costPrice: dto.costPrice ?? 0,
        sellingPrice: dto.sellingPrice ?? 0,
        taxRate: dto.taxRate,
        trackInventory: true,
        createdBy: userId,
      },
      include: { category: true, brand: true, unit: true, variants: true },
    });

    return product;
  }

  async findAll(tenantId: string, dto: QueryProductDto) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, isActive: true };
    if (dto.search && dto.search.trim()) {
      const q = dto.search.trim();
      const col = (dto.searchColumn || 'all').toLowerCase();

      if (col === 'name') {
        where.name = { contains: q, mode: 'insensitive' };
      } else if (col === 'sku') {
        where.sku = { contains: q, mode: 'insensitive' };
      } else if (col === 'barcode') {
        where.barcodes = { some: { barcodeValue: { contains: q, mode: 'insensitive' }, isActive: true } };
      } else if (col === 'category') {
        where.category = { name: { contains: q, mode: 'insensitive' } };
      } else if (col === 'brand') {
        where.brand = { name: { contains: q, mode: 'insensitive' } };
      } else {
        // all columns
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { barcodes: { some: { barcodeValue: { contains: q, mode: 'insensitive' }, isActive: true } } },
          { category: { name: { contains: q, mode: 'insensitive' } } },
          { brand: { name: { contains: q, mode: 'insensitive' } } },
        ];
      }
    }
    if (dto.categoryId) where.categoryId = dto.categoryId;
    if ((dto as any).brandId) where.brandId = (dto as any).brandId;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          brand: true,
          unit: true,
          barcodes: { where: { isActive: true } },
          stockBalances: {
            select: {
              branchId: true,
              warehouseId: true,
              onHand: true,
              reserved: true,
              reorderLevel: true,
            },
          },
          _count: { select: { variants: true, barcodes: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: { category: true, brand: true, unit: true, variants: true, barcodes: { where: { isActive: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(tenantId, id);
    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        unitId: dto.unitId,
        imageUrl: dto.imageUrl,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        taxRate: dto.taxRate,
      },
      include: { category: true, brand: true },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  // Categories
  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    const slug = dto.name.toLowerCase().replace(/\s+/g, '-');
    const existing = await this.prisma.category.findFirst({ where: { tenantId, slug } });
    if (existing) throw new ConflictException('Category slug already exists');
    return this.prisma.category.create({ data: { tenantId, name: dto.name, slug, description: dto.description, parentId: dto.parentId } });
  }

  async findAllCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, isActive: true },
      include: { children: true, _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async updateCategory(tenantId: string, id: string, dto: Partial<CreateCategoryDto>) {
    const cat = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.category.update({ where: { id }, data: { name: dto.name, description: dto.description } });
  }

  async deleteCategory(tenantId: string, id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }

  // Brands
  async createBrand(tenantId: string, dto: CreateBrandDto) {
    return this.prisma.brand.create({ data: { tenantId, name: dto.name, description: dto.description } });
  }

  async findAllBrands(tenantId: string) {
    return this.prisma.brand.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async updateBrand(tenantId: string, id: string, dto: Partial<CreateBrandDto>) {
    const brand = await this.prisma.brand.findFirst({ where: { id, tenantId } });
    if (!brand) throw new NotFoundException('Brand not found');
    return this.prisma.brand.update({ where: { id }, data: { name: dto.name, description: dto.description } });
  }

  // Units
  async findAllUnits(tenantId: string) {
    return this.prisma.unit.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  // --- EXCEL IMPORT WITHOUT DUPLICATES ---
  async importExcel(
    tenantId: string,
    userId: string,
    payload: {
      fileBuffer?: Buffer;
      branchId: string;
      duplicateMode?: DuplicateHandlingMode;
      items?: any[];
    },
  ) {
    const branchId = payload.branchId;
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!branch) {
      throw new BadRequestException('Target branch not found or unauthorized');
    }

    const duplicateMode = payload.duplicateMode || DuplicateHandlingMode.UPDATE_INFO_ADD_STOCK;

    // 1. Parse rows either from file buffer or JSON array
    let rawRows: any[] = [];
    if (payload.fileBuffer) {
      try {
        const workbook = XLSX.read(payload.fileBuffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new BadRequestException('Uploaded spreadsheet contains no sheets');
        }
        const worksheet = workbook.Sheets[firstSheetName];
        rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      } catch (err: any) {
        throw new BadRequestException(`Failed to parse Excel file: ${err.message || 'Invalid format'}`);
      }
    } else if (Array.isArray(payload.items) && payload.items.length > 0) {
      rawRows = payload.items;
    } else {
      throw new BadRequestException('No items or Excel file provided for import');
    }

    if (rawRows.length === 0) {
      throw new BadRequestException('The spreadsheet is empty. Please add items before uploading.');
    }

    // 2. Normalize row fields (case-insensitive column names)
    const normalizedRows = rawRows.map((r, idx) => {
      const getVal = (...keys: string[]) => {
        for (const k of keys) {
          const foundKey = Object.keys(r).find((rk) => rk.trim().toLowerCase() === k.toLowerCase());
          if (foundKey && r[foundKey] !== undefined && r[foundKey] !== null && String(r[foundKey]).trim() !== '') {
            return r[foundKey];
          }
        }
        return '';
      };

      const name = String(getVal('Product Name', 'Item Name', 'name', 'product_name', 'item_name', 'Title')).trim();
      const sku = String(getVal('SKU', 'sku', 'Item Code', 'item_code', 'Code')).trim();
      const barcode = String(getVal('Barcode', 'barcode', 'UPC', 'EAN', 'Barcode Value')).trim();
      const categoryName = String(getVal('Category', 'category', 'Category Name', 'categoryName')).trim();
      const costPrice = Math.max(0, Math.round(Number(getVal('Cost Price', 'Cost Price (QAR)', 'Cost', 'cost_price', 'costPrice') || 0) * 100) / 100);
      const sellingPrice = Math.max(0, Math.round(Number(getVal('Selling Price', 'Selling Price (QAR)', 'Price', 'selling_price', 'sellingPrice') || 0) * 100) / 100);
      const taxRate = Math.max(0, Math.min(100, Number(getVal('Tax Rate', 'Tax Rate (%)', 'Tax', 'VAT', 'tax_rate', 'taxRate') || 0)));
      const initialStock = Math.max(0, Math.floor(Number(getVal('Initial Stock', 'Stock', 'Quantity', 'Qty', 'initial_stock', 'initialStock') || 0)));
      const description = String(getVal('Description', 'description', 'Notes')).trim();

      return {
        rowNumber: idx + 2,
        name,
        sku,
        barcode,
        categoryName,
        costPrice,
        sellingPrice,
        taxRate,
        initialStock,
        description,
      };
    });

    return this.prisma.$transaction(async (tx) => {
      // 3. Pre-load existing items for fast deduplication lookup
      const existingProducts = await tx.product.findMany({
        where: { tenantId },
        include: { barcodes: true },
      });

      const skuMap = new Map<string, any>();
      const barcodeMap = new Map<string, any>();
      const nameMap = new Map<string, any>();

      for (const p of existingProducts) {
        if (p.sku) skuMap.set(p.sku.toLowerCase().trim(), p);
        if (p.name) nameMap.set(p.name.toLowerCase().trim(), p);
        for (const b of p.barcodes) {
          if (b.barcodeValue) barcodeMap.set(b.barcodeValue.toLowerCase().trim(), p);
        }
      }

      // Pre-load existing categories
      const existingCategories = await tx.category.findMany({ where: { tenantId } });
      const categoryMap = new Map<string, string>();
      for (const c of existingCategories) {
        categoryMap.set(c.name.toLowerCase().trim(), c.id);
      }

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      const details: { rowNumber: number; name: string; sku: string; status: string; reason?: string }[] = [];

      // Track duplicates within the uploaded file itself
      const inBatchSeenSkus = new Set<string>();

      for (const row of normalizedRows) {
        if (!row.name) {
          errors.push(`Row #${row.rowNumber}: Product Name is missing. Row skipped.`);
          continue;
        }

        const normalizedSku = row.sku ? row.sku.toLowerCase().trim() : '';
        const normalizedBarcode = row.barcode ? row.barcode.toLowerCase().trim() : '';
        const normalizedName = row.name.toLowerCase().trim();

        // Check if duplicate within file
        if (normalizedSku && inBatchSeenSkus.has(normalizedSku)) {
          skippedCount++;
          details.push({
            rowNumber: row.rowNumber,
            name: row.name,
            sku: row.sku,
            status: 'SKIPPED',
            reason: 'Duplicate SKU inside the same spreadsheet',
          });
          continue;
        }

        // Deduplication Matcher
        let matchedProduct: any = null;
        if (normalizedSku && skuMap.has(normalizedSku)) {
          matchedProduct = skuMap.get(normalizedSku);
        } else if (normalizedBarcode && barcodeMap.has(normalizedBarcode)) {
          matchedProduct = barcodeMap.get(normalizedBarcode);
        } else if (!normalizedSku && nameMap.has(normalizedName)) {
          matchedProduct = nameMap.get(normalizedName);
        }

        // --- HANDLE DUPLICATE ---
        if (matchedProduct) {
          if (duplicateMode === DuplicateHandlingMode.SKIP) {
            skippedCount++;
            details.push({
              rowNumber: row.rowNumber,
              name: row.name,
              sku: matchedProduct.sku,
              status: 'SKIPPED',
              reason: `Already exists in system (SKU: ${matchedProduct.sku})`,
            });
            continue;
          }

          // Update product details
          const updateData: any = {
            name: row.name,
          };
          if (row.description) updateData.description = row.description;
          if (row.sellingPrice > 0) updateData.sellingPrice = row.sellingPrice;
          if (row.costPrice > 0) updateData.costPrice = row.costPrice;
          if (row.taxRate >= 0) updateData.taxRate = row.taxRate;

          await tx.product.update({
            where: { id: matchedProduct.id },
            data: updateData,
          });

          // Stock adjustment
          if (duplicateMode === DuplicateHandlingMode.UPDATE_INFO_ADD_STOCK && row.initialStock > 0) {
            const balance = await tx.stockBalance.findFirst({
              where: { tenantId, productId: matchedProduct.id, branchId },
            });
            const before = balance ? Number(balance.onHand) : 0;
            const after = before + row.initialStock;

            if (balance) {
              await tx.stockBalance.update({
                where: { id: balance.id },
                data: { onHand: { increment: row.initialStock } },
              });
            } else {
              await tx.stockBalance.create({
                data: {
                  tenantId,
                  productId: matchedProduct.id,
                  branchId,
                  onHand: row.initialStock,
                  reserved: 0,
                },
              });
            }

            await tx.stockLedger.create({
              data: {
                tenantId,
                productId: matchedProduct.id,
                branchId,
                transactionType: 'IMPORT_ADJUSTMENT',
                quantity: row.initialStock,
                balanceBefore: before,
                balanceAfter: after,
                referenceType: 'excel_import',
                createdBy: userId,
                notes: `Excel import stock top-up (+${row.initialStock})`,
              },
            });
          } else if (duplicateMode === DuplicateHandlingMode.UPDATE_INFO_REPLACE_STOCK) {
            const balance = await tx.stockBalance.findFirst({
              where: { tenantId, productId: matchedProduct.id, branchId },
            });
            const before = balance ? Number(balance.onHand) : 0;

            if (balance) {
              await tx.stockBalance.update({
                where: { id: balance.id },
                data: { onHand: row.initialStock },
              });
            } else {
              await tx.stockBalance.create({
                data: {
                  tenantId,
                  productId: matchedProduct.id,
                  branchId,
                  onHand: row.initialStock,
                  reserved: 0,
                },
              });
            }

            await tx.stockLedger.create({
              data: {
                tenantId,
                productId: matchedProduct.id,
                branchId,
                transactionType: 'IMPORT_OVERWRITE',
                quantity: row.initialStock - before,
                balanceBefore: before,
                balanceAfter: row.initialStock,
                referenceType: 'excel_import',
                createdBy: userId,
                notes: `Excel import replaced stock with ${row.initialStock}`,
              },
            });
          }

          updatedCount++;
          details.push({
            rowNumber: row.rowNumber,
            name: row.name,
            sku: matchedProduct.sku,
            status: 'UPDATED',
            reason:
              duplicateMode === DuplicateHandlingMode.UPDATE_INFO_ADD_STOCK
                ? `Updated details & added +${row.initialStock} stock`
                : duplicateMode === DuplicateHandlingMode.UPDATE_INFO_REPLACE_STOCK
                ? `Updated details & set stock to ${row.initialStock}`
                : 'Updated details only',
          });
          continue;
        }

        // --- CREATE NEW PRODUCT ---
        // Ensure category
        let categoryId: string | null = null;
        if (row.categoryName) {
          const catKey = row.categoryName.toLowerCase().trim();
          if (categoryMap.has(catKey)) {
            categoryId = categoryMap.get(catKey)!;
          } else {
            const slug =
              row.categoryName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
            const newCat = await tx.category.create({
              data: {
                tenantId,
                name: row.categoryName,
                slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
              },
            });
            categoryId = newCat.id;
            categoryMap.set(catKey, newCat.id);
          }
        }

        const generatedSku = row.sku || `SKU-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

        const newProduct = await tx.product.create({
          data: {
            tenantId,
            name: row.name,
            sku: generatedSku,
            description: row.description || undefined,
            categoryId,
            costPrice: row.costPrice,
            sellingPrice: row.sellingPrice,
            taxRate: row.taxRate,
            trackInventory: true,
            createdBy: userId,
          },
        });

        // Create barcode if provided or auto-generate
        const barcodeVal = row.barcode || generatedSku;
        try {
          await tx.barcode.create({
            data: {
              tenantId,
              productId: newProduct.id,
              barcodeValue: barcodeVal,
              barcodeFormat: 'CODE128',
              isPrimary: true,
              createdBy: userId,
            },
          });
          barcodeMap.set(barcodeVal.toLowerCase().trim(), newProduct);
        } catch (e) {
          // ignore barcode conflict if barcode already taken
        }

        // Create initial stock balance if initialStock > 0
        if (row.initialStock > 0) {
          await tx.stockBalance.create({
            data: {
              tenantId,
              productId: newProduct.id,
              branchId,
              onHand: row.initialStock,
              reserved: 0,
            },
          });

          await tx.stockLedger.create({
            data: {
              tenantId,
              productId: newProduct.id,
              branchId,
              transactionType: 'INITIAL_STOCK',
              quantity: row.initialStock,
              balanceBefore: 0,
              balanceAfter: row.initialStock,
              referenceType: 'excel_import',
              createdBy: userId,
              notes: `Excel initial import with ${row.initialStock} units`,
            },
          });
        }

        skuMap.set(generatedSku.toLowerCase().trim(), newProduct);
        nameMap.set(row.name.toLowerCase().trim(), newProduct);
        if (normalizedSku) inBatchSeenSkus.add(normalizedSku);

        createdCount++;
        details.push({
          rowNumber: row.rowNumber,
          name: row.name,
          sku: generatedSku,
          status: 'CREATED',
        });
      }

      return {
        success: true,
        branchId,
        branchName: branch.name,
        totalProcessed: normalizedRows.length,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount: errors.length,
        errors,
        details,
      };
    });
  }

  generateExcelTemplate(): Buffer {
    const sampleData = [
      {
        'Product Name': 'Galaxy S24 Ultra 256GB Titanium',
        'SKU': 'SAM-S24U-256',
        'Barcode': '8806095321012',
        'Category': 'Smartphones',
        'Cost Price (QAR)': 3400.0,
        'Selling Price (QAR)': 4200.0,
        'Tax Rate (%)': 0.0,
        'Initial Stock': 15,
        'Description': 'Flagship AI smartphone with S-Pen',
      },
      {
        'Product Name': 'Sony WH-1000XM5 Wireless Headphones',
        'SKU': 'SNY-WH1000XM5-BLK',
        'Barcode': '4548736132580',
        'Category': 'Audio & Sound',
        'Cost Price (QAR)': 850.0,
        'Selling Price (QAR)': 1199.0,
        'Tax Rate (%)': 0.0,
        'Initial Stock': 25,
        'Description': 'Industry leading noise cancelling headphones',
      },
      {
        'Product Name': 'Al Marai Fresh Full Cream Milk 2L',
        'SKU': 'ALM-MILK-2L',
        'Barcode': '6281007011025',
        'Category': 'Fresh Groceries',
        'Cost Price (QAR)': 9.5,
        'Selling Price (QAR)': 12.0,
        'Tax Rate (%)': 0.0,
        'Initial Stock': 60,
        'Description': 'Daily fresh dairy milk produced locally',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 38 }, // Product Name
      { wch: 20 }, // SKU
      { wch: 18 }, // Barcode
      { wch: 18 }, // Category
      { wch: 18 }, // Cost Price
      { wch: 18 }, // Selling Price
      { wch: 14 }, // Tax Rate
      { wch: 14 }, // Initial Stock
      { wch: 42 }, // Description
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock_Import_Template');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
