// Перевод сообщений сервера на узбекский (запрос с Accept-Language: uz).
//
// Ключ — текст сообщения дословно, как в исходнике: с подстановками ${…}.
// В переводе {1}, {2}… — подставленные значения по порядку их появления в
// русском тексте. Ключи сверяет с кодом тест uz-messages.spec.ts: новое
// сообщение без перевода роняет CI.
export const UZ_MESSAGES: Record<string, string> = {
  'items должен быть массивом':
    'items massiv boʻlishi kerak',
  '«${p.name}» сейчас недоступен для заказа':
    '«{1}» hozircha buyurtma uchun mavjud emas',
  'Баллов уже недостаточно: их списал другой заказ. Обновите страницу.':
    'Ballar yetarli emas: ularni boshqa buyurtma ishlatdi. Sahifani yangilang.',
  'Бренд не найден':
    'Brend topilmadi',
  'В заказе несколько поставщиков — укажите продавца: ${split.map((p) => p.sellerId).join(\', \')}':
    'Buyurtmada bir nechta yetkazib beruvchi bor — sotuvchini koʻrsating: {1}',
  'В заказе нет позиций':
    'Buyurtmada pozitsiyalar yoʻq',
  'В заказе нет позиций этого продавца':
    'Buyurtmada bu sotuvchining pozitsiyalari yoʻq',
  'В наличии только ${p.stockQty} шт. — «${p.name}»':
    'Omborda faqat {1} dona bor — «{2}»',
  'В файле нет листов':
    'Faylda varaqlar yoʻq',
  'Вы единственный владелец: передайте права владельца, затем выйдите':
    'Siz yagona egasisiz: egalik huquqini boshqa aʼzoga topshiring, soʻng chiqing',
  'Вы не состоите в организации':
    'Siz tashkilot aʼzosi emassiz',
  'Вы уже оставили отзыв на этот товар':
    'Siz bu mahsulotga allaqachon sharh qoldirgansiz',
  'Вы уже состоите в организации':
    'Siz allaqachon tashkilot aʼzosisiz',
  'Документ загружается файлом через платформу, а не ссылкой':
    'Hujjat havola bilan emas, platforma orqali fayl sifatida yuklanadi',
  'Документ не найден':
    'Hujjat topilmadi',
  'Заказ в статусе ${from} — конечном, сменить на ${to} нельзя':
    'Buyurtma {1} holatida — bu yakuniy holat, uni {2} ga oʻzgartirib boʻlmaydi',
  'Заказ не найден':
    'Buyurtma topilmadi',
  'Заказ не требует подтверждения наличия':
    'Buyurtma mavjudlikni tasdiqlashni talab qilmaydi',
  'Заказ ожидает согласования в организации':
    'Buyurtma tashkilotda kelishuvni kutmoqda',
  'Заказ отменён — оплата невозможна':
    'Buyurtma bekor qilingan — toʻlov qilib boʻlmaydi',
  'Заказ содержит позицию «под заказ» — оплата будет доступна после подтверждения продавцом':
    'Buyurtmada «buyurtma asosida» pozitsiyasi bor — toʻlov sotuvchi tasdiqlagandan keyin mumkin boʻladi',
  'Заказ уже обработан':
    'Buyurtma allaqachon koʻrib chiqilgan',
  'Заказ уже оплачен':
    'Buyurtma allaqachon toʻlangan',
  'Запись не найдена':
    'Yozuv topilmadi',
  'Запрос закрыт':
    'Soʻrov yopilgan',
  'Запрос не найден':
    'Soʻrov topilmadi',
  'Заявка не найдена':
    'Ariza topilmadi',
  'Заявка уже обработана':
    'Ariza allaqachon koʻrib chiqilgan',
  'Из статуса ${from} нельзя перейти в ${to}. Допустимо: ${next.join(\', \')}':
    '{1} holatidan {2} ga oʻtib boʻlmaydi. Mumkin: {3}',
  'Исключать владельцев и управляющих может только владелец организации':
    'Egalar va boshqaruvchilarni faqat tashkilot egasi chiqarishi mumkin',
  'Категория по умолчанию не найдена':
    'Standart kategoriya topilmadi',
  'Котировка не найдена':
    'Narx taklifi topilmadi',
  'Лимит владельца меняет только владелец':
    'Ega limitini faqat egasining oʻzi oʻzgartiradi',
  'Менять роли участников может только владелец организации':
    'Aʼzolar rolini faqat tashkilot egasi oʻzgartirishi mumkin',
  'Минимальный заказ для «${p.name}» — ${minOrder} шт.':
    '«{1}» uchun minimal buyurtma — {2} dona',
  'Не сопоставлена колонка «Название»':
    '«Nomi» ustuni moslanmagan',
  'Не сопоставлена колонка «Цена»':
    '«Narx» ustuni moslanmagan',
  'Не удалось прочитать файл. Ожидается .xlsx, .csv или .txt':
    'Faylni oʻqib boʻlmadi. .xlsx, .csv yoki .txt kutiladi',
  'Недостаточно кредитного лимита: доступно ${Math.floor(available)}. Подайте заявку на финансирование.':
    'Kredit limiti yetarli emas: mavjud {1}. Moliyalashtirishga ariza bering.',
  'Недостаточно кредитного лимита: его уже занял другой заказ. Обновите страницу.':
    'Kredit limiti yetarli emas: uni boshqa buyurtma band qildi. Sahifani yangilang.',
  'Недостаточно на складе: «${p.name}»':
    'Omborda yetarli emas: «{1}»',
  'Недостаточно прав':
    'Huquqlar yetarli emas',
  'Нельзя оставить организацию без владельца':
    'Tashkilotni egasiz qoldirib boʻlmaydi',
  'Нельзя удалить единственного владельца':
    'Yagona egani oʻchirib boʻlmaydi',
  'Неподдерживаемый адрес push-подписки':
    'Push-obuna manzili qoʻllab-quvvatlanmaydi',
  'Нет доступа':
    'Ruxsat yoʻq',
  'Нет доступа к этому офферу':
    'Bu taklifga ruxsat yoʻq',
  'Нет строк для импорта':
    'Import uchun qatorlar yoʻq',
  'Нет счёта для подписания':
    'Imzolash uchun hisob-faktura yoʻq',
  'Новый пароль слишком короткий':
    'Yangi parol juda qisqa',
  'Онлайн-оплата этим способом пока не подключена. Оплатите заказ переводом по счёту продавца.':
    'Bu usulda onlayn toʻlov hali ulanmagan. Buyurtmani sotuvchi hisobiga pul oʻtkazish orqali toʻlang.',
  'Отзыв можно оставить только после подтверждённой покупки':
    'Sharhni faqat tasdiqlangan xariddan keyin qoldirish mumkin',
  'Отсрочка и рассрочка доступны только авторизованным покупателям':
    'Muddatli va boʻlib toʻlash faqat tizimga kirgan xaridorlar uchun mavjud',
  'Оффер не найден':
    'Taklif topilmadi',
  'Пароль должен быть не короче 8 символов.':
    'Parol kamida 8 ta belgidan iborat boʻlishi kerak.',
  'Пароль неверен':
    'Parol notoʻgʻri',
  'По заказу несколько счетов — укажите продавца: ${candidates.map((inv) => inv.sellerId).join(\', \')}':
    'Buyurtma boʻyicha bir nechta hisob-faktura bor — sotuvchini koʻrsating: {1}',
  'По запросу уже есть заказ — удалить нельзя':
    'Soʻrov boʻyicha buyurtma allaqachon bor — oʻchirib boʻlmaydi',
  'Победитель уже выбран':
    'Gʻolib allaqachon tanlangan',
  'Подписка не найдена':
    'Obuna topilmadi',
  'Подпишите счёт-фактуру ЭЦП в кабинете Didox, затем нажмите «Обновить» — статус подтянется сюда.':
    'Hisob-fakturani Didox kabinetida ERI bilan imzolang, soʻng «Yangilash»ni bosing — holat bu yerda yangilanadi.',
  'Подтверждение неверно. Ожидается confirm="RESET_DEMO_DATA".':
    'Tasdiq notoʻgʻri. confirm="RESET_DEMO_DATA" kutiladi.',
  'Позиция не найдена в запросе':
    'Pozitsiya soʻrovda topilmadi',
  'Позиция указана дважды':
    'Pozitsiya ikki marta koʻrsatilgan',
  'Покупатель с таким email не зарегистрирован':
    'Bunday email bilan xaridor roʻyxatdan oʻtmagan',
  'Пользователь с таким email не зарегистрирован':
    'Bunday email bilan foydalanuvchi roʻyxatdan oʻtmagan',
  'Пользователь уже состоит в организации':
    'Foydalanuvchi allaqachon tashkilot aʼzosi',
  'Предложение для «${p.name}» не найдено':
    '«{1}» uchun taklif topilmadi',
  'Предложение для «${p.name}» недоступно':
    '«{1}» uchun taklif mavjud emas',
  'Приглашать владельцев и управляющих может только владелец организации':
    'Egalar va boshqaruvchilarni faqat tashkilot egasi taklif qilishi mumkin',
  'Приглашение не найдено':
    'Taklifnoma topilmadi',
  'Приглашение этому пользователю уже отправлено':
    'Bu foydalanuvchiga taklifnoma allaqachon yuborilgan',
  'Пустая или некорректная подпись':
    'Imzo boʻsh yoki notoʻgʻri',
  'Слишком много строк: максимум ${MAX_ROWS} за раз':
    'Qatorlar juda koʻp: bir martada koʻpi bilan {1}',
  'Сначала выйдите из текущей организации':
    'Avval joriy tashkilotdan chiqing',
  'Сначала отправьте счёт-фактуру в Didox (ЭДО)':
    'Avval hisob-fakturani Didox (EHF) ga yuboring',
  'Срок годности партии «${p.name}» истёк':
    '«{1}» partiyasining yaroqlilik muddati tugagan',
  'Ссылка недействительна или устарела. Запросите новую.':
    'Havola yaroqsiz yoki eskirgan. Yangisini soʻrang.',
  'Статус заказа уже изменён — обновите страницу':
    'Buyurtma holati allaqachon oʻzgargan — sahifani yangilang',
  'Статус уже изменён — обновите страницу':
    'Holat allaqachon oʻzgargan — sahifani yangilang',
  'Стоимость доставки нельзя изменить: заказ уже оплачен. Сумма к оплате осталась бы прежней, а документы разошлись бы с платежом.':
    'Yetkazib berish narxini oʻzgartirib boʻlmaydi: buyurtma allaqachon toʻlangan. Toʻlov summasi oʻzgarmay qolar, hujjatlar esa toʻlov bilan mos kelmay qolardi.',
  'Стоимость доставки нельзя изменить: по заказу выставлен счёт. Сумма к оплате осталась бы прежней, а документы разошлись бы с платежом.':
    'Yetkazib berish narxini oʻzgartirib boʻlmaydi: buyurtma boʻyicha hisob-faktura chiqarilgan. Toʻlov summasi oʻzgarmay qolar, hujjatlar esa toʻlov bilan mos kelmay qolardi.',
  'Счёт-фактура уже отправляется — обновите страницу через минуту':
    'Hisob-faktura allaqachon yuborilmoqda — bir daqiqadan soʻng sahifani yangilang',
  'Счёт-фактура по вашей части уже отправлена в ЭДО — сначала отзовите её':
    'Sizning qismingiz boʻyicha hisob-faktura EHFga allaqachon yuborilgan — avval uni qaytarib oling',
  'Тариф не найден':
    'Tarif topilmadi',
  'Текущий пароль неверен':
    'Joriy parol notoʻgʻri',
  'Товар не найден':
    'Mahsulot topilmadi',
  'Требуются email, password и fullName.':
    'email, password va fullName talab qilinadi.',
  'Укажите имя и телефон для оформления заказа':
    'Buyurtma berish uchun ism va telefonni koʻrsating',
  'Укажите цену по каждой позиции запроса':
    'Soʻrovning har bir pozitsiyasi boʻyicha narxni koʻrsating',
  'Укажите цену: общей суммой или по позициям':
    'Narxni koʻrsating: umumiy summada yoki pozitsiyalar boʻyicha',
  'Участвовать в тендерах можно после проверки аккаунта продавца':
    'Tenderlarda sotuvchi akkaunti tekshirilgandan keyin qatnashish mumkin',
  'Участник не найден':
    'Aʼzo topilmadi',
  'Файл больше 2 МБ — сожмите фото и попробуйте снова':
    'Fayl 2 MB dan katta — rasm hajmini kichraytirib, qayta urinib koʻring',
  'Файл не найден':
    'Fayl topilmadi',
  'Файл не получен':
    'Fayl qabul qilinmadi',
  'Файл пустой':
    'Fayl boʻsh',
  'Электронные счета-фактуры (Didox) пока не подключены. Выпишите счёт-фактуру в своём кабинете Didox.':
    'Elektron hisob-fakturalar (Didox) hali ulanmagan. Hisob-fakturani oʻz Didox kabinetingizda rasmiylashtiring.',
  'Это не ваш оффер':
    'Bu sizning taklifingiz emas',
  'Этот продавец сейчас не принимает заказы — выберите другую котировку':
    'Bu sotuvchi hozir buyurtma qabul qilmayapti — boshqa narx taklifini tanlang',
  'Юрлицо не найдено среди ваших':
    'Yuridik shaxs sizning roʻyxatingizda topilmadi',
};
