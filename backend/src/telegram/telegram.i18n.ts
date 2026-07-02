export type BotLang = 'ru' | 'uz';

type Dict = Record<string, { ru: string; uz: string }>;

export const T: Dict = {
  welcome: {
    ru: '👋 Добро пожаловать в VetGlobal — B2B-платформу ветеринарных препаратов и кормов.\n\nВыберите язык:',
    uz: '👋 VetGlobal — veterinariya preparatlari va ozuqalar B2B platformasiga xush kelibsiz.\n\nTilni tanlang:',
  },
  menu_hint: { ru: 'Выберите действие в меню ниже 👇', uz: 'Quyidagi menyudan amalni tanlang 👇' },
  btn_search: { ru: '🔍 Поиск товара', uz: '🔍 Mahsulot qidirish' },
  btn_lead: { ru: '📝 Оставить заявку', uz: '📝 Ariza qoldirish' },
  btn_lang: { ru: '🌐 Язык', uz: '🌐 Til' },
  ask_query: {
    ru: 'Введите название препарата или действующее вещество:',
    uz: 'Preparat nomi yoki faol moddani kiriting:',
  },
  no_results: { ru: '😔 Ничего не найдено. Попробуйте другой запрос.', uz: '😔 Hech narsa topilmadi. Boshqa so‘rovni sinab ko‘ring.' },
  results_header: { ru: 'Найдено:', uz: 'Topildi:' },
  btn_order: { ru: '🛒 Оставить заявку', uz: '🛒 Ariza qoldirish' },
  ask_name: { ru: 'Как вас зовут? (ФИО)', uz: 'Ismingiz? (F.I.Sh.)' },
  ask_phone: { ru: 'Ваш контактный телефон:', uz: 'Aloqa telefoningiz:' },
  lead_done: {
    ru: '✅ Заявка принята! Наш менеджер свяжется с вами в ближайшее время.',
    uz: '✅ Ariza qabul qilindi! Menejerimiz tez orada siz bilan bog‘lanadi.',
  },
  price: { ru: 'Цена', uz: 'Narx' },
  open_site: { ru: 'Открыть на сайте', uz: 'Saytda ochish' },
};

export const t = (key: string, lang: BotLang) => T[key]?.[lang] ?? key;
