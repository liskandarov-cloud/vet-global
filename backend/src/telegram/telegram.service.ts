import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadSource } from '@prisma/client';
import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import { PrismaService } from '../prisma/prisma.service';
import { LeadsService } from '../leads/leads.service';
import { BotLang, t } from './telegram.i18n';

interface ChatState {
  lang: BotLang;
  flow?: 'search' | 'lead';
  step?: 'query' | 'name' | 'phone';
  data: { fullName?: string; phone?: string; productId?: string; productName?: string };
}

const PAGE = 5;

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot?: Bot;
  private readonly state = new Map<number, ChatState>();
  private frontendUrl: string;
  private adminChatId?: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly leads: LeadsService,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL') ?? 'https://vet-global.vercel.app';
    this.adminChatId = config.get<string>('TELEGRAM_ADMIN_CHAT_ID');
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
      .text(t('btn_promotions', lang))
      .text(t('btn_lead', lang))
      .row()
      .text(t('btn_lang', lang))
      .resized();
  }

  private langKeyboard() {
    return new InlineKeyboard().text('🇷🇺 Русский', 'lang:ru').text('🇺🇿 O‘zbekcha', 'lang:uz');
  }

  private registerHandlers(bot: Bot) {
    bot.command('start', async (ctx) => {
      this.get(ctx.chat.id);
      await ctx.reply(t('welcome', 'ru'), { reply_markup: this.langKeyboard() });
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
      if (this.isBtn(text, 'btn_search')) {
        s.flow = 'search'; s.step = 'query'; s.data = {};
        return ctx.reply(t('ask_query', lang));
      }
      if (this.isBtn(text, 'btn_lead')) {
        s.flow = 'lead'; s.step = 'name'; s.data = {};
        return ctx.reply(t('ask_name', lang));
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
          await this.notifyAdminChat(s.data);
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
    const where = { category: { slug } };
    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, orderBy: { createdAt: 'asc' }, skip: page * PAGE, take: PAGE }),
    ]);
    if (total === 0) return ctx.reply(t('category_empty', lang), { reply_markup: this.mainMenu(lang) });

    const kb = new InlineKeyboard();
    for (const p of products) {
      const price = this.minPrice(p);
      const label = `${this.trunc(p.name, 30)} · ${this.money(price)}`;
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
    const p = await this.prisma.product.findUnique({ where: { id }, include: { category: true } });
    if (!p) return;
    const price = this.minPrice(p);
    const offers = p.offersCount ?? 0;
    const priceLine =
      offers > 0
        ? `💰 ${t('from', lang)} ${this.money(price)} · ${offers} ${t('offers_n', lang)}`
        : `💰 ${this.money(price)}`;
    const caption =
      `<b>${this.esc(p.name)}</b>\n` +
      (p.manufacturer ? `🏭 ${t('l_manufacturer', lang)}: ${this.esc(p.manufacturer)}\n` : '') +
      (p.activeSubstance ? `💊 ${t('l_substance', lang)}: ${this.esc(p.activeSubstance)}\n` : '') +
      (p.form ? `📋 ${t('l_form', lang)}: ${this.esc(p.form)}\n` : '') +
      `📦 ${t('l_minorder', lang)}: ${p.minOrder} · ${p.inStock ? t('in_stock', lang) : t('out_stock', lang)}\n` +
      priceLine;

    const kb = new InlineKeyboard()
      .text(t('btn_order', lang), `order:${p.id}`)
      .url(t('open_site', lang), `${this.frontendUrl}/products/${p.id}`)
      .row()
      .text(t('btn_back', lang), `cat:${p.category.slug}:0`);

    const img = this.imgUrl(p.images?.[0]);
    try {
      if (img) await ctx.replyWithPhoto(img, { caption, parse_mode: 'HTML', reply_markup: kb });
      else await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: kb });
    } catch {
      await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: kb });
    }
  }

  private async showPromotions(ctx: any, lang: BotLang) {
    const products = await this.prisma.product.findMany({ where: { isPromotion: true }, take: 10 });
    if (products.length === 0) return ctx.reply(t('no_promotions', lang), { reply_markup: this.mainMenu(lang) });
    await ctx.reply(t('promotions_header', lang));
    for (const p of products) {
      const kb = new InlineKeyboard().text(`${this.trunc(p.name, 30)} · ${this.money(this.minPrice(p))}`, `prod:${p.id}`);
      await ctx.reply(`🔥 <b>${this.esc(p.name)}</b>`, { parse_mode: 'HTML', reply_markup: kb });
    }
  }

  private async doSearch(ctx: any, query: string, lang: BotLang) {
    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { activeSubstance: { contains: query, mode: 'insensitive' } },
          { manufacturer: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 8,
    });
    if (products.length === 0) return ctx.reply(t('no_results', lang), { reply_markup: this.mainMenu(lang) });

    await ctx.reply(`🔍 ${t('results_header', lang)} ${products.length}`);
    const kb = new InlineKeyboard();
    for (const p of products) {
      kb.text(`${this.trunc(p.name, 30)} · ${this.money(this.minPrice(p))}`, `prod:${p.id}`).row();
    }
    await ctx.reply('👇', { reply_markup: kb });
  }

  // ── helpers ──
  private minPrice(p: any): number {
    return p.minPrice != null ? Number(p.minPrice) : Number(p.price);
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

  private async notifyAdminChat(data: ChatState['data']) {
    if (!this.bot || !this.adminChatId) return;
    try {
      await this.bot.api.sendMessage(
        this.adminChatId,
        `🆕 Новая заявка (Telegram)\n👤 ${data.fullName}\n📞 ${data.phone}${data.productName ? `\n📦 ${data.productName}` : ''}`,
      );
    } catch {
      /* ignore */
    }
  }
}
