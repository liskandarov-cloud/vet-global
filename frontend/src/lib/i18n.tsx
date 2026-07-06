'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Lang = 'ru' | 'uz';

const DICT: Record<string, { ru: string; uz: string }> = {
  'nav.catalog': { ru: 'Каталог', uz: 'Katalog' },
  'nav.promotions': { ru: 'Акции', uz: 'Aksiyalar' },
  'nav.suppliers': { ru: 'Поставщики', uz: 'Yetkazib beruvchilar' },
  'nav.blog': { ru: 'Блог', uz: 'Blog' },
  'nav.cart': { ru: 'Корзина', uz: 'Savat' },
  'nav.login': { ru: 'Войти', uz: 'Kirish' },
  'nav.logout': { ru: 'Выйти', uz: 'Chiqish' },
  'nav.dashboard': { ru: 'Кабинет', uz: 'Kabinet' },

  'home.hero.title': { ru: 'B2B-платформа ветеринарных решений', uz: 'Veterinariya yechimlari B2B platformasi' },
  'home.hero.subtitle': {
    ru: 'Прозрачные закупки препаратов, кормов и вакцин напрямую от проверенных поставщиков.',
    uz: 'Tekshirilgan yetkazib beruvchilardan preparatlar, ozuqa va vaksinalarni shaffof xarid qilish.',
  },
  'home.hero.cta': { ru: 'Перейти в каталог', uz: 'Katalogga o‘tish' },
  'home.categories': { ru: 'Категории', uz: 'Kategoriyalar' },
  'home.promotions': { ru: 'Акции и предложения', uz: 'Aksiyalar va takliflar' },
  'home.verified': { ru: 'Проверенные поставщики', uz: 'Tekshirilgan yetkazib beruvchilar' },

  'catalog.title': { ru: 'Каталог товаров', uz: 'Mahsulotlar katalogi' },
  'catalog.search': { ru: 'Поиск по названию или веществу…', uz: 'Nomi yoki modda bo‘yicha qidirish…' },
  'catalog.filters': { ru: 'Фильтры', uz: 'Filtrlar' },
  'catalog.category': { ru: 'Категория', uz: 'Kategoriya' },
  'catalog.manufacturer': { ru: 'Производитель', uz: 'Ishlab chiqaruvchi' },
  'catalog.animal': { ru: 'Животное', uz: 'Hayvon' },
  'catalog.inStock': { ru: 'Только в наличии', uz: 'Faqat mavjud' },
  'catalog.reset': { ru: 'Сбросить', uz: 'Tozalash' },
  'catalog.empty': { ru: 'Товары не найдены', uz: 'Mahsulotlar topilmadi' },
  'catalog.all': { ru: 'Все', uz: 'Barchasi' },

  'product.addToCart': { ru: 'В корзину', uz: 'Savatga' },
  'product.minOrder': { ru: 'Мин. заказ', uz: 'Min. buyurtma' },
  'product.certificate': { ru: 'Сертификат качества', uz: 'Sifat sertifikati' },
  'product.substance': { ru: 'Активное вещество', uz: 'Faol modda' },
  'product.form': { ru: 'Форма выпуска', uz: 'Chiqarish shakli' },
  'product.manufacturer': { ru: 'Производитель', uz: 'Ishlab chiqaruvchi' },
  'product.analogs': { ru: 'Аналоги', uz: 'Analoglar' },
  'product.verified': { ru: 'Проверенный поставщик', uz: 'Tekshirilgan yetkazib beruvchi' },

  'cart.title': { ru: 'Корзина', uz: 'Savat' },
  'cart.empty': { ru: 'Ваша корзина пуста', uz: 'Savatingiz bo‘sh' },
  'cart.subtotal': { ru: 'Сумма', uz: 'Summa' },
  'cart.checkout': { ru: 'Оформить заказ', uz: 'Buyurtma berish' },
  'cart.name': { ru: 'Имя', uz: 'Ism' },
  'cart.phone': { ru: 'Телефон', uz: 'Telefon' },
  'cart.company': { ru: 'Компания', uz: 'Kompaniya' },
  'cart.usePoints': { ru: 'Списать VetPoints', uz: 'VetPoints ishlatish' },
  'cart.orderPlaced': { ru: 'Заказ принят! Мы свяжемся для подтверждения.', uz: 'Buyurtma qabul qilindi! Tasdiqlash uchun bog‘lanamiz.' },

  'common.loading': { ru: 'Загрузка…', uz: 'Yuklanmoqda…' },
  'common.price': { ru: 'Цена', uz: 'Narx' },
  'common.all': { ru: 'Все', uz: 'Hammasi' },
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  // Инлайновый перевод: tt('русский', 'oʻzbekcha') — узбекский пишется прямо у строки.
  tt: (ru: string, uz: string) => string;
}

const Ctx = createContext<I18nCtx>({ lang: 'ru', setLang: () => {}, t: (k) => k, tt: (ru) => ru });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('vg_lang')) as Lang | null;
    if (saved === 'ru' || saved === 'uz') setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('vg_lang', l);
  };

  const t = (key: string) => DICT[key]?.[lang] ?? key;
  const tt = (ru: string, uz: string) => (lang === 'uz' ? uz : ru);

  return <Ctx.Provider value={{ lang, setLang, t, tt }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
