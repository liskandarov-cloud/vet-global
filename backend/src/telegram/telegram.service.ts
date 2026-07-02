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
    this.frontendUrl = config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
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
    // Long polling — no public URL needed. Fire-and-forget; never block boot.
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
      .text(t('btn_search', lang))
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
      const s = this.get(ctx.chat.id);
      await ctx.reply(`${t('welcome', 'ru')}`, { reply_markup: this.langKeyboard() });
    });

    bot.callbackQuery(/^lang:(ru|uz)$/, async (ctx) => {
      const lang = ctx.match![1] as BotLang;
      const s = this.get(ctx.chat!.id);
      s.lang = lang;
      s.flow = undefined;
      await ctx.answerCallbackQuery();
      await ctx.reply(t('menu_hint', lang), { reply_markup: this.mainMenu(lang) });
    });

    // Start a lead flow for a specific product (from search results).
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

      // Menu shortcuts (match either language label).
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

      // Flow handling
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

  private async doSearch(ctx: any, query: string, lang: BotLang) {
    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { activeSubstance: { contains: query, mode: 'insensitive' } },
          { manufacturer: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
    });

    if (products.length === 0) {
      return ctx.reply(t('no_results', lang), { reply_markup: this.mainMenu(lang) });
    }

    await ctx.reply(`🔍 ${t('results_header', lang)}`);
    for (const p of products) {
      const price = `${Math.round(Number(p.price)).toLocaleString('ru-RU')} сум`;
      const kb = new InlineKeyboard()
        .text(t('btn_order', lang), `order:${p.id}`)
        .url(t('open_site', lang), `${this.frontendUrl}/products/${p.id}`);
      const caption = `*${p.name}*\n${p.manufacturer ?? ''}\n💊 ${p.activeSubstance ?? '—'}\n💰 ${t('price', lang)}: ${price}`;
      await ctx.reply(caption, { parse_mode: 'Markdown', reply_markup: kb });
    }
  }

  private async notifyAdminChat(data: ChatState['data']) {
    if (!this.bot || !this.adminChatId) return;
    try {
      await this.bot.api.sendMessage(
        this.adminChatId,
        `🆕 Новая заявка (Telegram)\n👤 ${data.fullName}\n📞 ${data.phone}${data.productName ? `\n📦 ${data.productName}` : ''}`,
      );
    } catch {
      /* admin chat not reachable — ignore */
    }
  }
}
