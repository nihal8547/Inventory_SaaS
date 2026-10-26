import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
  database: {
    status: 'connected' | 'disconnected';
    latencyMs?: number;
  };
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    let latencyMs: number | undefined;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
      latencyMs = Date.now() - start;
    } catch (err) {
      this.logger.error('Database health ping failed', err);
    }

    const mem = process.memoryUsage();

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'production',
      version: process.env.APP_VERSION || '1.0.0',
      database: {
        status: dbStatus,
        latencyMs,
      },
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
    };
  }

  async isReady(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
