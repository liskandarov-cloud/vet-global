import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: nodemailer.Transporter;
  private from: string;
  private enabled = false;

  constructor(private readonly config: ConfigService) {
    this.from = config.get<string>('MAIL_FROM') ?? 'VetGlobal <no-reply@vetglobal.uz>';
  }

  onModuleInit() {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP not configured — emails will be logged to console (dev mode).');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get('SMTP_PORT') ?? 587),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: this.config.get('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASS'),
          }
        : undefined,
    });
    this.enabled = true;
    this.logger.log(`SMTP transport ready (${host}).`);
  }

  // Sends a message; in dev (no SMTP) it logs instead of throwing.
  async send(msg: MailMessage): Promise<void> {
    const to = Array.isArray(msg.to) ? msg.to.filter(Boolean).join(', ') : msg.to;
    if (!to) return;

    if (!this.enabled || !this.transporter) {
      this.logger.log(`[DEV EMAIL] → ${to} | ${msg.subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject: msg.subject, html: msg.html });
      this.logger.log(`Email sent → ${to} | ${msg.subject}`);
    } catch (e) {
      this.logger.error(`Email failed → ${to}: ${(e as Error).message}`);
    }
  }
}
