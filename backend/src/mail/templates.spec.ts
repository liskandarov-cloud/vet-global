import { consultBody, itemsTable, leadBody, orderLine } from './templates';

// Поля приходят с публичных форм и из прайсов: разметка в них не должна стать
// ссылкой или картинкой в письме, которое уходит от имени VetHub.
const EVIL = '<a href="https://evil.example">Пётр</a>';
const SAFE = '&lt;a href=&quot;https://evil.example&quot;&gt;Пётр&lt;/a&gt;';

describe('шаблоны писем экранируют ввод пользователя', () => {
  it('заявка', () => {
    const html = leadBody({
      source: 'WEB', fullName: EVIL, phone: '+998901234567',
      productName: 'Вакцина <b>X</b>', quantity: 2, message: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<a href=');
    expect(html).not.toContain('<img');
    expect(html).toContain(SAFE);
    expect(html).toContain('Вакцина &lt;b&gt;X&lt;/b&gt; × 2');
  });

  it('заявка без товара и сообщения — без пустых строк таблицы', () => {
    const html = leadBody({ source: 'TELEGRAM', fullName: 'Иван', phone: '1', productName: null, quantity: null, message: null });
    expect(html).not.toContain('Товар');
    expect(html).not.toContain('Сообщение');
  });

  it('заказ и позиции', () => {
    expect(orderLine('ab12cd34', { buyerName: EVIL, buyerPhone: '1', buyerCompany: '<script>x</script>' }))
      .toBe(`<p style="color:#475569">Заказ <b>#ab12cd34</b> от ${SAFE} (1), &lt;script&gt;x&lt;/script&gt;.</p>`);
    expect(itemsTable([{ productName: EVIL, quantity: 3, price: 1000 }])).toContain(`${SAFE} × 3`);
  });

  it('ветконсультация', () => {
    const html = consultBody({ fullName: EVIL, phone: '1', topic: '<b>t</b>', message: '<img src=x>' });
    expect(html).not.toMatch(/<(a|b|img)[ >]/);
    expect(html).toContain(SAFE);
  });
});
