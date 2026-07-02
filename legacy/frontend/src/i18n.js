import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ru: {
    translation: {
      nav: {
        home: 'Главная',
        catalog: 'Каталог',
        promotions: 'Акции',
        suppliers: 'Проверенные поставщики',
        blog: 'Блог',
        login: 'Войти',
        register: 'Регистрация',
        profile: 'Профиль',
        logout: 'Выйти',
        cart: 'Корзина'
      },
      hero: {
        title: 'Ветеринарный маркетплейс №1',
        subtitle: 'Объединяем производителей и покупателей ветеринарных товаров',
        cta: 'Начать работу',
        browse: 'Смотреть каталог'
      },
      categories: {
        title: 'Категории товаров',
        vaccines: 'Вакцины',
        antibiotics: 'Антибиотики',
        vitamins: 'Витамины',
        disinfectants: 'Дезинфектанты',
        feed_additives: 'Кормовые добавки',
        diagnostics: 'Диагностика',
        other: 'Прочее'
      },
      auth: {
        email: 'Email',
        password: 'Пароль',
        confirmPassword: 'Подтвердите пароль',
        fullName: 'Полное имя',
        phone: 'Телефон',
        company: 'Компания',
        inn: 'ИНН',
        role: 'Роль',
        buyer: 'Покупатель',
        seller: 'Продавец',
        loginTitle: 'Вход в систему',
        registerTitle: 'Регистрация',
        noAccount: 'Нет аккаунта?',
        haveAccount: 'Есть аккаунт?',
        loginBtn: 'Войти',
        registerBtn: 'Зарегистрироваться'
      },
      product: {
        addToCart: 'В корзину',
        inStock: 'В наличии',
        outOfStock: 'Под заказ',
        certificate: 'Сертификат',
        analogs: 'Аналоги',
        reviews: 'Отзывы',
        verifiedSupplier: 'Проверенный поставщик'
      },
      cart: {
        title: 'Корзина',
        empty: 'Корзина пуста',
        total: 'Итого',
        checkout: 'Оформить заказ',
        continue: 'Продолжить покупки'
      },
      dashboard: {
        myOrders: 'Мои заказы',
        vetPoints: 'VetPoints',
        favorites: 'Избранное',
        myProducts: 'Мои товары',
        addProduct: 'Добавить товар',
        statistics: 'Статистика',
        users: 'Пользователи',
        orders: 'Заказы',
        moderation: 'Модерация'
      },
      common: {
        search: 'Поиск',
        filter: 'Фильтр',
        sort: 'Сортировка',
        save: 'Сохранить',
        cancel: 'Отмена',
        delete: 'Удалить',
        edit: 'Редактировать',
        view: 'Просмотр',
        loading: 'Загрузка...',
        error: 'Ошибка',
        success: 'Успешно'
      }
    }
  },
  uz: {
    translation: {
      nav: {
        home: 'Bosh sahifa',
        catalog: 'Katalog',
        promotions: 'Aksiyalar',
        suppliers: 'Tekshirilgan yetkazib beruvchilar',
        blog: 'Blog',
        login: 'Kirish',
        register: "Ro'yxatdan o'tish",
        profile: 'Profil',
        logout: 'Chiqish',
        cart: 'Savat'
      },
      hero: {
        title: '№1 Veterinariya bozori',
        subtitle: 'Veterinariya mahsulotlari ishlab chiqaruvchilari va xaridorlarini birlashtiramiz',
        cta: 'Boshlash',
        browse: 'Katalogni ko\'rish'
      },
      categories: {
        title: 'Mahsulot turlari',
        vaccines: 'Vaktsinalar',
        antibiotics: 'Antibiotiklar',
        vitamins: 'Vitaminlar',
        disinfectants: 'Dezinfeksiyalash vositalari',
        feed_additives: 'Ozuqa qo\'shimchalari',
        diagnostics: 'Diagnostika',
        other: 'Boshqalar'
      },
      auth: {
        email: 'Email',
        password: 'Parol',
        confirmPassword: 'Parolni tasdiqlang',
        fullName: 'To\'liq ism',
        phone: 'Telefon',
        company: 'Kompaniya',
        inn: 'INN',
        role: 'Rol',
        buyer: 'Xaridor',
        seller: 'Sotuvchi',
        loginTitle: 'Tizimga kirish',
        registerTitle: "Ro'yxatdan o'tish",
        noAccount: "Hisob yo'qmi?",
        haveAccount: 'Hisob bormi?',
        loginBtn: 'Kirish',
        registerBtn: "Ro'yxatdan o'tish"
      },
      product: {
        addToCart: 'Savatga',
        inStock: 'Mavjud',
        outOfStock: 'Buyurtma asosida',
        certificate: 'Sertifikat',
        analogs: 'Analoglar',
        reviews: 'Sharhlar',
        verifiedSupplier: 'Tasdiqlangan yetkazib beruvchi'
      },
      cart: {
        title: 'Savat',
        empty: 'Savat bo\'sh',
        total: 'Jami',
        checkout: 'Buyurtma berish',
        continue: 'Xaridni davom ettirish'
      },
      dashboard: {
        myOrders: 'Mening buyurtmalarim',
        vetPoints: 'VetPoints',
        favorites: 'Sevimlilar',
        myProducts: 'Mening mahsulotlarim',
        addProduct: 'Mahsulot qo\'shish',
        statistics: 'Statistika',
        users: 'Foydalanuvchilar',
        orders: 'Buyurtmalar',
        moderation: 'Moderatsiya'
      },
      common: {
        search: 'Qidirish',
        filter: 'Filtr',
        sort: 'Saralash',
        save: 'Saqlash',
        cancel: 'Bekor qilish',
        delete: "O'chirish",
        edit: 'Tahrirlash',
        view: "Ko'rish",
        loading: 'Yuklanmoqda...',
        error: 'Xato',
        success: 'Muvaffaqiyatli'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ru',
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
