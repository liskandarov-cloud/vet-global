import { didoxMode } from './mode';

const env = (vars: Record<string, string>) => (k: string) => vars[k];

describe('режим ЭДО', () => {
  it('с токеном — настоящий обмен', () => {
    expect(didoxMode(env({ DIDOX_TOKEN: 't' }))).toBe('live');
    expect(didoxMode(env({ DIDOX_TOKEN: 't', SEED_DEMO: 'true' }))).toBe('live');
  });

  it('имитация — только рядом с демо-данными', () => {
    expect(didoxMode(env({ SEED_DEMO: 'true', DIDOX_MODE: 'mock' }))).toBe('demo');
  });

  // Прод без токена: раньше здесь была имитация с «подписанными» документами.
  it('прод без токена — выключено', () => {
    expect(didoxMode(env({ DIDOX_MODE: 'mock', SEED_DEMO: 'false' }))).toBe('off');
    expect(didoxMode(env({}))).toBe('off');
  });
});
