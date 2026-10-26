import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BarcodesService } from './barcodes.service';
import { GenerateBarcodeDto } from './dto/generate-barcode.dto';
import { AssignBarcodeDto } from './dto/assign-barcode.dto';
import { BulkGenerateDto } from './dto/bulk-generate.dto';
import { CreatePrintJobDto } from './dto/create-print-job.dto';
import { CreateLabelTemplateDto } from './dto/create-label-template.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Barcodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('barcodes')
export class BarcodesController {
  constructor(private readonly barcodesService: BarcodesService) {}

  @Post('generate')
  @RequirePermissions('products.barcode.generate')
  @ApiOperation({ summary: 'Generate barcode for product' })
  generate(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: GenerateBarcodeDto) {
    return this.barcodesService.generate(tenantId, user.id, dto);
  }

  @Post('assign')
  @RequirePermissions('products.barcode.generate')
  @ApiOperation({ summary: 'Assign external barcode to product' })
  assignExternal(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: AssignBarcodeDto) {
    return this.barcodesService.assignExternal(tenantId, user.id, dto);
  }

  @Get(['lookup', 'lookup/:value'])
  @RequirePermissions('products.read')
  @ApiOperation({ summary: 'Lookup product by barcode value' })
  @ApiQuery({ name: 'value', required: false })
  lookup(
    @CurrentTenant() tenantId: string,
    @Query('value') queryValue?: string,
    @Param('value') paramValue?: string,
  ) {
    const val = queryValue || paramValue || '';
    return this.barcodesService.lookup(tenantId, val);
  }

  @Post('bulk-generate')
  @RequirePermissions('products.barcode.generate')
  @ApiOperation({ summary: 'Bulk generate barcodes' })
  bulkGenerate(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: BulkGenerateDto) {
    return this.barcodesService.bulkGenerate(tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('products.read')
  @ApiOperation({ summary: 'List all barcodes with pagination' })
  findAll(@CurrentTenant() tenantId: string, @Query() dto: PaginationDto & { format?: string; type?: string }) {
    return this.barcodesService.findAll(tenantId, dto);
  }

  @Get('by-product/:productId')
  @RequirePermissions('products.read')
  @ApiOperation({ summary: 'Get barcodes by product' })
  findByProduct(@CurrentTenant() tenantId: string, @Param('productId') productId: string) {
    return this.barcodesService.findByProduct(tenantId, productId);
  }

  @Delete(':id')
  @RequirePermissions('products.barcode.generate')
  @ApiOperation({ summary: 'Deactivate barcode' })
  deactivate(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.barcodesService.deactivateBarcode(tenantId, id);
  }

  @Post('print-jobs')
  @RequirePermissions('products.barcode.print')
  @ApiOperation({ summary: 'Create print job' })
  createPrintJob(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: CreatePrintJobDto) {
    return this.barcodesService.createPrintJob(tenantId, user.id, dto);
  }

  @Get('print-jobs')
  @RequirePermissions('products.barcode.print')
  @ApiOperation({ summary: 'List print jobs' })
  findPrintJobs(@CurrentTenant() tenantId: string, @Query() dto: PaginationDto) {
    return this.barcodesService.findPrintJobs(tenantId, dto);
  }

  @Get('label-templates')
  @RequirePermissions('products.read')
  @ApiOperation({ summary: 'List label templates' })
  getLabelTemplates(@CurrentTenant() tenantId: string) {
    return this.barcodesService.getLabelTemplates(tenantId);
  }

  @Post('label-templates')
  @RequirePermissions('products.barcode.print')
  @ApiOperation({ summary: 'Create label template' })
  createLabelTemplate(@CurrentTenant() tenantId: string, @Body() dto: CreateLabelTemplateDto) {
    return this.barcodesService.createLabelTemplate(tenantId, dto);
  }

  @Patch('label-templates/:id')
  @RequirePermissions('products.barcode.print')
  @ApiOperation({ summary: 'Update label template' })
  updateLabelTemplate(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateLabelTemplateDto>) {
    return this.barcodesService.updateLabelTemplate(tenantId, id, dto);
  }
}
