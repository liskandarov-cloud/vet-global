import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { PUBLIC_PRODUCT } from '../common/visibility';

// «Сообщить о поступлении».
//
// Оповещение уходило только тогда, когда продавец возвращал товар в наличие
// правкой карточки в кабинете. Но вернуть товар в продажу можно ещё пятью
// путями: импортом прайса, фидом из 1С, правкой предложения, отменой заказа
// (остаток возвращается на склад) и проверкой продавца (его товары появляются
// на витрине). Ни один из них подписчиков не будил — покупатель ждал
// оповещения, которое не придёт.
//
// Латать каждый путь — значит пропустить следующий. Поэтому, кроме мгновенного
// оповещения при правке карточки, раз в 10 минут идёт обход: подписки на
// товары, которые снова можно купить, каким бы путём они ни вернулись.
@Injectable()
export class StockAlertsService {
  private readonly logger = new Logger(StockAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  // Оповестить подписчиков товара и погасить их подписки (одноразовые).
  async notifyProduct(productId: string, productName: string): Promise<number> {
    const subs = await this.prisma.stockAlert.findMany({ where: { productId } });
    if (!subs.length) return 0;
    await Promise.all(
      subs.map((s) =>
        this.alerts.notify(s.userId, {
          title: 'Товар снова в наличии',
          body: `«${productName}» снова доступен для заказа`,
          url: `/products/${productId}`,
        }),
      ),
    );
    // Гасим ровно тех, кого оповестили: подписка, оформленная за это время,
    // не должна исчезнуть без письма.
    await this.prisma.stockAlert.deleteMany({ where: { id: { in: subs.map((s) => s.id) } } });
    return subs.length;
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'stock-alerts-sweep' })
  async sweepScheduled() {
    const res = await this.sweep();
    if (res.notified) this.logger.log(`оповещено о поступлении: ${res.notified} по ${res.products} товарам`);
    return res;
  }

  // Товары с подписками, которые сейчас можно заказать: в наличии, на витрине,
  // у продавца, которому можно продавать.
  async sweep() {
    const due = await this.prisma.stockAlert.findMany({
      where: { product: { ...PUBLIC_PRODUCT, inStock: true } },
      distinct: ['productId'],
      select: { productId: true, product: { select: { name: true } } },
      take: 200,
    });
    let notified = 0;
    for (const d of due) notified += await this.notifyProduct(d.productId, d.product.name);
    return { products: due.length, notified };
  }
}
