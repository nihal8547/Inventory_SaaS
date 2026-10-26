import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SmtpConfigDto, TestEmailDto } from './dto/mail.dto';

interface StoredSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private tenantConfigs = new Map<string, StoredSmtpConfig>();
  private tenantTransporters = new Map<string, nodemailer.Transporter>();
  private defaultTransporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initDefaultTransporter();
  }

  private initDefaultTransporter() {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const user = this.configService.get<string>('SMTP_USER', '');
    const pass = this.configService.get<string>('SMTP_PASS', '');

    if (user && pass) {
      this.defaultTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Nodemailer default transport initialized for ${host}:${port}`);
    } else {
      this.defaultTransporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.logger.log('Nodemailer initialized in JSON development test transport mode');
    }
  }

  getConfig(tenantId: string) {
    const custom = this.tenantConfigs.get(tenantId);
    if (custom) {
      return {
        host: custom.host,
        port: custom.port,
        secure: custom.secure,
        user: custom.user,
        pass: custom.pass ? '••••••••' : '',
        fromName: custom.fromName,
        fromEmail: custom.fromEmail,
        isCustom: true,
      };
    }

    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const user = this.configService.get<string>('SMTP_USER', '');
    const hasPass = Boolean(this.configService.get<string>('SMTP_PASS', ''));
    const fromName = this.configService.get<string>('MAIL_FROM_NAME', 'InventoryOS Qatar');
    const fromEmail = this.configService.get<string>('MAIL_FROM_EMAIL', 'no-reply@inventory.qa');

    return {
      host,
      port,
      secure: port === 465,
      user,
      pass: hasPass ? '••••••••' : '',
      fromName,
      fromEmail,
      isCustom: false,
    };
  }

  saveConfig(tenantId: string, dto: SmtpConfigDto) {
    let password = dto.pass;
    const existing = this.tenantConfigs.get(tenantId);

    // If password is masked and existing password exists, preserve it
    if ((!password || password === '••••••••') && existing?.pass) {
      password = existing.pass;
    }

    const stored: StoredSmtpConfig = {
      host: dto.host,
      port: Number(dto.port),
      secure: Boolean(dto.secure),
      user: dto.user,
      pass: password || '',
      fromName: dto.fromName,
      fromEmail: dto.fromEmail,
    };

    this.tenantConfigs.set(tenantId, stored);

    // Initialize or replace transporter
    if (stored.user && stored.pass) {
      const transporter = nodemailer.createTransport({
        host: stored.host,
        port: stored.port,
        secure: stored.secure,
        auth: { user: stored.user, pass: stored.pass },
      });
      this.tenantTransporters.set(tenantId, transporter);
    } else {
      this.tenantTransporters.delete(tenantId);
    }

    this.logger.log(`Updated SMTP configuration for tenant ${tenantId}`);
    return this.getConfig(tenantId);
  }

  async testSmtp(dto: TestEmailDto, tenantId?: string) {
    let host = dto.config?.host;
    let port = dto.config?.port ? Number(dto.config.port) : 587;
    let secure = Boolean(dto.config?.secure);
    let user = dto.config?.user;
    let pass = dto.config?.pass;
    let fromName = dto.config?.fromName || 'InventoryOS Qatar';
    let fromEmail = dto.config?.fromEmail || 'no-reply@inventory.qa';

    // If config was not passed in body, try to use tenant's saved config
    if (!host && tenantId) {
      const saved = this.tenantConfigs.get(tenantId);
      if (saved) {
        host = saved.host;
        port = saved.port;
        secure = saved.secure;
        user = saved.user;
        pass = saved.pass;
        fromName = saved.fromName;
        fromEmail = saved.fromEmail;
      }
    }

    // Fall back to environment defaults if still not provided
    if (!host) {
      host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
      port = Number(this.configService.get<number>('SMTP_PORT', 587));
      secure = port === 465;
      user = this.configService.get<string>('SMTP_USER', '');
      pass = this.configService.get<string>('SMTP_PASS', '');
    }

    // If password was sent as masked, retrieve existing stored password
    if (pass === '••••••••' && tenantId && this.tenantConfigs.has(tenantId)) {
      pass = this.tenantConfigs.get(tenantId)?.pass || '';
    }

    // Build test transport
    const testTransporter = user && pass
      ? nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          connectionTimeout: 10000,
        })
      : nodemailer.createTransport({ jsonTransport: true });

    try {
      if (user && pass) {
        await testTransporter.verify();
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0;">InventoryOS — SMTP Connection Verified</h2>
            <p style="color: #10b981; font-weight: bold; font-size: 13px; margin: 4px 0 0 0;">✓ Transport Handshake Successful</p>
          </div>
          <p style="color: #334155; font-size: 14px;">This diagnostic message confirms that your SMTP mail server configuration is fully operational.</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 0; color: #64748b;">SMTP Host:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #0f172a;">${host}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 0; color: #64748b;">SMTP Port:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #0f172a;">${port} (${secure ? 'SSL/TLS' : 'STARTTLS'})</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 0; color: #64748b;">Authenticated User:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #0f172a;">${user || 'Dev JSON Stream'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Dispatched At:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #0f172a;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px; text-align: center;">Inventory SaaS Multi-Tenant Platform — Doha, State of Qatar</p>
        </div>
      `;

      const info = await testTransporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: dto.targetEmail,
        subject: `[Test Success] InventoryOS SMTP Handshake (${host})`,
        html,
      });

      return {
        success: true,
        message: `SMTP connection verified and test message dispatched to ${dto.targetEmail}!`,
        messageId: info.messageId,
      };
    } catch (err: any) {
      this.logger.error(`SMTP Test failed for ${host}:${port}: ${err.message}`, err.stack);
      return {
        success: false,
        error: err.message || 'SMTP Authentication failed. Please check Host, Port, Username, and App Password.',
      };
    }
  }

  async sendMail(to: string[], subject: string, html: string, tenantId?: string) {
    const transporter = (tenantId && this.tenantTransporters.get(tenantId)) || this.defaultTransporter;
    const config = tenantId ? this.tenantConfigs.get(tenantId) : null;
    const from = config
      ? `"${config.fromName}" <${config.fromEmail}>`
      : this.configService.get<string>('MAIL_FROM', '"InventoryOS Qatar" <no-reply@inventory.qa>');

    try {
      const info = await transporter.sendMail({
        from,
        to: to.join(', '),
        subject,
        html,
      });
      this.logger.log(`Email dispatched to ${to.join(', ')}: ${info.messageId || 'sent'}`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to.join(', ')}: ${err.message}`, err.stack);
      return { success: false, error: err.message };
    }
  }

  async sendExecutiveReport(to: string[], subject: string, reportType: string, metrics: any, tenantId?: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0;">InventoryOS Qatar — Executive Intelligence Report</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Standardized Currency: <strong>QAR (Qatari Riyal)</strong></p>
        </div>

        <p style="color: #334155; font-size: 14px;">Please find the automated dispatch for <strong>${reportType.toUpperCase()}</strong> below:</p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #0f172a; font-size: 15px; margin-top: 0;">Financial & Inventory Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;">Report Scope:</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0f172a;">${metrics.scope || 'All Qatar Branches'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;">Total Sales Revenue:</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #2563eb;">QAR ${metrics.totalRevenue || '0.00'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;">Total Orders Processed:</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0f172a;">${metrics.orderCount || '0'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Generated Timestamp:</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0f172a;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
          <p style="margin: 0;">This email was sent via the InventoryOS Automated Email Engine.</p>
          <p style="margin: 4px 0 0 0;">Doha, State of Qatar</p>
        </div>
      </div>
    `;

    return this.sendMail(to, subject, html, tenantId);
  }
}
