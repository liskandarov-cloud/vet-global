import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

// Глобальный обработчик ошибок.
//
// Зачем: без него необработанное исключение уходит в ответ невнятной 500-кой,
// а в логах — простыня стека без контекста (кто, куда, с чем обращался). На
// демо это значит «что-то упало» вместо «POST /orders от продавца X упал на
// таком-то поле». Фильтр приводит ответ к единому виду, пишет структурную
// строку в лог и — если задан ERROR_WEBHOOK_URL — шлёт оповещение о серверных
// (5xx) ошибках. Внешних зависимостей нет: тяжёлый SDK на бесплатном Render
// разгонял бы каждый запрос (проверено на другом проекте), поэтому обычный fetch.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');
  private readonly webhook = process.env.ERROR_WEBHOOK_URL;
  // Не чаще одного оповещения в 10 секунд: крашлуп не должен заваливать канал.
  private lastAlert = 0;
  private static readonly ALERT_THROTTLE_MS = 10_000;

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Тело ответа: у HttpException берём его собственное, у прочего — общая 500
    // без утечки внутренностей наружу.
    const body = isHttp
      ? (exception.getResponse() as any)
      : { statusCode: status, message: 'Internal server error' };

    // Клиентские ошибки (4xx) — это обычная валидация/доступ, не инцидент:
    // отвечаем и уходим, канал оповещений не трогаем.
    if (status < HttpStatus.INTERNAL_SERVER_ERROR) {
      res.status(status).json(body);
      return;
    }

    const userId = (req as any).user?.id;
    const detail = exception instanceof Error ? exception.stack ?? exception.message : String(exception);
    this.logger.error(
      `${req.method} ${req.originalUrl} → ${status}` +
        (userId ? ` [user ${userId}]` : ' [guest]') +
        `\n${detail}`,
    );

    void this.alert(req, status, exception, userId);
    res.status(status).json(body);
  }

  private async alert(req: Request, status: number, exception: unknown, userId?: string) {
    if (!this.webhook) return;
    const now = Date.now();
    if (now - this.lastAlert < AllExceptionsFilter.ALERT_THROTTLE_MS) return;
    this.lastAlert = now;

    const msg = exception instanceof Error ? exception.message : String(exception);
    const text =
      `🔴 VetGlobal ${status}\n${req.method} ${req.originalUrl}\n` +
      `${userId ? `user ${userId}` : 'guest'}\n${msg}`.slice(0, 900);

    try {
      const isTelegram = /api\.telegram\.org/.test(this.webhook);
      const chatId = process.env.ERROR_WEBHOOK_CHAT_ID;
      // Telegram Bot API ждёт chat_id+text; прочие вебхуки (Slack/Discord) — {text}.
      const payload =
        isTelegram && chatId ? { chat_id: chatId, text } : { text };
      await fetch(this.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      // Оповещение — вспомогательное; его сбой не должен влиять на ответ клиенту.
    }
  }
}
