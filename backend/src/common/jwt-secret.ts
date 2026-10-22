// Секрет подписи токенов из переменной окружения.
//
// Раньше при отсутствии переменной молча брался 'dev-secret'. Репозиторий
// публичный, поэтому на проде без переменной любой мог бы подписать себе токен
// администратора. Сейчас на Render секрет задан, но защита держалась на том,
// что его не забудут при переезде на другой хостинг.
//
// На проде отсутствие секрета останавливает запуск. Локально и в тестах
// запасное значение остаётся, чтобы dev-окружение поднималось без настройки.

const DEV_FALLBACK = 'dev-secret';

export function resolveJwtSecret(raw: string | undefined, nodeEnv = process.env.NODE_ENV): string {
  const value = (raw ?? '').trim();
  if (value) {
    if (nodeEnv === 'production' && value === DEV_FALLBACK) {
      throw new Error('JWT_SECRET совпадает с публичным dev-значением — на проде так нельзя');
    }
    return value;
  }
  if (nodeEnv === 'production') {
    throw new Error('JWT_SECRET не задан — без него на проде токены подписывать нельзя');
  }
  return DEV_FALLBACK;
}
