// Плоский конфиг ESLint. Раньше в проекте конфига не было вовсе: скрипт
// npm run lint существовал, но `next lint` без конфига уходил в интерактивную
// настройку и в CI падал. В Next 15 команда `next lint` объявлена устаревшей,
// поэтому линт запускается напрямую через eslint.
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  {
    ignores: ['.next/**', '.open-next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals'),
];

export default config;
