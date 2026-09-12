// Тесты фронтенда.
//
// До этого их не было вовсе: проверяли только то, что сборка проходит. Из-за
// этого правки хуков приходилось опирать на чтение кода, а не на поведение.
//
// happy-dom, а не jsdom: последний в версии 27 падает на несовместимости
// модульных систем внутри своих зависимостей по работе с цветом CSS. DOM нужен
// не ради рисования, а ради localStorage — корзина сохраняется через persist из
// zustand и без него не поднимается.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Тот же алиас, что в tsconfig: иначе импорты вида @/lib/store не найдутся.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Каждый файл в своей среде: сторы zustand держат состояние в модуле, и
    // общая среда давала бы протекание между файлами.
    isolate: true,
  },
});
