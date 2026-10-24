// Комиссия заказа по продавцам.
//
// Комиссия записывается в заказ один раз, с округлением до тийина. Отчёт по
// выплатам раньше пересчитывал её заново — 12 % от всей выручки продавца — и
// расходился с проводками: сумма округлённых значений не равна округлённой
// сумме. Хватало трёх заказов по 86 419,20 сум, чтобы по отчёту, на основании
// которого продавцу выставляют счёт, вышел лишний тийин. Цены с тийинами
// появляются от любой процентной скидки, так что на живых данных это вопрос
// времени, а не случая.
//
// Теперь отчёт делит уже записанную комиссию заказа между его продавцами
// пропорционально их выручке. Делится в целых тийинах, остаток уходит тем, у
// кого дробная часть доли больше: сумма по продавцам всегда в точности равна
// комиссии заказа.

export function splitOrderCommission(
  commission: number,
  revenueBySeller: Record<string, number>,
): Record<string, number> {
  const totalTiyin = Math.round(Number(commission) * 100);
  const sellers = Object.keys(revenueBySeller).sort();
  if (!sellers.length) return {};

  const weights = sellers.map((s) => Math.max(0, Math.round(Number(revenueBySeller[s]) * 100)));
  const weightSum = weights.reduce((a, b) => a + b, 0);

  // Выручки нет (заказ из одних бесплатных позиций) — делить не по чему,
  // поровну честнее, чем отдать всё первому по алфавиту.
  const exact = weightSum > 0
    ? weights.map((w) => (totalTiyin * w) / weightSum)
    : weights.map(() => totalTiyin / sellers.length);

  const shares = exact.map(Math.floor);
  let rest = totalTiyin - shares.reduce((a, b) => a + b, 0);
  const byFraction = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of byFraction) {
    if (rest <= 0) break;
    shares[i] += 1;
    rest -= 1;
  }

  return Object.fromEntries(sellers.map((s, i) => [s, shares[i] / 100]));
}
