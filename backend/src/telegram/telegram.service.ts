import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadSource } from '@prisma/client';
import { Bot, Context, InlineKeyboard, InputFile, Keyboard } from 'grammy';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_PRODUCT } from '../common/visibility';
import { frontendUrl } from '../common/frontend-url';
import { PromotionsService } from '../promotions/promotions.service';
import { applyPromotion } from '../common/pricing';
import { LeadsService } from '../leads/leads.service';
import { BotLang, t } from './telegram.i18n';
import { searchVariants } from '../products/search-variants';
import { statusText } from '../alerts/text';
import { EMAIL, PHONE_DISPLAY, SITE } from '../common/contacts';

interface ChatState {
  lang: BotLang;
  flow?: 'search' | 'lead' | 'cart';
  step?: 'query' | 'name' | 'phone' | 'qty';
  data: { fullName?: string; phone?: string; productId?: string; productName?: string; min?: number };
  // Корзина живёт в памяти бота: оформление — на сайте, куда она передаётся
  // ссылкой. shortcut: сбрасывается при перезапуске сервера; хранить в базе,
  // если корзины в боте станут долгими.
  cart?: { id: string; name: string; qty: number }[];
}

const PAGE = 5;

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot?: Bot;
  private readonly state = new Map<number, ChatState>();
  private frontendUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly leads: LeadsService,
    private readonly promotions: PromotionsService,
  ) {
    this.frontendUrl = frontendUrl();
  }

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled.');
      return;
    }
    this.bot = new Bot(token);
    this.registerHandlers(this.bot);
    this.bot.start({ onStart: (i) => this.logger.log(`Telegram bot @${i.username} started (polling).`) })
      .catch((e) => this.logger.error(`Telegram bot failed: ${(e as Error).message}`));
  }

  async onModuleDestroy() {
    await this.bot?.stop();
  }

  private get(chatId: number): ChatState {
    let s = this.state.get(chatId);
    if (!s) {
      s = { lang: 'ru', data: {} };
      this.state.set(chatId, s);
    }
    return s;
  }

  private mainMenu(lang: BotLang) {
    return new Keyboard()
      .text(t('btn_catalog', lang))
      .text(t('btn_search', lang))
      .row()
      .text(t('btn_orders', lang))
      .text(t('btn_promotions', lang))
      .row()
      .text(t('btn_lead', lang))
      .text(t('btn_contacts', lang))
      .row()
      .text(t('btn_cart', lang))
      .text(t('btn_lang', lang))
      .resized();
  }

  // Привязка чата к аккаунту по одноразовому ключу. Чат, привязанный раньше к
  // другому аккаунту, переходит к этому: уведомления идут тому, кто вошёл.
  private async linkAccount(ctx: Context, token: string) {
    const chatId = String(ctx.chat!.id);
    const user = await this.prisma.user.findFirst({
      where: { telegramLinkToken: token, telegramLinkUntil: { gt: new Date() } },
      select: { id: true, fullName: true, telegramLang: true },
    });
    const lang: BotLang = user?.telegramLang === 'uz' ? 'uz' : 'ru';
    if (!user) return ctx.reply(t('link_expired', this.get(ctx.chat!.id).lang));
    await this.prisma.$transaction([
      this.prisma.user.updateMany({ where: { telegramChatId: chatId, id: { not: user.id } }, data: { telegramChatId: null } }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { telegramChatId: chatId, telegramLinkToken: null, telegramLinkUntil: null },
      }),
    ]);
    this.get(ctx.chat!.id).lang = lang;
    await ctx.reply(t('link_done', lang).replace('{name}', user.fullName), { reply_markup: this.mainMenu(lang) });
  }

  private langKeyboard() {
    return new InlineKeyboard().text('🇷🇺 Русский', 'lang:ru').text('🇺🇿 Oʻzbekcha', 'lang:uz');
  }

  private registerHandlers(bot: Bot) {
    bot.command('start', async (ctx) => {
      // Ссылка из кабинета: t.me/<бот>?start=link_<ключ>.
      const link = /^link_([a-f0-9]{32})$/.exec(typeof ctx.match === 'string' ? ctx.match : '');
      if (link && ctx.chat.type === 'private') return this.linkAccount(ctx, link[1]);
      this.get(ctx.chat.id);
      await ctx.reply(t('welcome', 'ru'), { reply_markup: this.langKeyboard() });
    });

    bot.command('stop', async (ctx) => {
      await this.prisma.user.updateMany({ where: { telegramChatId: String(ctx.chat.id) }, data: { telegramChatId: null } });
      await ctx.reply(t('unlinked', this.get(ctx.chat.id).lang));
    });

    bot.callbackQuery(/^lang:(ru|uz)$/, async (ctx) => {
      const lang = ctx.match![1] as BotLang;
      const s = this.get(ctx.chat!.id);
      s.lang = lang;
      s.flow = undefined;
      await ctx.answerCallbackQuery();
      await ctx.reply(t('menu_hint', lang), { reply_markup: this.mainMenu(lang) });
    });

    // Каталог: список категорий.
    bot.callbackQuery('cats', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.showCategories(ctx, this.get(ctx.chat!.id).lang);
    });

    // Категория: страница товаров.
    bot.callbackQuery(/^cat:([a-z0-9-]+):(\d+)$/, async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.showCategoryPage(ctx, ctx.match![1], Number(ctx.match![2]), this.get(ctx.chat!.id).lang);
    });

    // Карточка товара.
    bot.callbackQuery(/^prod:(.+)$/, async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.showProduct(ctx, ctx.match![1], this.get(ctx.chat!.id).lang);
    });

    // Акции.
    bot.callbackQuery('promos', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.showPromotions(ctx, this.get(ctx.chat!.id).lang);
    });

    // Заявка по товару.
    bot.callbackQuery(/^tocart:(.+)$/, async (ctx) => {
      const s = this.get(ctx.chat!.id);
      const p = await this.prisma.product.findFirst({ where: { id: ctx.match![1], ...PUBLIC_PRODUCT }, select: { id: true, name: true, nameUz: true, minOrder: true } });
      await ctx.answerCallbackQuery();
      if (!p) return ctx.reply(t('no_results', s.lang));
      s.flow = 'cart';
      s.step = 'qty';
      s.data = { productId: p.id, productName: this.pname(p, s.lang), min: p.minOrder || 1 };
      await ctx.reply(t('ask_qty', s.lang).replace('{min}', String(p.minOrder || 1)));
    });

    bot.callbackQuery('cart', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.showCart(ctx, this.get(ctx.chat!.id));
    });

    bot.callbackQuery('cart_clear', async (ctx) => {
      const s = this.get(ctx.chat!.id);
      s.cart = [];
      await ctx.answerCallbackQuery();
      await ctx.reply(t('cart_empty', s.lang), { reply_markup: this.mainMenu(s.lang) });
    });

    bot.callbackQuery(/^order:(.+)$/, async (ctx) => {
      const s = this.get(ctx.chat!.id);
      const productId = ctx.match![1];
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      s.flow = 'lead';
      s.step = 'name';
      s.data = { productId, productName: product?.name };
      await ctx.answerCallbackQuery();
      await ctx.reply(t('ask_name', s.lang));
    });

    bot.on('message:text', async (ctx) => {
      const s = this.get(ctx.chat.id);
      const text = ctx.message.text.trim();
      const lang = s.lang;

      if (this.isBtn(text, 'btn_catalog')) { s.flow = undefined; return this.showCategories(ctx, lang); }
      if (this.isBtn(text, 'btn_promotions')) { s.flow = undefined; return this.showPromotions(ctx, lang); }
      if (this.isBtn(text, 'btn_orders')) { s.flow = undefined; return this.showMyOrders(ctx, lang); }
      if (this.isBtn(text, 'btn_cart')) { s.flow = undefined; return this.showCart(ctx, s); }
      if (s.flow === 'cart' && s.step === 'qty') {
        const min = s.data.min ?? 1;
        const qty = Number(text);
        if (!Number.isInteger(qty) || qty < min || qty > 100_000) return ctx.reply(t('bad_qty', lang).replace('{min}', String(min)));
        s.cart ??= [];
        const line = s.cart.find((l) => l.id === s.data.productId);
        if (line) line.qty = qty;
        else s.cart.push({ id: s.data.productId!, name: s.data.productName ?? '', qty });
        s.flow = undefined;
        return ctx.reply(t('cart_added', lang).replace('{n}', String(s.cart.length)), {
          reply_markup: new InlineKeyboard().text(t('btn_cart', lang), 'cart').text(t('btn_catalog', lang), 'cats'),
        });
      }
      if (this.isBtn(text, 'btn_search')) {
        s.flow = 'search'; s.step = 'query'; s.data = {};
        return ctx.reply(t('ask_query', lang));
      }
      if (this.isBtn(text, 'btn_lead')) {
        s.flow = 'lead'; s.step = 'name'; s.data = {};
        return ctx.reply(t('ask_name', lang));
      }
      if (this.isBtn(text, 'btn_contacts')) {
        s.flow = undefined;
        return ctx.reply(`${t('contacts', lang)}\n📞 ${PHONE_DISPLAY}\n✉️ ${EMAIL}\n🌐 ${SITE}`);
      }
      if (this.isBtn(text, 'btn_lang')) {
        return ctx.reply(t('welcome', lang), { reply_markup: this.langKeyboard() });
      }

      if (s.flow === 'search' && s.step === 'query') {
        s.flow = undefined;
        return this.doSearch(ctx, text, lang);
      }
      if (s.flow === 'lead') {
        if (s.step === 'name') {
          s.data.fullName = text; s.step = 'phone';
          return ctx.reply(t('ask_phone', lang));
        }
        if (s.step === 'phone') {
          s.data.phone = text;
          await this.leads.create({
            source: LeadSource.TELEGRAM,
            fullName: s.data.fullName!,
            phone: s.data.phone!,
            productId: s.data.productId,
            productName: s.data.productName,
            message: `Заявка из Telegram (@${ctx.from?.username ?? ctx.from?.id})`,
          });
          s.flow = undefined; s.step = undefined;
          return ctx.reply(t('lead_done', lang), { reply_markup: this.mainMenu(lang) });
        }
      }

      return ctx.reply(t('menu_hint', lang), { reply_markup: this.mainMenu(lang) });
    });
  }

  private isBtn(text: string, key: string): boolean {
    return text === t(key, 'ru') || text === t(key, 'uz');
  }

  // ── Каталог ──
  private async showCategories(ctx: any, lang: BotLang) {
    const cats = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    const kb = new InlineKeyboard();
    cats.forEach((c, i) => {
      kb.text(lang === 'uz' && c.nameUz ? c.nameUz : c.name, `cat:${c.slug}:0`);
      if (i % 2 === 1) kb.row();
    });
    await ctx.reply(`📂 ${t('choose_category', lang)}`, { reply_markup: kb });
  }

  private async showCategoryPage(ctx: any, slug: string, page: number, lang: BotLang) {
    // Бот — та же витрина, что сайт: снятые с продажи и товары продавцов без
    // проверки сюда не попадают.
    const where = { ...PUBLIC_PRODUCT, category: { slug } };
    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, orderBy: { createdAt: 'asc' }, skip: page * PAGE, take: PAGE }),
    ]);
    await this.promotions.annotate(products);
    if (total === 0) return ctx.reply(t('category_empty', lang), { reply_markup: this.mainMenu(lang) });

    const kb = new InlineKeyboard();
    for (const p of products) {
      const price = this.minPrice(p);
      const label = `${this.trunc(this.pname(p, lang), 30)} · ${this.money(price)}`;
      kb.text(label, `prod:${p.id}`).row();
    }
    // Навигация.
    const pages = Math.ceil(total / PAGE);
    const nav: [string, string][] = [];
    if (page > 0) nav.push(['◀️', `cat:${slug}:${page - 1}`]);
    if (page < pages - 1) nav.push(['▶️', `cat:${slug}:${page + 1}`]);
    nav.forEach(([txt, cb]) => kb.text(txt, cb));
    if (nav.length) kb.row();
    kb.text(t('btn_back', lang), 'cats');

    await ctx.reply(`📦 ${t('page_of', lang)} ${page + 1}/${pages} · ${total}`, { reply_markup: kb });
  }

  private async showProduct(ctx: any, id: string, lang: BotLang) {
    const p = await this.prisma.product.findFirst({ where: { ...PUBLIC_PRODUCT, id }, include: { category: true } });
    if (!p) return;
    const price = this.minPrice(p);
    const offers = p.offersCount ?? 0;
    const priceLine =
      offers > 0
        ? `💰 ${t('from', lang)} ${this.money(price)} · ${offers} ${t('offers_n', lang)}`
        : `💰 ${this.money(price)}`;
    const caption =
      `<b>${this.esc(this.pname(p, lang))}</b>\n` +
      (p.manufacturer ? `🏭 ${t('l_manufacturer', lang)}: ${this.esc(p.manufacturer)}\n` : '') +
      (p.activeSubstance ? `💊 ${t('l_substance', lang)}: ${this.esc(p.activeSubstance)}\n` : '') +
      (p.form ? `📋 ${t('l_form', lang)}: ${this.esc(p.form)}\n` : '') +
      `📦 ${t('l_minorder', lang)}: ${p.minOrder} · ${p.inStock ? t('in_stock', lang) : t('out_stock', lang)}\n` +
      priceLine;

    const kb = new InlineKeyboard()
      .text(t('btn_to_cart', lang), `tocart:${p.id}`)
      .text(t('btn_order', lang), `order:${p.id}`)
      .row()
      .url(t('open_site', lang), `${this.frontendUrl}/products/${p.id}`)
      .row()
      .text(t('btn_back', lang), `cat:${p.category.slug}:0`);

    const img = this.imgUrl(p.images?.[0]);
    const photo = (src: string | InputFile) => ctx.replyWithPhoto(src, { caption, parse_mode: 'HTML', reply_markup: kb });
    try {
      if (!img) throw new Error('без фото');
      // По ссылке Telegram берёт не каждый формат (WebP — нет), а загруженный
      // файл примет: тогда скачиваем фото сами.
      await photo(img).catch(() => photo(new InputFile(new URL(img))));
    } catch {
      await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: kb });
    }
  }

  private async showPromotions(ctx: any, lang: BotLang) {
    // Список по настоящим скидкам, а не по пометке isPromotion в карточке: это
    // отдельный флаг продавца, никак не связанный с акцией — товар с флагом мог
    // не иметь скидки, а товар с настоящей скидкой в список не попадал.
    const products = await this.promotions.discountedProducts(10);
    if (products.length === 0) return ctx.reply(t('no_promotions', lang), { reply_markup: this.mainMenu(lang) });
    await ctx.reply(t('promotions_header', lang));
    for (const p of products) {
      const kb = new InlineKeyboard().text(`${this.trunc(this.pname(p, lang), 30)} · ${this.money(this.minPrice(p))}`, `prod:${p.id}`);
      await ctx.reply(`🔥 <b>${this.esc(this.pname(p, lang))}</b>`, { parse_mode: 'HTML', reply_markup: kb });
    }
  }

  private async doSearch(ctx: any, query: string, lang: BotLang) {
    const products = await this.prisma.product.findMany({
      where: {
        ...PUBLIC_PRODUCT,
        // Как на сайте: запрос латиницей находит кириллицу и наоборот —
        // товары записаны кириллицей, а по-узбекски чаще пишут латиницей.
        OR: searchVariants(query).flatMap((v) =>
          (['name', 'nameUz', 'activeSubstance', 'manufacturer'] as const).map((f) => ({ [f]: { contains: v, mode: 'insensitive' as const } })),
        ),
      },
      take: 8,
    });
    if (products.length === 0) return ctx.reply(t('no_results', lang), { reply_markup: this.mainMenu(lang) });

    await ctx.reply(`🔍 ${t('results_header', lang)} ${products.length}`);
    const kb = new InlineKeyboard();
    for (const p of products) {
      kb.text(`${this.trunc(this.pname(p, lang), 30)} · ${this.money(this.minPrice(p))}`, `prod:${p.id}`).row();
    }
    await ctx.reply('👇', { reply_markup: kb });
  }

  // Заказы привязанного аккаунта. Покупателю — свои заказы с суммой; продавцу —
  // заказы с его позициями без общей суммы (в ней могут быть чужие позиции).
  private async showMyOrders(ctx: any, lang: BotLang) {
    const user = await this.prisma.user.findUnique({
      where: { telegramChatId: String(ctx.chat.id) },
      select: { id: true, role: true },
    });
    if (!user) {
      return ctx.reply(t('orders_link_first', lang), { reply_markup: new InlineKeyboard().url(t('open_site', lang), this.frontendUrl) });
    }
    const seller = user.role === 'SELLER';
    const orders = await this.prisma.order.findMany({
      where: seller ? { items: { some: { sellerId: user.id } } } : { buyerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, status: true, total: true },
    });
    if (!orders.length) return ctx.reply(t('orders_none', lang), { reply_markup: this.mainMenu(lang) });
    const kb = new InlineKeyboard();
    for (const o of orders) {
      const label = `#${o.id.slice(0, 8)} · ${statusText(o.status)[lang]}${seller ? '' : ` · ${this.money(Number(o.total))}`}`;
      kb.url(label, `${this.frontendUrl}${seller ? '/seller' : `/orders/${o.id}`}`).row();
    }
    await ctx.reply(t('orders_header', lang), { reply_markup: kb });
  }

  // Корзина: «Оформить» открывает сайт внутри Telegram с этими товарами
  // (/cart?add=…); адрес, доставка и оплата — уже готовые сайта.
  private async showCart(ctx: any, s: ChatState) {
    const lang = s.lang;
    if (!s.cart?.length) return ctx.reply(t('cart_empty', lang), { reply_markup: this.mainMenu(lang) });
    const lines = s.cart.map((l, i) => `${i + 1}. ${this.esc(l.name)} — ${l.qty}`).join('\n');
    const add = s.cart.map((l) => `${l.id}:${l.qty}`).join(',');
    const kb = new InlineKeyboard()
      .webApp(t('btn_checkout', lang), `${this.frontendUrl}/cart?add=${add}`)
      .row()
      .text(t('btn_cart_clear', lang), 'cart_clear');
    await ctx.reply(`${t('cart_header', lang)}\n\n${lines}`, { parse_mode: 'HTML', reply_markup: kb });
  }

  // ── helpers ──
  private pname(p: { name: string; nameUz?: string | null }, lang: BotLang) {
    return lang === 'uz' && p.nameUz ? p.nameUz : p.name;
  }

  // Цена в боте — та же, что в каталоге: со снятым процентом акции. Пока
  // скидка применялась только на сайте, бот показывал цену выше той, что
  // спишется при заказе.
  private minPrice(p: any): number {
    const base = p.minPrice != null ? Number(p.minPrice) : Number(p.price);
    return applyPromotion(base, p.promoPercent);
  }
  private money(v: number): string {
    return `${Math.round(v).toLocaleString('ru-RU')} сум`;
  }
  private trunc(s: string, n: number): string {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  private imgUrl(img?: string): string | undefined {
    if (!img) return undefined;
    return img.startsWith('http') ? img : `${this.frontendUrl}${img}`;
  }

}
