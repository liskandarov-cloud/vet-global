import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApprovalStatus,
  OrderStatus,
  OrgRole,
  PaymentStatus,
  PaymentTerm,
  Prisma,
  UserRole,
  VetPointsType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { syncOwnerOfferStock } from '../offers/product-aggregates';
import { CreateOrderDto } from './dto/order.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PdfService } from '../documents/pdf.service';
import { NotificationsService } from '../mail/notifications.service';
import { AlertsService } from '../alerts/alerts.service';
import {
  orderTotal,
  percentOf,
  round2,
  unitPriceFinal,
  applyPromotion,
  bestPromotionPercent,
  vetPointsSpendable,
} from '../common/pricing';
import { isTransitionAllowed, transitionError } from './status';
import { approvalFor, awaitingApprovalError } from './approval';
import { sellerView } from './seller-view';
import { aggregateStatus, totalsWithoutPart } from './parts';
import { creditOverdrawn, pointsOverdrawn } from './reservation';
import { OrderReleaseService } from './order-release.service';
import { invoiceNumberFor } from '../common/invoice-number';
import { splitInvoices } from './invoice-split';
import { deliveryBySellerForOrder, deliveryTotalForOrder, parseQuote } from '../delivery/order-delivery';
import { TariffsService } from '../delivery/tariffs.service';
import { isExpired, publicOffer, SELLABLE_SELLER } from '../common/visibility';
import { pickBestOffer } from '../offers/best-offer';
import { fmt, orderCancelledAlert, shortId, statusText, tt } from '../alerts/text';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly commissionPct: number;
  private readonly earnPct: number;
  private readonly maxSpendPct: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly pdf: PdfService,
    private readonly notifications: NotificationsService,
    private readonly alerts: AlertsService,
    private readonly tariffs: TariffsService,
    private readonly release: OrderReleaseService,
  ) {
    this.commissionPct = Number(config.get('PLATFORM_COMMISSION_PERCENT') ?? 12);
    this.earnPct = Number(config.get('VETPOINTS_EARN_PERCENT') ?? 1);
    this.maxSpendPct = Number(config.get('VETPOINTS_MAX_SPEND_PERCENT') ?? 10);
  }

  async create(dto: CreateOrderDto, user?: AuthUser) {
    // Юрлицо покупателя уходит в счёт-фактуру (ИНН и название в ЭДО). Ссылка
    // принималась без проверки, и заказ можно было оформить на чужое юрлицо:
    // документ выписывался компании, которая ничего не заказывала, а её
    // реквизиты оказывались в счёте у постороннего.
    if (dto.counterpartyId) {
      const own = user
        ? await this.prisma.counterparty.findFirst({
            where: { id: dto.counterpartyId, userId: user.id },
            select: { id: true },
          })
        : null;
      if (!own) throw new BadRequestException('Юрлицо не найдено среди ваших');
    }

    // Одно «сейчас» на весь заказ: срок годности, акции и договорные цены
    // сверяются с одним и тем же моментом.
    const now = new Date();
    // Resolve products + offers from DB (never trust client-supplied prices).
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('Some products were not found');
    }

    const offerIds = dto.items.map((i) => i.offerId).filter(Boolean) as string[];
    const offers = offerIds.length
      ? await this.prisma.offer.findMany({ where: { id: { in: offerIds } } })
      : [];
    const offerMap = new Map(offers.map((o) => [o.id, o]));

    // Позиции без offerId (карточка каталога): подбираем лучший активный оффер товара,
    // иначе цена заказа разойдётся с витриной — там показывается minPrice с учётом
    // фасовки, а Number(p.price) — сырая цена прайса (за 1000 доз, не за флакон).
    const noOfferPids = dto.items.filter((i) => !i.offerId).map((i) => i.productId);
    const bestOfferByProduct = new Map<string, (typeof offers)[number]>();
    // Товары, у которых в продаже остались только партии с истёкшим сроком.
    // Без этой метки заказ ушёл бы в легаси-ветку и продал бы товар по цене
    // карточки — то есть ту же просрочку, только в обход предложения.
    const expiredOnly = new Set<string>();
    if (noOfferPids.length) {
      // Подбираем только из того, что можно заказать: иначе самое дешёвое
      // предложение непроверенного продавца отклонило бы весь заказ, хотя
      // у проверенного товар есть. Правило выбора — то же, что у карточки
      // (best-offer.ts): «под заказ» участвует, если в наличии нет ни у кого.
      const candidates = await this.prisma.offer.findMany({
        where: { productId: { in: noOfferPids }, ...publicOffer(now) },
      });
      for (const pid of noOfferPids) {
        const best = pickBestOffer(candidates.filter((o) => o.productId === pid));
        if (best) bestOfferByProduct.set(pid, best);
      }
      const unmatched = noOfferPids.filter((pid) => !bestOfferByProduct.has(pid));
      if (unmatched.length) {
        const expired = await this.prisma.offer.findMany({
          where: {
            productId: { in: unmatched },
            isActive: true,
            seller: SELLABLE_SELLER,
            expiryDate: { lte: now },
          },
          distinct: ['productId'],
          select: { productId: true },
        });
        for (const e of expired) expiredOnly.add(e.productId);
      }
    }

    // Контрактные (персональные) цены покупателя — для явных и подобранных офферов.
    const contractMap = new Map<string, number>();
    const allOfferIds = [
      ...offerIds,
      ...[...bestOfferByProduct.values()].map((o) => o.id),
    ];
    if (user && allOfferIds.length) {
      const contracts = await this.prisma.contractPrice.findMany({
        where: {
          buyerId: user.id,
          offerId: { in: allOfferIds },
          OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        },
      });
      for (const c of contracts) contractMap.set(c.offerId, Number(c.price));
    }

    // Акции продавцов, участвующих в заказе.
    //
    // Цена с акцией считается здесь, а не берётся от клиента: заказ — это
    // источник истины о сумме, и витрина обязана показывать то же самое.
    // Одним запросом на всех продавцов: акция бывает на весь ассортимент
    // (productId пуст) или на конкретный товар.
    const sellerIdsInCart = [
      ...new Set([
        ...products.map((p) => p.sellerId),
        ...offers.map((o) => o.sellerId),
        ...[...bestOfferByProduct.values()].map((o) => o.sellerId),
      ]),
    ];
    const promotions = sellerIdsInCart.length
      ? await this.prisma.promotion.findMany({
          where: {
            isActive: true,
            sellerId: { in: sellerIdsInCart },
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
          select: {
            sellerId: true,
            productId: true,
            discountPercent: true,
            startsAt: true,
            endsAt: true,
            isActive: true,
          },
        })
      : [];

    // Есть ли в заказе позиция «под заказ» (нет в наличии). Такой заказ можно
    // оформить как предзаказ, но оплата блокируется до подтверждения продавцом.
    let requiresConfirmation = false;

    // Заказать можно только у тех, кому можно продавать (common/visibility):
    // и владелец карточки, и продавец предложения. Проверка здесь, а не только
    // на витрине: корзина хранится у покупателя и переживает и снятие товара,
    // и блокировку продавца, а запрос можно отправить и в обход витрины.
    const sellable = new Set(
      (
        await this.prisma.user.findMany({
          where: { id: { in: sellerIdsInCart }, ...SELLABLE_SELLER },
          select: { id: true },
        })
      ).map((u) => u.id),
    );

    const items = dto.items.map((i) => {
      const p = products.find((x) => x.id === i.productId)!;

      // Снятый с продажи товар заказать нельзя. Раньше без предложения (легаси-
      // ветка) он оформлялся как обычно — по ссылке из старой корзины.
      if (!p.isActive || !sellable.has(p.sellerId)) {
        throw new BadRequestException(`«${p.name}» сейчас недоступен для заказа`);
      }

      // По умолчанию — базовый товар (легаси, когда офферов нет вовсе).
      let sellerId = p.sellerId;
      let minOrder = p.minOrder;
      // Акция владельца товара применяется и к этой, легаси-ветке: иначе
      // скидка зависела бы от того, завёл ли продавец оффер.
      let unitPrice = applyPromotion(
        Number(p.price),
        bestPromotionPercent(promotions, { sellerId: p.sellerId, productId: p.id }, now),
      );
      let offerId: string | null = null;

      if (i.offerId && !offerMap.get(i.offerId)) {
        throw new BadRequestException(`Предложение для «${p.name}» не найдено`);
      }
      const o = i.offerId ? offerMap.get(i.offerId) : bestOfferByProduct.get(i.productId);
      if (!o && expiredOnly.has(p.id)) {
        throw new BadRequestException(`Срок годности партии «${p.name}» истёк`);
      }

      if (o) {
        if (o.productId !== p.id) {
          throw new BadRequestException(`Предложение для «${p.name}» не найдено`);
        }
        // Снятый с продажи оффер заказать нельзя; «нет в наличии» — можно, но
        // это предзаказ (оплата после подтверждения), а не отказ.
        if (!o.isActive || !sellable.has(o.sellerId)) {
          throw new BadRequestException(`Предложение для «${p.name}» недоступно`);
        }
        // Просрочку не продаём (common/visibility): корзина хранит offerId
        // и переживает истечение срока, витрина тут не защита.
        if (isExpired(o.expiryDate, now)) {
          throw new BadRequestException(`Срок годности партии «${p.name}» истёк`);
        }
        sellerId = o.sellerId;
        minOrder = o.minOrder;
        unitPrice = unitPriceFinal(
          o,
          i.quantity,
          contractMap.get(o.id),
          bestPromotionPercent(promotions, { sellerId: o.sellerId, productId: p.id }, now),
        );
        offerId = o.id;
      }

      // «Под заказ»: товар помечен продавцом как не в наличии (или выбранный оффер).
      if (!p.inStock || (o && !o.inStock)) requiresConfirmation = true;

      // Числовой учёт остатка: нельзя купить больше, чем есть в наличии.
      if (p.stockQty != null && p.inStock && p.stockQty > 0 && i.quantity > p.stockQty) {
        throw new BadRequestException(`В наличии только ${p.stockQty} шт. — «${p.name}»`);
      }

      if (i.quantity < minOrder) {
        throw new BadRequestException(`Минимальный заказ для «${p.name}» — ${minOrder} шт.`);
      }

      return {
        productId: p.id,
        offerId,
        productName: p.name,
        mxikCode: p.mxikCode,
        packageCode: p.packageCode,
        sellerId,
        quantity: i.quantity,
        price: unitPrice,
      };
    });

    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);

    // VetPoints spend — only for authenticated buyers, capped at maxSpendPct of subtotal & balance.
    let vetPointsUsed = 0;
    if (user && dto.vetPointsUsed && dto.vetPointsUsed > 0) {
      const balance = Number(
        (await this.prisma.user.findUnique({ where: { id: user.id } }))?.vetPointsBalance ?? 0,
      );
      vetPointsUsed = vetPointsSpendable(subtotal, dto.vetPointsUsed, balance, this.maxSpendPct);
    }

    // Доставка считается здесь же, по тарифам продавцов.
    //
    // Раньше она была нулевой, а стоимость назначал продавец позже, оформляя
    // отправку. При предоплате это не работало вовсе: пересчитать сумму после
    // оплаты нельзя (иначе документы разойдутся с платежом), поэтому доставка
    // не попадала в заказ никогда. Теперь покупатель видит её в корзине и платит
    // ровно то, что увидел.
    //
    // Продавцы без подходящего тарифа остаются как было: посчитать их доставку
    // нечем, они назначат стоимость при отправке. В расчёт они не попадают, и
    // потому их отправка сумму прибавит — см. deliveryTotalForOrder.
    const deliveryMethod = dto.deliveryMethod ?? null;
    const deliveryCity = dto.deliveryCity?.trim() || null;
    const sellerIdsForDelivery = [...new Set(items.map((it) => it.sellerId).filter(Boolean))] as string[];
    const deliveryQuote =
      deliveryMethod == null
        ? { total: 0, bySeller: [] as { sellerId: string; cost: number }[], unknown: [] as string[] }
        : await this.tariffs.quoteForSellers(sellerIdsForDelivery, {
            method: deliveryMethod,
            city: deliveryCity,
            subtotal,
          });
    const deliveryCost = deliveryQuote.total;
    const quoteBySeller = Object.fromEntries(deliveryQuote.bySeller.map((q) => [q.sellerId, q.cost]));

    const total = orderTotal(subtotal, vetPointsUsed, deliveryCost);
    // Комиссия считается от subtotal, то есть до списания баллов: лояльность
    // платформы не должна уменьшать её собственный доход.
    const commission = percentOf(subtotal, this.commissionPct);
    const vetPointsEarned = percentOf(subtotal, this.earnPct);

    const buyerName = dto.buyerName ?? user?.fullName ?? 'Гость';
    const buyerPhone = dto.buyerPhone ?? user?.phone ?? '';
    const buyerCompany = dto.buyerCompany ?? user?.company ?? null;
    if (!buyerName || !buyerPhone) {
      throw new BadRequestException('Укажите имя и телефон для оформления заказа');
    }

    // ── Условия оплаты / финансирование (блок 2) ──
    const paymentTerm = dto.paymentTerm ?? PaymentTerm.PREPAY;
    let netTermDays: number | null = null;
    let dueDate: Date | null = null;
    let installments: number | null = null;
    let paymentSchedule: { n: number; dueDate: string; amount: number }[] | null = null;
    let creditToReserve = 0;

    if (paymentTerm !== PaymentTerm.PREPAY) {
      if (!user) throw new BadRequestException('Отсрочка и рассрочка доступны только авторизованным покупателям');
      const buyer = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { creditLimit: true, creditUsed: true },
      });
      const available = Number(buyer?.creditLimit ?? 0) - Number(buyer?.creditUsed ?? 0);
      if (total > available) {
        throw new BadRequestException(
          `Недостаточно кредитного лимита: доступно ${Math.floor(available)}. Подайте заявку на финансирование.`,
        );
      }
      creditToReserve = total;
      const base = new Date();

      if (paymentTerm === PaymentTerm.NET_TERMS) {
        netTermDays = dto.netTermDays ?? 30;
        dueDate = new Date(base.getTime() + netTermDays * 86400000);
      } else {
        const n = dto.installments ?? 3;
        installments = n;
        const per = Math.round((total / n) * 100) / 100;
        paymentSchedule = Array.from({ length: n }, (_, i) => ({
          n: i + 1,
          dueDate: new Date(base.getFullYear(), base.getMonth() + i + 1, base.getDate()).toISOString(),
          // последний платёж добирает остаток от округлений
          amount: i === n - 1 ? Math.round((total - per * (n - 1)) * 100) / 100 : per,
        }));
        dueDate = new Date(paymentSchedule[paymentSchedule.length - 1].dueDate);
      }
    }

    // ── Организация: согласование заказа сверх лимита закупщика ──
    // Правило общее с тендером и подпиской (см. approvalFor): иначе какой-то из
    // путей заключения сделки обходил бы лимит закупщика.
    const membership = user
      ? await this.prisma.orgMembership.findFirst({ where: { userId: user.id, acceptedAt: { not: null } } })
      : null;
    const { orgId, approvalStatus } = approvalFor(
      membership ? { orgId: membership.orgId, role: membership.role, spendLimit: Number(membership.spendLimit) } : null,
      total,
    );

    // Create order + deduct spent points atomically.
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          buyerId: user?.id ?? null,
          counterpartyId: dto.counterpartyId ?? null,
          buyerName,
          buyerPhone,
          buyerCompany,
          requiresConfirmation,
          subtotal,
          vetPointsUsed,
          total,
          deliveryMethod,
          deliveryCity,
          deliveryAddress: dto.deliveryAddress?.trim() || null,
          deliveryCost,
          // Пустой расчёт — это «доставку не считали»: такой заказ ведёт себя
          // как прежние, где стоимость целиком приходит из отправок.
          deliveryQuote: deliveryMethod == null ? undefined : quoteBySeller,
          vetPointsEarned,
          commission,
          paymentTerm,
          netTermDays,
          dueDate,
          installments,
          paymentSchedule: paymentSchedule ?? undefined,
          orgId,
          approvalStatus,
          items: { create: items },
        },
        include: { items: true },
      });

      // Списываем числовой остаток атомарно (без ухода в минус даже при гонке).
      // Когда остаток исчерпан — товар автоматически становится «под заказ».
      for (const it of items) {
        const p = products.find((x) => x.id === it.productId)!;
        if (p.stockQty != null && p.inStock && p.stockQty > 0) {
          const dec = await tx.product.updateMany({
            where: { id: it.productId, stockQty: { gte: it.quantity } },
            data: { stockQty: { decrement: it.quantity } },
          });
          if (dec.count === 0) throw new BadRequestException(`Недостаточно на складе: «${p.name}»`);
          await tx.product.updateMany({ where: { id: it.productId, stockQty: 0 }, data: { inStock: false } });
          await syncOwnerOfferStock(tx, it.productId);
          // Отмечаем, что остаток действительно списан: только такие позиции
          // возвращаются на склад при отмене. Без отметки отмена завышала бы
          // склад позициями «под заказ», которые его не трогали.
          await tx.orderItem.updateMany({
            where: { orderId: created.id, productId: it.productId },
            data: { stockTaken: true },
          });
        }
      }

      // Резервируем кредитный лимит под отсрочку/рассрочку. Проверка — по
      // значению после резерва (см. reservation.ts): проверка до транзакции
      // пропускала все одновременные заказы по одному «свободному» остатку.
      if (user && creditToReserve > 0) {
        const after = await tx.user.update({
          where: { id: user.id },
          data: { creditUsed: { increment: creditToReserve } },
          select: { creditUsed: true, creditLimit: true },
        });
        if (creditOverdrawn(after)) {
          throw new BadRequestException(
            'Недостаточно кредитного лимита: его уже занял другой заказ. Обновите страницу.',
          );
        }
      }

      if (user && vetPointsUsed > 0) {
        const after = await tx.user.update({
          where: { id: user.id },
          data: { vetPointsBalance: { decrement: vetPointsUsed } },
          select: { vetPointsBalance: true },
        });
        if (pointsOverdrawn(after)) {
          throw new BadRequestException('Баллов уже недостаточно: их списал другой заказ. Обновите страницу.');
        }
        await tx.vetPointsTransaction.create({
          data: {
            userId: user.id,
            amount: -vetPointsUsed,
            type: VetPointsType.SPENT,
            description: `Оплата заказа #${created.id.slice(0, 8)}`,
            orderId: created.id,
          },
        });
      }
      return created;
    });

    // Notify buyer + sellers + admin (fire-and-forget; email failures must not break checkout).
    void this.notifications.onOrderCreated(order.id).catch(() => undefined);

    // Каждому продавцу из состава заказа — сигнал в кабинет и на телефон.
    // Раньше его получал только продавец предзаказа, а о простом заказе
    // продавец узнавал из письма — без почтового провайдера не узнавал вовсе.
    // Предзаказу нужен свой текст: пока наличие не подтверждено, оплата у
    // покупателя заблокирована.
    const sellerIds = [...new Set(items.map((it) => it.sellerId).filter(Boolean))] as string[];
    void this.alerts.notifyMany(
      sellerIds,
      requiresConfirmation
        ? {
            title: tt('Новый предзаказ — подтвердите наличие', 'Yangi oldindan buyurtma — mavjudligini tasdiqlang'),
            body: tt(
              `${buyerName}: заказ содержит позицию «под заказ». Подтвердите наличие, чтобы открылась оплата.`,
              `${buyerName}: buyurtmada «buyurtma asosida» pozitsiyasi bor. Toʻlov ochilishi uchun mavjudligini tasdiqlang.`,
            ),
            url: '/seller',
          }
        : {
            title: tt(`Новый заказ #${shortId(order.id)}`, `Yangi buyurtma #${shortId(order.id)}`),
            body: tt(`Покупатель: ${buyerName}. Подтвердите заказ в кабинете продавца.`, `Xaridor: ${buyerName}. Buyurtmani sotuvchi kabinetida tasdiqlang.`),
            url: '/seller',
          },
    );

    // Push согласующим, если заказ ушёл на согласование.
    if (orgId && approvalStatus === ApprovalStatus.PENDING) {
      void this.prisma.orgMembership
        .findMany({ where: { orgId, role: { in: [OrgRole.OWNER, OrgRole.MANAGER] }, acceptedAt: { not: null } } })
        .then((approvers) =>
          Promise.all(
            approvers.map((a) =>
              this.alerts.notify(a.userId, {
                title: tt('Заказ на согласование', 'Buyurtma tasdiqlashni kutmoqda'),
                body: tt(`${buyerName}: заказ на ${fmt(total)} сум ждёт одобрения`, `${buyerName}: ${fmt(total)} soʻmlik buyurtma tasdiqlashni kutmoqda`),
                url: '/org',
              }),
            ),
          ),
        )
        .catch(() => undefined);
    }
    return this.serialize(order);
  }

  async list(user: AuthUser, status?: OrderStatus) {
    const where: Prisma.OrderWhereInput = {};
    if (user.role === UserRole.BUYER) {
      where.buyerId = user.id;
    } else if (user.role === UserRole.SELLER) {
      // Свои позиции — или своя (в том числе отменённая) часть заказа.
      where.OR = [{ items: { some: { sellerId: user.id } } }, { parts: { some: { sellerId: user.id } } }];
    }
    if (status) where.status = status;

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true, invoices: true, shipments: true, payments: true, parts: true, transferPayments: true },
      take: 200,
    });
    return orders.map((o) => this.forViewer(o, user));
  }

  async getOne(id: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, invoices: true, shipments: true, payments: true, parts: true, transferPayments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    // Владелец и управляющий организации открывают её заказы: согласовывать
    // заказ, не видя его позиций, — согласовывать вслепую.
    if (user.role === UserRole.BUYER && order.buyerId !== user.id && order.orgId && (await this.isOrgManager(user.id, order.orgId))) {
      return this.forViewer(order, user);
    }
    this.assertAccess(order, user);
    return this.forViewer(order, user);
  }

  private async isOrgManager(userId: string, orgId: string): Promise<boolean> {
    const m = await this.prisma.orgMembership.findFirst({
      where: { userId, orgId, acceptedAt: { not: null }, role: { in: [OrgRole.OWNER, OrgRole.MANAGER] } },
      select: { id: true },
    });
    return !!m;
  }

  // Продавцу — только его часть заказа (см. seller-view.ts).
  private forViewer<T extends SerializableOrder>(order: T, user: AuthUser) {
    const o = this.serialize(order);
    return user.role === UserRole.SELLER ? sellerView(o, user.id) : o;
  }

  // Удаление заказа (админ): позиции/платежи/накладные каскадом (onDelete: Cascade).
  // Начисленные VetPoints не откатываем — для тестовых заказов несущественно.
  async remove(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Заказ не найден');
    await this.prisma.order.delete({ where: { id } });
    return { ok: true };
  }

  async updateStatus(id: string, status: OrderStatus, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true, parts: true } });
    if (!order) throw new NotFoundException('Order not found');

    // Seller may only touch orders containing their items (or their part).
    const sellers = [...new Set(order.items.map((it) => it.sellerId))];
    const hasPart = order.parts.some((p) => p.sellerId === user.id);
    if (user.role === UserRole.SELLER && !sellers.includes(user.id) && !hasPart) {
      throw new ForbiddenException('Not authorized for this order');
    }

    const approvalError = awaitingApprovalError(order.approvalStatus, status);
    if (approvalError && user.role !== UserRole.ADMIN) throw new BadRequestException(approvalError);

    // В заказе нескольких поставщиков продавец ведёт только свою часть.
    if (user.role === UserRole.SELLER && (sellers.length > 1 || order.parts.length > 0)) {
      return this.updateSellerPart(order, sellers, status, user);
    }

    // Проверка перехода. Администратору она не мешает: исправлять ошибочно
    // выставленный статус задним числом — его работа, и запрещать это значит
    // оставить заказ навсегда в неверном состоянии. Такие случаи логируем,
    // чтобы обход правил был видим.
    if (!isTransitionAllowed(order.status, status)) {
      if (user.role !== UserRole.ADMIN) {
        throw new BadRequestException(transitionError(order.status, status));
      }
      this.logger.warn(
        `админ ${user.id} переводит заказ ${id} из ${order.status} в ${status} в обход обычного потока`,
      );
    }

    // Повтор того же статуса ничего не меняет: возврат склада, баллы и
    // уведомления — только при настоящем переходе.
    if (order.status === status) return this.getOne(id, user);

    // Переход — условным обновлением от прочитанного статуса. Из двух
    // одновременных запросов проходит один; раньше оба проходили, и баллы за
    // доставку начислялись дважды.
    const moved = await this.prisma.order.updateMany({ where: { id, status: order.status }, data: { status } });
    if (moved.count === 0) throw new ConflictException('Статус заказа уже изменён — обновите страницу');
    // Администратор ведёт заказ целиком — части следуют за ним.
    if (order.parts.length) {
      await this.prisma.orderPart.updateMany({
        where: { orderId: id, status: { not: OrderStatus.CANCELLED } },
        data: { status },
      });
    }

    await this.afterStatusChange(id, status, user.id);
    return this.getOne(id, user);
  }

  // Часть продавца в заказе нескольких поставщиков. Записи частей заводятся
  // при первом изменении — статусом заказа на этот момент.
  private async updateSellerPart(
    order: { id: string; status: OrderStatus },
    sellers: string[],
    status: OrderStatus,
    user: AuthUser,
  ) {
    await this.prisma.orderPart.createMany({
      data: sellers.map((sellerId) => ({ orderId: order.id, sellerId, status: order.status })),
      skipDuplicates: true,
    });
    const mine = await this.prisma.orderPart.findUnique({
      where: { orderId_sellerId: { orderId: order.id, sellerId: user.id } },
    });
    if (!mine) throw new ForbiddenException('Not authorized for this order');
    if (mine.status === status) return this.getOne(order.id, user);
    if (!isTransitionAllowed(mine.status, status)) {
      throw new BadRequestException(transitionError(mine.status, status));
    }

    const others = await this.prisma.orderPart.findMany({
      where: { orderId: order.id, sellerId: { not: user.id } },
    });
    const othersLive = others.some((p) => p.status !== OrderStatus.CANCELLED);

    if (status === OrderStatus.CANCELLED && othersLive) {
      // Отмена своей части: позиции продавца уходят из заказа, сумма уменьшается.
      await this.cancelPart(order.id, user.id, mine.status);
    } else {
      const moved = await this.prisma.orderPart.updateMany({
        where: { orderId: order.id, sellerId: user.id, status: mine.status },
        data: { status },
      });
      if (!moved.count) throw new ConflictException('Статус уже изменён — обновите страницу');
    }

    // Общий статус — заново по свежим частям: параллельный продавец мог
    // изменить свою, и позднее чтение увидит обе.
    const parts = await this.prisma.orderPart.findMany({ where: { orderId: order.id } });
    const next = aggregateStatus(parts.map((p) => p.status));
    if (next !== order.status) {
      const moved = await this.prisma.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: next } });
      if (moved.count) await this.afterStatusChange(order.id, next, user.id);
    }
    return this.getOne(order.id, user);
  }

  // Продавец отменяет свою часть заказа нескольких поставщиков.
  //
  // Позиции продавца, его отправки и доставка убираются из заказа (снимок —
  // в записи части): чек Payme, счета и ЭДО строятся из позиций заказа и
  // должны сходиться с суммой к оплате. Остаток возвращается на склад, разница
  // освобождает резерв лимита по отсрочке, лишние баллы возвращаются.
  private async cancelPart(orderId: string, sellerId: string, fromStatus: OrderStatus) {
    const result = await this.prisma.$transaction(async (tx) => {
      const part = await tx.orderPart.updateMany({
        where: { orderId, sellerId, status: fromStatus },
        data: { status: OrderStatus.CANCELLED },
      });
      if (!part.count) throw new ConflictException('Статус уже изменён — обновите страницу');

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, shipments: true, invoices: true, payments: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.invoices.some((inv) => inv.sellerId === sellerId && inv.didoxStatus)) {
        throw new BadRequestException('Счёт-фактура по вашей части уже отправлена в ЭДО — сначала отзовите её');
      }

      const items = order.items.filter((it) => it.sellerId === sellerId);
      const goods = items.reduce((sum, it) => sum + Number(it.price) * it.quantity, 0);
      const quote = parseQuote(order.deliveryQuote) ?? {};
      const delivery = deliveryBySellerForOrder(order.deliveryQuote, order.shipments.map((sh) => ({ sellerId: sh.sellerId, cost: Number(sh.cost) })))[sellerId] ?? 0;
      const restQuote = Object.fromEntries(Object.entries(quote).filter(([k]) => k !== sellerId));
      const restShipments = order.shipments.filter((sh) => sh.sellerId !== sellerId);
      const deliveryCost = deliveryTotalForOrder(restQuote, restShipments.map((sh) => ({ sellerId: sh.sellerId, cost: Number(sh.cost) })));
      const t = totalsWithoutPart(
        { subtotal: Number(order.subtotal), vetPointsUsed: Number(order.vetPointsUsed), total: Number(order.total) },
        goods,
        deliveryCost,
        { commission: this.commissionPct, earn: this.earnPct },
      );

      await tx.orderPart.update({
        where: { orderId_sellerId: { orderId, sellerId } },
        data: {
          cancelled: {
            items: items.map((it) => ({ productName: it.productName, quantity: it.quantity, price: Number(it.price) })),
            goods: round2(goods),
            delivery: round2(delivery),
            reduction: t.reduction,
          },
        },
      });

      // Склад — только то, что с него действительно ушло.
      for (const it of items) {
        if (!it.stockTaken || !it.productId) continue;
        await tx.product.update({ where: { id: it.productId }, data: { stockQty: { increment: it.quantity }, inStock: true } });
        await syncOwnerOfferStock(tx, it.productId);
      }
      await tx.invoice.deleteMany({ where: { orderId, sellerId } });
      await tx.shipment.deleteMany({ where: { orderId, sellerId } });
      await tx.orderItem.deleteMany({ where: { orderId, sellerId } });

      await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: t.subtotal,
          deliveryCost: t.deliveryCost,
          vetPointsUsed: t.vetPointsUsed,
          total: t.total,
          commission: t.commission,
          vetPointsEarned: t.vetPointsEarned,
          deliveryQuote: restQuote as Prisma.InputJsonValue,
        },
      });

      // Резерв лимита держался под всю сумму отсрочки — разница освобождается.
      if (order.buyerId && order.paymentTerm !== PaymentTerm.PREPAY && !order.creditReleasedAt && t.reduction > 0) {
        await tx.user.update({ where: { id: order.buyerId }, data: { creditUsed: { decrement: t.reduction } } });
      }
      if (order.buyerId && t.pointsBack > 0) {
        await tx.user.update({ where: { id: order.buyerId }, data: { vetPointsBalance: { increment: t.pointsBack } } });
        await tx.vetPointsTransaction.create({
          data: {
            userId: order.buyerId,
            amount: t.pointsBack,
            type: VetPointsType.ADJUSTMENT,
            description: `Возврат баллов: продавец отменил часть заказа #${orderId.slice(0, 8)}`,
            orderId,
          },
        });
      }
      return { buyerId: order.buyerId, reduction: t.reduction, paid: order.payments.some((p) => p.status === PaymentStatus.PAID) };
    });

    if (result.buyerId) {
      const cut = fmt(result.reduction);
      void this.alerts.notify(result.buyerId, {
        title: tt(`Заказ #${shortId(orderId)}`, `Buyurtma #${shortId(orderId)}`),
        body: result.paid
          ? tt(
              `Один из поставщиков отменил свою часть заказа. Сумма уменьшена на ${cut} сум — эти деньги вам вернут.`,
              `Yetkazib beruvchilardan biri buyurtmadagi oʻz qismini bekor qildi. Summa ${cut} soʻmga kamaydi — bu pul sizga qaytariladi.`,
            )
          : tt(
              `Один из поставщиков отменил свою часть заказа. Сумма к оплате уменьшена на ${cut} сум.`,
              `Yetkazib beruvchilardan biri buyurtmadagi oʻz qismini bekor qildi. Toʻlov summasi ${cut} soʻmga kamaydi.`,
            ),
        url: `/orders/${orderId}`,
      });
    }
  }

  // Последствия смены статуса заказа: возврат занятого при отмене, баллы за
  // доставку, уведомления.
  private async afterStatusChange(id: string, status: OrderStatus, actorId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) return;

    // Отмена возвращает то, что заказ занял: остаток на склад, кредитный лимит
    // и списанные баллы. Без этого лимит и баллы покупателя сгорали, а склад
    // оставался уменьшенным на товар, который никто не забрал.
    if (status === OrderStatus.CANCELLED) {
      await this.release.onCancelled(id);
    }

    // Credit earned VetPoints once, on delivery.
    if (status === OrderStatus.DELIVERED && order.buyerId) {
      const already = await this.prisma.vetPointsTransaction.findFirst({
        where: { orderId: id, type: VetPointsType.EARNED },
      });
      const earned = Number(order.vetPointsEarned);
      if (!already && earned > 0) {
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: order.buyerId },
            data: { vetPointsBalance: { increment: earned } },
          }),
          this.prisma.vetPointsTransaction.create({
            data: {
              userId: order.buyerId,
              amount: earned,
              type: VetPointsType.EARNED,
              description: `Начислено за заказ #${id.slice(0, 8)}`,
              orderId: id,
            },
          }),
        ]);
      }
    }

    void this.notifications.onOrderStatusChanged(id, status).catch(() => undefined);
    if (order.buyerId) {
      const st = statusText(status);
      void this.alerts.notify(order.buyerId, {
        title: tt(`Заказ #${shortId(id)}`, `Buyurtma #${shortId(id)}`),
        body: tt(`Статус изменён: ${st.ru}`, `Holat oʻzgardi: ${st.uz}`),
        url: `/orders/${id}`,
      });
    }
    // Отмену администратором продавец иначе увидел бы, только открыв заказ.
    if (status === OrderStatus.CANCELLED) {
      void this.alerts.notifyOrderSellers(id, orderCancelledAlert(id), actorId).catch(() => undefined);
    }
  }

  // Продавец подтверждает наличие по заказу «под заказ» (предзаказу): снимаем
  // флаг requiresConfirmation, СТАТУС ОСТАЁТСЯ «Новый» (PENDING) — иначе на витрине
  // покупателя пропала бы кнопка оплаты (она показывается только для PENDING).
  // После этого оплата открывается и покупателю уходит уведомление.
  async confirmAvailability(id: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (user.role === UserRole.SELLER && !order.items.some((it) => it.sellerId === user.id)) {
      throw new ForbiddenException('Not authorized for this order');
    }
    if (!order.requiresConfirmation || order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Заказ не требует подтверждения наличия');
    }

    await this.prisma.order.update({ where: { id }, data: { requiresConfirmation: false } });

    if (order.buyerId) {
      void this.alerts.notify(order.buyerId, {
        title: tt(`Заказ #${shortId(id)}`, `Buyurtma #${shortId(id)}`),
        body: tt('Продавец подтвердил наличие — заказ можно оплатить', 'Sotuvchi mavjudligini tasdiqladi — buyurtmani toʻlash mumkin'),
        url: `/orders/${id}`,
      });
    }
    return this.getOne(id, user);
  }

  // Счёт на оплату для одного продавца заказа.
  //
  // Документ выпускается от имени конкретного продавца: в заказе от нескольких
  // поставщиков счёт один на всех был бы выставлен от чужого имени и на чужие
  // позиции. Продавец получает свой счёт без параметров, покупателю и
  // администратору нужно указать, чей именно, — кроме случая единственного
  // продавца, где выбора нет.
  // Счета заказа по продавцам: сумма каждого — то, что покупатель переводит.
  private invoiceSplit(order: {
    items: { sellerId: string; productName: string; quantity: number; price: unknown }[];
    shipments: { sellerId: string | null; cost: unknown }[];
    deliveryQuote: Prisma.JsonValue;
    vetPointsUsed: unknown;
  }) {
    return splitInvoices(
      order.items.map((it) => ({ sellerId: it.sellerId, productName: it.productName, quantity: it.quantity, price: Number(it.price) })),
      deliveryBySellerForOrder(
        order.deliveryQuote,
        order.shipments.map((sh) => ({ sellerId: sh.sellerId, cost: Number(sh.cost) })),
      ),
      Number(order.vetPointsUsed),
    );
  }

  // Продавец отмечает, что оплата по его части пришла перечислением на его
  // счёт. В B2B так платят чаще, чем картой, а платформа этого не знала: заказ
  // выглядел неоплаченным, лимит отсрочки покупателя не освобождался.
  // Сумма — по его счёту. Когда отмечены все части, лимит освобождается.
  async markTransferPaid(id: string, user: AuthUser, paidAt?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, shipments: true, payments: true, transferPayments: true },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    const sellers = [...new Set(order.items.map((it) => it.sellerId))];
    if (!sellers.includes(user.id)) throw new ForbiddenException('Not authorized for this order');
    if (order.status === OrderStatus.CANCELLED) throw new BadRequestException('Заказ отменён — оплата невозможна');
    if (order.payments.some((p) => p.status === PaymentStatus.PAID)) throw new BadRequestException('Заказ уже оплачен');
    const amount = this.invoiceSplit(order).find((inv) => inv.sellerId === user.id)?.total ?? 0;
    const date = paidAt ? new Date(paidAt) : new Date();
    if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 86_400_000) throw new BadRequestException('Неверная дата оплаты');

    const created = await this.prisma.transferPayment.createMany({
      data: [{ orderId: id, sellerId: user.id, amount, paidAt: date }],
      skipDuplicates: true,
    });
    if (!created.count) throw new BadRequestException('Оплата уже отмечена');

    const paidSellers = new Set([...order.transferPayments.map((t) => t.sellerId), user.id]);
    if (sellers.every((s) => paidSellers.has(s))) await this.release.onPaid(id);

    if (order.buyerId) {
      const seller = await this.prisma.user.findUnique({ where: { id: user.id }, select: { company: true, fullName: true } });
      const who = seller?.company || seller?.fullName || '';
      void this.alerts.notify(order.buyerId, {
        title: tt(`Заказ #${shortId(id)}: оплата получена`, `#${shortId(id)} buyurtma: toʻlov qabul qilindi`),
        body: tt(`${who} подтвердил поступление ${fmt(amount)} сум перечислением.`, `${who} oʻtkazma orqali ${fmt(amount)} soʻm kelib tushganini tasdiqladi.`),
        url: `/orders/${id}`,
      });
    }
    return this.getOne(id, user);
  }

  async invoicePdf(
    id: string,
    user: AuthUser,
    sellerId?: string,
  ): Promise<{ buffer: Buffer; number: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, invoices: true, shipments: true, payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertAccess(order, user);

    const split = this.invoiceSplit(order);
    if (!split.length) throw new BadRequestException('В заказе нет позиций');

    // Продавец всегда получает свой счёт: чужой ему не выдаётся даже по прямому
    // запросу — документ содержит реквизиты и суммы другого юрлица.
    const wanted = user.role === UserRole.SELLER ? user.id : sellerId;
    const part = wanted
      ? split.find((p) => p.sellerId === wanted)
      : split.length === 1
        ? split[0]
        : null;

    if (!part) {
      if (wanted) throw new NotFoundException('В заказе нет позиций этого продавца');
      throw new BadRequestException(
        `В заказе несколько поставщиков — укажите продавца: ${split.map((p) => p.sellerId).join(', ')}`,
      );
    }

    const existing = order.invoices.find(
      (inv) => inv.sellerId === part.sellerId || (inv.sellerId === '' && split.length === 1),
    );
    const number = existing?.number ?? invoiceNumberFor(order, split.length === 1 ? null : part.sellerId);
    if (!existing) {
      await this.prisma.invoice.create({
        data: {
          orderId: order.id,
          sellerId: split.length === 1 ? '' : part.sellerId,
          number,
          amount: part.total,
        },
      });
    }

    const seller = await this.prisma.user.findFirst({
      where: { id: part.sellerId },
      select: {
        company: true, inn: true,
        bankName: true, bankAccount: true, bankMfo: true, vatPayer: true,
      },
    });

    const buffer = await this.pdf.invoice({
      number,
      date: order.createdAt,
      seller: {
        company: seller?.company,
        inn: seller?.inn,
        bankName: seller?.bankName,
        bankAccount: seller?.bankAccount,
        bankMfo: seller?.bankMfo,
        vatPayer: seller?.vatPayer,
      },
      buyer: {
        name: order.buyerName,
        company: order.buyerCompany,
        phone: order.buyerPhone,
      },
      items: part.items.map((it) => ({
        name: it.productName,
        quantity: it.quantity,
        price: it.price,
      })),
      subtotal: part.goods,
      // Доля баллов этого продавца: покупатель списывал их с заказа целиком, и
      // без распределения счета не сложились бы в сумму, которую он платит.
      vetPointsUsed: part.vetPointsUsed,
      deliveryCost: part.delivery,
      total: part.total,
    });

    return { buffer, number };
  }

  private assertAccess(
    order: { buyerId?: string | null; items?: { sellerId: string }[]; parts?: { sellerId: string }[] },
    user: AuthUser,
  ) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.BUYER && order.buyerId !== user.id) {
      throw new ForbiddenException('Not authorized');
    }
    if (
      user.role === UserRole.SELLER &&
      !order.items?.some((it) => it.sellerId === user.id) &&
      !order.parts?.some((p) => p.sellerId === user.id)
    ) {
      throw new ForbiddenException('Not authorized');
    }
  }

  private serialize<T extends SerializableOrder>(o: T) {
    return {
      ...o,
      subtotal: Number(o.subtotal),
      total: Number(o.total),
      deliveryCost: Number(o.deliveryCost ?? 0),
      commission: Number(o.commission),
      vetPointsUsed: Number(o.vetPointsUsed),
      vetPointsEarned: Number(o.vetPointsEarned),
      items: o.items?.map((it) => ({ ...it, price: Number(it.price) })),
      transferPayments: o.transferPayments?.map((t) => ({ ...t, amount: Number(t.amount) })),
    };
  }
}

// Денежные поля заказа приходят из Prisma как Decimal; serialize делает из них числа.
interface SerializableOrder {
  subtotal: unknown;
  total: unknown;
  deliveryCost?: unknown;
  commission: unknown;
  vetPointsUsed: unknown;
  vetPointsEarned: unknown;
  items?: ({ sellerId: string; price: unknown; quantity: unknown })[];
  transferPayments?: { sellerId: string; amount: unknown }[];
}


