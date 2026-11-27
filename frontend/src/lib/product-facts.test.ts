import { describe, expect, it } from 'vitest';
import { flatDescription, latin, mergeFacts, splitDescription } from './product-facts';

describe('splitDescription', () => {
  it('строки «Метка: значение» — в таблицу, остальное — абзацами', () => {
    const d = splitDescription(
      'Концентрат для приготовления раствора: тилмикозин 250 мг.\nПоказания: микоплазмоз\nKoʻrsatmalar: mikoplazmoz\nСрок ожидания: 16 суток (убой на мясо)',
    );
    expect(d.paras).toEqual(['Концентрат для приготовления раствора: тилмикозин 250 мг.']);
    expect(d.rows).toEqual([
      ['Показания', 'микоплазмоз'],
      ['Koʻrsatmalar', 'mikoplazmoz'],
      ['Срок ожидания', '16 суток (убой на мясо)'],
    ]);
  });

  it('старое описание одним абзацем не ломается', () => {
    const d = splitDescription('Вакцина против ИБК. Фасовка: 1 000 доз. Цена с НДС.');
    expect(d).toEqual({ paras: ['Вакцина против ИБК. Фасовка: 1 000 доз. Цена с НДС.'], rows: [] });
  });

  it('метка с цифрами или со строчной буквы — не строка таблицы', () => {
    expect(splitDescription('На 1 л: L-карнитин').rows).toEqual([]);
    expect(splitDescription('доза: 1 мл').rows).toEqual([]);
    expect(splitDescription('Ichish uchun eritma: 1 ml da tilmikozin').rows).toEqual([]);
  });
});

describe('flatDescription', () => {
  it('склеивает строки в предложения без двойных точек', () => {
    expect(flatDescription('Вакцина (живая).\nФасовка: 1 000 доз\nЦена: с НДС')).toBe('Вакцина (живая). Фасовка: 1 000 доз. Цена: с НДС');
  });
});

describe('mergeFacts', () => {
  it('пропускает пустые поля и строки, повторяющие поле', () => {
    expect(mergeFacts([['Форма', 'живая'], ['Вещество', null]], [['Тип', 'Живая'], ['Фасовка', '1 000 доз']])).toEqual([
      ['Форма', 'живая'],
      ['Фасовка', '1 000 доз'],
    ]);
  });
});

describe('latin', () => {
  it('имена производителей латиницей', () => {
    expect(latin('НПЦ БелАгроГен (Беларусь)')).toBe('NPTs BelAgroGen (Belarus)');
    expect(latin('АВИВАК')).toBe('AVIVAK');
    expect(latin('Kaesler Nutrition GmbH (Германия)')).toBe('Kaesler Nutrition GmbH (Germaniya)');
  });
});
