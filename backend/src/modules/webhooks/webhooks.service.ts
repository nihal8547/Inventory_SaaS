import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  async processOutbox() {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    for (const event of events) {
      await this.dispatchEvent(event);
    }

    return { processed: events.length };
  }

  private async dispatchEvent(event: { id: string; tenantId: string; eventType: string; payload: any }) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        tenantId: event.tenantId,
        isActive: true,
        OR: [
          { events: { array_contains: ['*'] } },
          { events: { array_contains: [event.eventType] } },
        ],
      },
    });

    await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { status: 'PROCESSING' } });

    const deliveryPromises = endpoints.map(endpoint => this.deliverToEndpoint(endpoint, event));
    await Promise.allSettled(deliveryPromises);

    await this.prisma.outboxEvent.update({
      where: { id: event.id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
  }

  private async deliverToEndpoint(endpoint: { id: string; url: string; secret: string }, event: { eventType: string; payload: any }) {
    const payload = JSON.stringify({ event: event.eventType, data: event.payload, timestamp: new Date().toISOString() });
    const signature = crypto.createHmac('sha256', endpoint.secret).update(payload).digest('hex');

    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        eventType: event.eventType,
        payload: event.payload,
        attemptCount: 1,
      },
    });

    try {
      const url = new URL(endpoint.url);
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': event.eventType,
        },
      };

      const statusCode = await new Promise<number>((resolve, reject) => {
        const req = (url.protocol === 'https:' ? https : http).request(url, options, (res) => resolve(res.statusCode ?? 0));
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(payload);
        req.end();
      });

      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { statusCode, deliveredAt: new Date() },
      });
    } catch (err) {
      this.logger.error(`Webhook delivery failed: ${err.message}`);
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { response: err.message, nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) },
      });
    }
  }
}
