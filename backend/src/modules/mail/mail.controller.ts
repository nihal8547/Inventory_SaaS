import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { SmtpConfigDto, TestEmailDto } from './dto/mail.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Mail & SMTP Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('config')
  @RequirePermissions('branches.read')
  @ApiOperation({ summary: 'Get current SMTP configuration' })
  getConfig(@CurrentTenant() tenantId: string) {
    return this.mailService.getConfig(tenantId);
  }

  @Post('config')
  @RequirePermissions('branches.update')
  @ApiOperation({ summary: 'Update and save SMTP configuration' })
  saveConfig(@CurrentTenant() tenantId: string, @Body() dto: SmtpConfigDto) {
    return this.mailService.saveConfig(tenantId, dto);
  }

  @Post('test')
  @RequirePermissions('branches.update')
  @ApiOperation({ summary: 'Test SMTP server handshake and dispatch test email' })
  testConnection(@CurrentTenant() tenantId: string, @Body() dto: TestEmailDto) {
    return this.mailService.testSmtp(dto, tenantId);
  }
}
