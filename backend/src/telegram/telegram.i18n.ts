export type BotLang = 'ru' | 'uz';

type Dict = Record<string, { ru: string; uz: string }>;

export const T: Dict = {
  welcome: {
    ru: '👋 Добро пожаловать в VetHub — B2B-платформу ветеринарных препаратов и кормов.\n\nВыберите язык:',
    uz: '👋 VetHub — veterinariya preparatlari va ozuqalar B2B platformasiga xush kelibsiz.\n\nTilni tanlang:',
  },
  menu_hint: { ru: 'Выберите действие в меню ниже 👇', uz: 'Quyidagi menyudan amalni tanlang 👇' },
  btn_search: { ru: '🔍 Поиск товара', uz: '🔍 Mahsulot qidirish' },
  btn_lead: { ru: '📝 Оставить заявку', uz: '📝 Ariza qoldirish' },
  btn_lang: { ru: '🌐 Язык', uz: '🌐 Til' },
  btn_orders: { ru: '📦 Мои заказы', uz: '📦 Buyurtmalarim' },
  seller_confirm_done: { ru: '✅ Заказ #{no} подтверждён — покупатель получил уведомление.', uz: '✅ #{no} buyurtma tasdiqlandi — xaridorga xabar yuborildi.' },
  seller_avail_done: { ru: '✅ Наличие подтверждено — покупатель может оплатить заказ.', uz: '✅ Mavjudlik tasdiqlandi — xaridor buyurtmani toʻlashi mumkin.' },
  seller_only: { ru: 'Кнопка — для продавца этого заказа', uz: 'Tugma — shu buyurtma sotuvchisi uchun' },
  login_link_first: {
    ru: 'Вход через Telegram работает для аккаунтов с подключённым Telegram. Войдите на сайте по паролю и подключите его: колокольчик → «Подключить Telegram».',
    uz: 'Telegram orqali kirish Telegram ulangan akkauntlar uchun ishlaydi. Saytga parol bilan kiring va uni ulang: qoʻngʻiroqcha → «Telegramni ulash».',
  },
  login_expired: {
    ru: 'Ссылка для входа устарела. Нажмите «Войти через Telegram» на сайте ещё раз.',
    uz: 'Kirish havolasi eskirgan. Saytda «Telegram orqali kirish» tugmasini yana bosing.',
  },
  login_confirm: {
    ru: '🔐 Вход на сайт VetHub.\nКод на экране сайта: <b>{code}</b>\n\nЭто вы входите? Если вы не нажимали «Войти через Telegram» сами — нажмите «Это не я».',
    uz: '🔐 VetHub saytiga kirish.\nSayt ekranidagi kod: <b>{code}</b>\n\nBu sizmisiz? Agar «Telegram orqali kirish» tugmasini oʻzingiz bosmagan boʻlsangiz — «Bu men emas» ni bosing.',
  },
  login_yes: { ru: '✅ Да, войти', uz: '✅ Ha, kirish' },
  login_no: { ru: '✖️ Это не я', uz: '✖️ Bu men emas' },
  login_done: { ru: '✅ Вход подтверждён — вернитесь на сайт.', uz: '✅ Kirish tasdiqlandi — saytga qayting.' },
  login_cancelled: {
    ru: 'Вход отменён. Если это были не вы — смените пароль на сайте.',
    uz: 'Kirish bekor qilindi. Agar bu siz boʻlmasangiz — saytda parolni almashtiring.',
  },
  btn_cart: { ru: '🛒 Корзина', uz: '🛒 Savat' },
  btn_to_cart: { ru: '🛒 В корзину', uz: '🛒 Savatga' },
  btn_checkout: { ru: '🧾 Оформить', uz: '🧾 Rasmiylashtirish' },
  btn_cart_clear: { ru: '🗑 Очистить', uz: '🗑 Tozalash' },
  ask_qty: { ru: 'Сколько штук? Минимум — {min}. Напишите число.', uz: 'Necha dona? Kamida — {min}. Raqam yozing.' },
  bad_qty: { ru: 'Нужно целое число не меньше {min}.', uz: 'Kamida {min} boʻlgan butun son kerak.' },
  cart_added: { ru: '✅ Добавлено. В корзине позиций: {n}.', uz: '✅ Qoʻshildi. Savatdagi pozitsiyalar: {n}.' },
  cart_empty: { ru: 'Корзина пуста. Добавьте товары из каталога или поиска.', uz: 'Savat boʻsh. Katalog yoki qidiruvdan mahsulot qoʻshing.' },
  cart_header: {
    ru: '🛒 Корзина. «Оформить» откроет сайт с этими товарами — там адрес, доставка и оплата.',
    uz: '🛒 Savat. «Rasmiylashtirish» saytni shu mahsulotlar bilan ochadi — u yerda manzil, yetkazib berish va toʻlov.',
  },
  orders_header: {
    ru: '📦 Последние заказы — нажмите, чтобы открыть. Повторить заказ можно кнопкой на его странице.',
    uz: '📦 Soʻnggi buyurtmalar — ochish uchun bosing. Buyurtmani uning sahifasidagi tugma bilan takrorlash mumkin.',
  },
  orders_none: { ru: 'Заказов пока нет.', uz: 'Hozircha buyurtmalar yoʻq.' },
  orders_link_first: {
    ru: 'Чтобы видеть заказы здесь, подключите аккаунт: на сайте колокольчик → «Подключить Telegram».',
    uz: 'Buyurtmalarni shu yerda koʻrish uchun akkauntni ulang: saytda qoʻngʻiroqcha → «Telegramni ulash».',
  },
  btn_contacts: { ru: '📞 Контакты', uz: '📞 Aloqa' },
  contacts: { ru: 'Связаться с VetHub:', uz: 'VetHub bilan bogʻlanish:' },
  ask_query: {
    ru: 'Введите название препарата или действующее вещество:',
    uz: 'Preparat nomi yoki faol moddani kiriting:',
  },
  no_results: { ru: '😔 Ничего не найдено. Попробуйте другой запрос.', uz: '😔 Hech narsa topilmadi. Boshqa soʻrovni sinab koʻring.' },
  results_header: { ru: 'Найдено:', uz: 'Topildi:' },
  btn_order: { ru: '🛒 Оставить заявку', uz: '🛒 Ariza qoldirish' },
  ask_name: { ru: 'Как вас зовут? (ФИО)', uz: 'Ismingiz? (F.I.Sh.)' },
  ask_phone: { ru: 'Ваш контактный телефон:', uz: 'Aloqa telefoningiz:' },
  lead_done: {
    ru: '✅ Заявка принята! Наш менеджер свяжется с вами в ближайшее время.',
    uz: '✅ Ariza qabul qilindi! Menejerimiz tez orada siz bilan bogʻlanadi.',
  },
  price: { ru: 'Цена', uz: 'Narx' },
  open_site: { ru: 'Открыть на сайте', uz: 'Saytda ochish' },

  btn_catalog: { ru: '📂 Каталог', uz: '📂 Katalog' },
  btn_promotions: { ru: '🔥 Акции', uz: '🔥 Aksiyalar' },
  choose_category: { ru: 'Выберите категорию:', uz: 'Kategoriyani tanlang:' },
  category_empty: { ru: 'В этой категории пока нет товаров.', uz: 'Bu kategoriyada hozircha mahsulot yoʻq.' },
  btn_back: { ru: '⬅️ Категории', uz: '⬅️ Kategoriyalar' },
  from: { ru: 'от', uz: 'dan' },
  offers_n: { ru: 'предложений', uz: 'taklif' },
  in_stock: { ru: 'В наличии', uz: 'Mavjud' },
  out_stock: { ru: 'Под заказ', uz: 'Buyurtma asosida' },
  l_substance: { ru: 'Действующее вещество', uz: 'Faol modda' },
  l_manufacturer: { ru: 'Производитель', uz: 'Ishlab chiqaruvchi' },
  l_form: { ru: 'Форма', uz: 'Shakl' },
  l_minorder: { ru: 'Мин. заказ', uz: 'Min. buyurtma' },
  promotions_header: { ru: '🔥 Акции и спецпредложения:', uz: '🔥 Aksiyalar va maxsus takliflar:' },
  no_promotions: { ru: 'Сейчас акций нет.', uz: 'Hozircha aksiyalar yoʻq.' },
  page_of: { ru: 'стр.', uz: 'sahifa' },
  sum: { ru: 'сум', uz: 'soʻm' },
};

export const LINK: Dict = {
  link_done: {
    ru: '✅ Уведомления VetHub подключены к аккаунту {name}. Сюда будут приходить заказы, оплаты и статусы. Отключить — /stop.',
    uz: '✅ VetHub bildirishnomalari {name} akkauntiga ulandi. Bu yerga buyurtmalar, toʻlovlar va holatlar keladi. Oʻchirish — /stop.',
  },
  link_expired: {
    ru: 'Ссылка устарела. Откройте её заново на сайте: колокольчик → «Подключить Telegram».',
    uz: 'Havola eskirgan. Uni saytda qayta oching: qoʻngʻiroqcha → «Telegramni ulash».',
  },
  unlinked: {
    ru: 'Уведомления отключены. Подключить снова можно на сайте: колокольчик → «Подключить Telegram».',
    uz: 'Bildirishnomalar oʻchirildi. Saytda qayta ulash mumkin: qoʻngʻiroqcha → «Telegramni ulash».',
  },
};
Object.assign(T, LINK);

export const t = (key: string, lang: BotLang) => T[key]?.[lang] ?? key;
