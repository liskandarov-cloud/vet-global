import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Ограничитель частоты с явным выключателем для тестов.
//
// e2e-набор логинится под тремя ролями в каждом прогоне и упирается в лимит
// на вход, из-за чего падают тесты, не связанные с авторизацией. Отключать
// ограничитель правкой лимитов «на время прогона» нельзя — тогда в проде
// окажется ослабленная защита. Поэтому отдельный флаг, который в проде не
// задают, а на старте о нём предупреждаем в логах.
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  private static warned = false;

  protected async shouldSkip(): Promise<boolean> {
    const disabled = process.env.THROTTLE_DISABLED === 'true';
    if (disabled && !AppThrottlerGuard.warned) {
      AppThrottlerGuard.warned = true;
      new Logger(AppThrottlerGuard.name).warn(
        'THROTTLE_DISABLED=true — ограничение частоты запросов ВЫКЛЮЧЕНО. ' +
          'Допустимо только для локальных тестов, не для прода.',
      );
    }
    return disabled;
  }
}
