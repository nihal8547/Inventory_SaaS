import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';

@ApiTags('Health & Monitoring')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'System health check (database, memory, uptime)' })
  @ApiResponse({ status: 200, description: 'Service is operational' })
  async check(@Res() res: Response) {
    const report = await this.healthService.check();
    const httpStatus = report.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(httpStatus).json({
      success: report.status === 'ok',
      data: report,
    });
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for orchestrators / Kubernetes' })
  live(@Res() res: Response) {
    return res.status(HttpStatus.OK).send('OK');
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for load balancers' })
  async ready(@Res() res: Response) {
    const isReady = await this.healthService.isReady();
    if (isReady) {
      return res.status(HttpStatus.OK).send('READY');
    }
    return res.status(HttpStatus.SERVICE_UNAVAILABLE).send('NOT_READY');
  }
}
