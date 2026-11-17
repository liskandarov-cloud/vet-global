import { escapeHtml } from './html';

it('escapeHtml обезвреживает разметку в имени', () => {
  expect(escapeHtml(`<a href="x">O'Neil & Co</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;O&#39;Neil &amp; Co&lt;/a&gt;');
});
