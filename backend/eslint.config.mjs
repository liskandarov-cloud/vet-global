// Плоский конфиг ESLint для бэкенда.
//
// Линтера здесь не было вовсе: в package.json стоял скрипт lint, но самого
// eslint в зависимостях не было, и команда падала на отсутствии конфига — то
// есть проверка только выглядела существующей.
//
// Набор правил узкий и намеренно: включать recommended целиком на готовом коде
// значит получить сотни замечаний и отключить линтер совсем. Здесь оставлены те,
// что ловят настоящие ошибки, а не стиль.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'dist-seed/**', 'node_modules/**', 'eslint.config.mjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        // Проверки, которым нужны типы: они и ловят самое дорогое — потерянные
        // промисы, из-за которых ошибка исчезает без следа в логах.
        //
        // Конфигурация для тестов указана отдельно: основной tsconfig исключает
        // test/, и без неё линтер отказывался разбирать файлы тестов.
        project: ['./tsconfig.json', './tsconfig.spec.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Код написан на ожидании типов Prisma и внешних протоколов; запрет any
      // здесь означал бы массовую правку ради формы, а не ради надёжности.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      // Неиспользованное — частый признак недоделанной правки, но аргументы с
      // подчёркиванием оставляют осознанно (подписи интерфейсов Nest).
      // ignoreRestSiblings — про приём «взять всё, кроме»: const { passwordHash,
      // ...rest } = user. Имя здесь нужно именно чтобы поле НЕ попало в ответ, и
      // требовать его использования значит запрещать самый безопасный способ
      // не отдать хеш пароля наружу.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
);
