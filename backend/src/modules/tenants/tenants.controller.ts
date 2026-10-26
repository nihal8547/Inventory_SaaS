import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SuperAdminOnly } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('my-tenants')
  @ApiOperation({ summary: 'Get tenants for current authenticated user' })
  findMyTenants(@CurrentUser() user: any) {
    return this.tenantsService.findForUser(user.id);
  }

  @Post()
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Create tenant (super admin)' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @SuperAdminOnly()
  @ApiOperation({ summary: 'List all tenants (super admin)' })
  findAll(@Query() dto: PaginationDto) {
    return this.tenantsService.findAll(dto);
  }

  @Get(':id')
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Get tenant by id (super admin)' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Update tenant (super admin)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateTenantDto>) {
    return this.tenantsService.update(id, dto);
  }

  @Patch(':id/suspend')
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Suspend tenant' })
  suspend(@Param('id') id: string) {
    return this.tenantsService.suspend(id);
  }

  @Patch(':id/activate')
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Activate tenant' })
  activate(@Param('id') id: string) {
    return this.tenantsService.activate(id);
  }
}
