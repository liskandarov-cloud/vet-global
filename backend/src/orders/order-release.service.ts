import { Injectable, Logger } from '@nestjs/common';
import { VetPointsType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { creditToRelease, pointsToRefund, stockToReturn } from './release';

// Возврат того, что заказ занял при создании.
//
// Отдельный сервис, а не метод в OrdersService: возврат нужен из трёх мест —
// отмена заказа, отклонение согласующим и оплата (лимит резервировался под
// неоплаченный долг). Держать одну реализацию важнее, чем экономить файл:
// каждая копия этой логики — это чужие деньги, возвращённые по-своему.
@Injectable()
export class OrderReleaseService {
  private readonly logger = new Logger(OrderReleaseService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Полный возврат: остаток на склад, лимит и баллы покупателю. Вызывается при
  // отмене заказа — в том числе отклонением согласующего.
  async onCancelled(orderId: string): Promise<void> {
    const order = await this.load(orderId);
    if (!order) return;

    const credit = creditToRelease(order);
    const points = pointsToRefund(order);
    const stock = stockToReturn(order, order.items);
    if (!credit && !points && !stock.length) return;

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      // Отметки ставятся условием на саму отметку: если возврат уже прошёл
      // параллельно, обновление не затронет ни одной строки, и деньги не
      // вернутся дважды.
      if (credit && order.buyerId) {
        const mark = await tx.order.updateMany({
          where: { id: orderId, creditReleasedAt: null },
          data: { creditReleasedAt: now },
        });
        if (mark.count) {
          await tx.user.update({
            where: { id: order.buyerId },
            data: { creditUsed: { decrement: credit } },
          });
        }
      }

      if (points && order.buyerId) {
        const mark = await tx.order.updateMany({
          where: { id: orderId, pointsRefundedAt: null },
          data: { pointsRefundedAt: now },
        });
        if (mark.count) {
          await tx.user.update({
            where: { id: order.buyerId },
            data: { vetPointsBalance: { increment: points } },
          });
          // Возврат записывается отдельной проводкой: история баллов должна
          // объяснять остаток, а молчаливое начисление её ломает.
          await tx.vetPointsTransaction.create({
            data: {
              userId: order.buyerId,
              amount: points,
              type: VetPointsType.ADJUSTMENT,
              description: `Возврат за отменённый заказ #${orderId.slice(0, 8)}`,
              orderId,
            },
          });
        }
      }

      if (stock.length) {
        const mark = await tx.order.updateMany({
          where: { id: orderId, stockReturnedAt: null },
          data: { stockReturnedAt: now },
        });
        if (mark.count) {
          for (const line of stock) {
            await tx.product.update({
              where: { id: line.productId },
              data: { stockQty: { increment: line.quantity }, inStock: true },
            });
          }
        }
      }
    });

    this.logger.log(
      `заказ ${orderId} отменён: лимит ${credit}, баллы ${points}, позиций на склад ${stock.length}`,
    );
  }

  // Оплата закрывает долг, под который резервировался лимит: держать резерв
  // дальше значит занимать лимит покупателя деньгами, которые он уже отдал.
  async onPaid(orderId: string): Promise<void> {
    const order = await this.load(orderId);
    if (!order) return;

    const credit = creditToRelease(order);
    if (!credit || !order.buyerId) return;

    await this.prisma.$transaction(async (tx) => {
      const mark = await tx.order.updateMany({
        where: { id: orderId, creditReleasedAt: null },
        data: { creditReleasedAt: new Date() },
      });
      if (!mark.count) return;
      await tx.user.update({
        where: { id: order.buyerId! },
        data: { creditUsed: { decrement: credit } },
      });
    });

    this.logger.log(`заказ ${orderId} оплачен: освобождён лимит ${credit}`);
  }

  private async load(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        buyerId: true,
        paymentTerm: true,
        total: true,
        vetPointsUsed: true,
        creditReleasedAt: true,
        stockReturnedAt: true,
        pointsRefundedAt: true,
        items: { select: { productId: true, quantity: true, stockTaken: true } },
      },
    });
    if (!order) return null;
    return {
      ...order,
      total: Number(order.total),
      vetPointsUsed: Number(order.vetPointsUsed),
    };
  }
}
