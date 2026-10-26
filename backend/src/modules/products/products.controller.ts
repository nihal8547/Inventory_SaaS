import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { ImportExcelDto } from './dto/import-excel.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions('products.create')
  create(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('products.read')
  findAll(@CurrentTenant() tenantId: string, @Query() dto: QueryProductDto) {
    return this.productsService.findAll(tenantId, dto);
  }

  // Categories (defined before :id wildcard)
  @Post('categories')
  @RequirePermissions('products.create')
  createCategory(@CurrentTenant() tenantId: string, @Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(tenantId, dto);
  }

  @Get(['categories', 'categories/list'])
  @RequirePermissions('products.read')
  findAllCategories(@CurrentTenant() tenantId: string) {
    return this.productsService.findAllCategories(tenantId);
  }

  @Patch('categories/:id')
  @RequirePermissions('products.update')
  updateCategory(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.productsService.updateCategory(tenantId, id, dto);
  }

  @Delete('categories/:id')
  @RequirePermissions('products.delete')
  deleteCategory(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productsService.deleteCategory(tenantId, id);
  }

  // Brands (defined before :id wildcard)
  @Post('brands')
  @RequirePermissions('products.create')
  createBrand(@CurrentTenant() tenantId: string, @Body() dto: CreateBrandDto) {
    return this.productsService.createBrand(tenantId, dto);
  }

  @Get(['brands', 'brands/list'])
  @RequirePermissions('products.read')
  findAllBrands(@CurrentTenant() tenantId: string) {
    return this.productsService.findAllBrands(tenantId);
  }

  @Patch('brands/:id')
  @RequirePermissions('products.update')
  updateBrand(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateBrandDto>) {
    return this.productsService.updateBrand(tenantId, id, dto);
  }

  // Units (defined before :id wildcard)
  @Get(['units', 'units/list'])
  @RequirePermissions('products.read')
  findAllUnits(@CurrentTenant() tenantId: string) {
    return this.productsService.findAllUnits(tenantId);
  }

  // --- EXCEL TEMPLATE DOWNLOAD & UPLOAD ---
  @Get('import-template')
  @RequirePermissions('products.read')
  @ApiOperation({ summary: 'Download standard Excel stock import template' })
  downloadTemplate(@Res() res: Response) {
    const buffer = this.productsService.generateExcelTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="stock_import_template.xlsx"');
    return res.end(buffer);
  }

  @Post('import-excel')
  @RequirePermissions('products.create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import items and stock data from Excel or JSON without duplicates' })
  @ApiConsumes('multipart/form-data', 'application/json')
  importExcel(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const branchId = body.branchId;
    const duplicateMode = body.duplicateMode;
    let items = body.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        items = undefined;
      }
    }

    return this.productsService.importExcel(tenantId, user.id, {
      fileBuffer: file?.buffer,
      branchId,
      duplicateMode,
      items,
    });
  }

  // Specific Product by ID (wildcard :id placed after static sub-routes)
  @Get(':id')
  @RequirePermissions('products.read')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('products.update')
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('products.delete')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productsService.remove(tenantId, id);
  }
}
