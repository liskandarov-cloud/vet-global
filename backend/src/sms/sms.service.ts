import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Eskiz.uz SMS gateway. Dev fallback: logs to console when creds are absent,
// so status/OTP flows work without an account. Token is cached (~30-day TTL).
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly baseUrl: string;
  private readonly email?: string;
  private readonly password?: string;
  private readonly from: string;
  private readonly enabled: boolean;
  private token?: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>('ESKIZ_BASE_URL') ?? 'https://notify.eskiz.uz/api';
    this.email = config.get<string>('ESKIZ_EMAIL');
    this.password = config.get<string>('ESKIZ_PASSWORD');
    this.from = config.get<string>('ESKIZ_FROM') ?? '4546';
    this.enabled = Boolean(this.email && this.password);
    if (!this.enabled) {
      this.logger.warn('Eskiz not configured — SMS will be logged to console (dev mode).');
    }
  }

  private normalize(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private async auth(): Promise<string> {
    if (this.token) return this.token;
    const body = new URLSearchParams({ email: this.email!, password: this.password! });
    const res = await fetch(`${this.baseUrl}/auth/login`, { method: 'POST', body });
    if (!res.ok) throw new Error(`Eskiz auth failed: ${res.status}`);
    const data: any = await res.json();
    this.token = data?.data?.token;
    if (!this.token) throw new Error('Eskiz auth: no token in response');
    return this.token;
  }

  async send(phone: string, message: string): Promise<void> {
    const to = this.normalize(phone);
    if (!to) return;

    if (!this.enabled) {
      this.logger.log(`[DEV SMS] → ${to} | ${message}`);
      return;
    }
    try {
      const token = await this.auth();
      const body = new URLSearchParams({ mobile_phone: to, message, from: this.from });
      const res = await fetch(`${this.baseUrl}/message/sms/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      if (res.status === 401) {
        this.token = undefined; // token expired — retry once
        return this.send(phone, message);
      }
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      this.logger.log(`SMS sent → ${to}`);
    } catch (e) {
      this.logger.error(`SMS failed → ${to}: ${(e as Error).message}`);
    }
  }
}
