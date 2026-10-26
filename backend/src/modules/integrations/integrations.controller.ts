import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { IsString, IsOptional, IsArray, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateApiClientDto { @ApiProperty() @IsString() name: string; @ApiPropertyOptional() @IsOptional() @IsString() description?: string; }
class CreateApiKeyDto { @ApiProperty() @IsString() name: string; @ApiPropertyOptional() @IsOptional() @IsArray() scopes?: string[]; @ApiPropertyOptional() @IsOptional() expiresAt?: string; }
class CreateWebhookDto { @ApiProperty() @IsUrl() url: string; @ApiPropertyOptional() @IsOptional() @IsString() description?: string; @ApiPropertyOptional() @IsOptional() @IsArray() events?: string[]; }
class UpdateWebhookDto { @ApiPropertyOptional() @IsOptional() @IsUrl() url?: string; @ApiPropertyOptional() @IsOptional() @IsString() description?: string; @ApiPropertyOptional() @IsOptional() @IsArray() events?: string[]; }

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('clients')
  createApiClient(@CurrentTenant() tenantId: string, @Body() dto: CreateApiClientDto) {
    return this.integrationsService.createApiClient(tenantId, dto);
  }

  @Get('clients')
  findApiClients(@CurrentTenant() tenantId: string) {
    return this.integrationsService.findApiClients(tenantId);
  }

  @Get('api-keys')
  findAllApiKeys(@CurrentTenant() tenantId: string) {
    return this.integrationsService.findAllApiKeys(tenantId);
  }

  @Post('api-keys')
  createDirectApiKey(@CurrentTenant() tenantId: string, @Body() dto: CreateApiKeyDto) {
    return this.integrationsService.createDirectApiKey(tenantId, dto);
  }

  @Delete('api-keys/:keyId')
  revokeDirectApiKey(@CurrentTenant() tenantId: string, @Param('keyId') keyId: string) {
    return this.integrationsService.revokeApiKey(tenantId, keyId);
  }

  @Post('clients/:clientId/keys')
  createApiKey(@CurrentTenant() tenantId: string, @Param('clientId') clientId: string, @Body() dto: CreateApiKeyDto) {
    return this.integrationsService.createApiKey(tenantId, clientId, dto);
  }

  @Delete('keys/:keyId')
  revokeApiKey(@CurrentTenant() tenantId: string, @Param('keyId') keyId: string) {
    return this.integrationsService.revokeApiKey(tenantId, keyId);
  }

  @Post('webhooks')
  createWebhook(@CurrentTenant() tenantId: string, @Body() dto: CreateWebhookDto) {
    return this.integrationsService.createWebhook(tenantId, dto);
  }

  @Get('webhooks')
  findWebhooks(@CurrentTenant() tenantId: string) {
    return this.integrationsService.findWebhooks(tenantId);
  }

  @Patch('webhooks/:id')
  updateWebhook(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.integrationsService.updateWebhook(tenantId, id, dto);
  }

  @Delete('webhooks/:id')
  deleteWebhook(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.integrationsService.deleteWebhook(tenantId, id);
  }

  @Get('webhooks/:id/deliveries')
  getDeliveries(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.integrationsService.getWebhookDeliveries(tenantId, id);
  }
}
