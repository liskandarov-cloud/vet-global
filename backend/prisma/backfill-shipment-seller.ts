// Восстановление продавца у отправок, созданных до разделения по поставщикам.
//
// Раньше на заказ приходилась одна отправка без указания продавца. Теперь
// отправка принадлежит продавцу, и у прежних записей это поле пусто. Здесь оно
// заполняется по первой позиции заказа — для заказов с одним поставщиком это
// точное соответствие, а их подавляющее большинство.
//
// Заказы с несколькими поставщиками отмечаются в выводе отдельно: у них одна
// общая отправка разделена быть не может, и закрепить её за первым продавцом —
// единственное, что можно сделать автоматически. Остальные посылки продавцы
// оформят сами, когда понадобится.
//
// Скрипт идемпотентный: записи с заполненным продавцом не трогает.
// Запуск: npm run backfill:shipment-seller

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orphans = await prisma.shipment.findMany({
    where: { sellerId: null },
    select: { id: true, orderId: true },
  });

  if (!orphans.length) {
    console.log('✓ отправок без продавца нет — делать нечего');
    return;
  }

  let filled = 0;
  let skipped = 0;
  const multiSeller: string[] = [];

  for (const sh of orphans) {
    const items = await prisma.orderItem.findMany({
      where: { orderId: sh.orderId },
      select: { sellerId: true },
    });
    const sellers = [...new Set(items.map((i) => i.sellerId))];

    if (!sellers.length) {
      // Заказ без позиций — оставляем как есть, угадывать нечего.
      skipped++;
      continue;
    }
    if (sellers.length > 1) multiSeller.push(sh.orderId);

    await prisma.shipment.update({ where: { id: sh.id }, data: { sellerId: sellers[0] } });
    filled++;
  }

  console.log(`✓ продавец заполнен у ${filled} отправок, пропущено ${skipped}`);
  if (multiSeller.length) {
    console.log(
      `  из них ${multiSeller.length} в заказах с несколькими поставщиками — ` +
        'отправка закреплена за первым, остальные продавцы оформят свои сами',
    );
  }
}

main()
  .catch((e) => {
    console.error('восстановление не выполнено:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
