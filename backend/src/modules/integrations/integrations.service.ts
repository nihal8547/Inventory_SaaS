import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  // API Clients
  async createApiClient(tenantId: string, dto: { name: string; description?: string }) {
    return this.prisma.apiClient.create({ data: { tenantId, name: dto.name, description: dto.description } });
  }

  async findApiClients(tenantId: string) {
    return this.prisma.apiClient.findMany({ where: { tenantId, isActive: true }, include: { apiKeys: { where: { isActive: true } } } });
  }

  async findAllApiKeys(tenantId: string) {
    return this.prisma.apiKey.findMany({
      where: { client: { tenantId }, isActive: true },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDirectApiKey(tenantId: string, dto: { name: string; scopes?: string[]; expiresAt?: string }) {
    let client = await this.prisma.apiClient.findFirst({
      where: { tenantId, isActive: true },
    });
    if (!client) {
      client = await this.prisma.apiClient.create({
        data: {
          tenantId,
          name: 'Default Store API Client',
          description: 'Auto-created client for integration keys',
        },
      });
    }
    return this.createApiKey(tenantId, client.id, dto);
  }

  // API Keys
  async createApiKey(tenantId: string, clientId: string, dto: { name: string; scopes?: string[]; expiresAt?: string }) {
    const client = await this.prisma.apiClient.findFirst({ where: { id: clientId, tenantId } });
    if (!client) throw new NotFoundException('API client not found');

    const rawKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 10);

    await this.prisma.apiKey.create({
      data: {
        clientId,
        keyHash,
        keyPrefix,
        name: dto.name,
        scopes: dto.scopes ?? [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return { rawKey, keyPrefix, name: dto.name, message: 'Store this key securely — it will not be shown again' };
  }

  async validateApiKey(rawKey: string): Promise<{ clientId: string; tenantId: string; scopes: string[] } | null> {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { client: true },
    });

    if (!apiKey || !apiKey.isActive) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    await this.prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

    return {
      clientId: apiKey.clientId,
      tenantId: apiKey.client.tenantId,
      scopes: apiKey.scopes as string[],
    };
  }

  async revokeApiKey(tenantId: string, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, client: { tenantId } },
    });
    if (!key) throw new NotFoundException('API key not found');
    try {
      await this.prisma.apiKey.delete({ where: { id: keyId } });
      return { success: true, message: 'API key deleted' };
    } catch {
      return this.prisma.apiKey.update({ where: { id: keyId }, data: { isActive: false } });
    }
  }

  // Webhooks
  async createWebhook(tenantId: string, dto: { url: string; description?: string; events?: string[] }) {
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        tenantId,
        url: dto.url,
        description: dto.description,
        events: dto.events ?? ['*'],
        secret,
      },
    });
    return { ...endpoint, secret };
  }

  async findWebhooks(tenantId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { deliveries: true } } },
    });
  }

  async updateWebhook(tenantId: string, id: string, dto: { url?: string; description?: string; events?: string[]; isActive?: boolean }) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!endpoint) throw new NotFoundException('Webhook not found');
    return this.prisma.webhookEndpoint.update({ where: { id }, data: dto as any });
  }

  async deleteWebhook(tenantId: string, id: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!endpoint) throw new NotFoundException('Webhook not found');
    try {
      await this.prisma.webhookEndpoint.delete({ where: { id } });
      return { success: true, message: 'Webhook deleted' };
    } catch {
      return this.prisma.webhookEndpoint.update({ where: { id }, data: { isActive: false } });
    }
  }

  async getWebhookDeliveries(tenantId: string, endpointId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id: endpointId, tenantId } });
    if (!endpoint) throw new NotFoundException('Webhook not found');
    return this.prisma.webhookDelivery.findMany({
      where: { endpointId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
