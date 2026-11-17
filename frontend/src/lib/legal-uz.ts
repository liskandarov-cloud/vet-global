// Hujjatlarning oʻzbekcha matni — legal.ts dagi ruscha matnning tarjima
// loyihasi. Kvadrat qavsdagi joylarni yurist toʻldiradi; tarjimani
// rekvizitlar bilan birga ona tilida soʻzlashuvchi yurist tekshirishi kerak.
// Ruscha matn oʻzgarsa, bu yerda ham oʻzgartiriladi.

import type { LegalDocKey } from './legal';

const OPERATOR = '[VetHub operatori boʻlgan yuridik shaxsning toʻliq nomi]';
const OPERATOR_DETAILS =
  '[STIR], [yuridik manzil], [bank rekvizitlari]; murojaatlar uchun manzil — [murojaatlar uchun email], telefon — [telefon]';

export const LEGAL_SECTIONS_UZ: Record<LegalDocKey, { h: string; p: string[] }[]> = {
  terms: [
    {
      h: '1. Umumiy qoidalar',
      p: [
        `Ushbu kelishuv https://vethub.uz manzilida joylashgan VetHub platformasidan (keyingi oʻrinlarda — Platforma) foydalanishni tartibga soladi. Platforma operatori — ${OPERATOR} (keyingi oʻrinlarda — Operator).`,
        'Platforma — sotuvchilar (veterinariya preparatlari, ozuqa, vaksinalar va uskunalar importchilari, distribyutorlari va ishlab chiqaruvchilari) takliflarini joylashtiradigan, xaridorlar (tashkilotlar, yakka tartibdagi tadbirkorlar, fermer xoʻjaliklari, veterinariya klinikalari) esa buyurtma beradigan axborot maydonchasi.',
        'Platformada roʻyxatdan oʻtish foydalanuvchining ushbu kelishuv va Maxfiylik siyosati shartlarini toʻliq qabul qilganini bildiradi. Shartlarga rozi boʻlmasangiz, roʻyxatdan oʻtmang va Platformadan foydalanmang.',
      ],
    },
    {
      h: '2. Roʻyxatdan oʻtish va hisob',
      p: [
        'Foydalanuvchi oʻzi va vakillik qiladigan tashkilot haqida haqqoniy maʼlumot koʻrsatadi va ularni dolzarb holatda saqlaydi.',
        'Foydalanuvchi parolning sir saqlanishi va oʻz hisobi orqali amalga oshirilgan barcha harakatlar uchun javob beradi. Begona shaxs kirganiga shubha boʻlsa, parolni almashtirish kerak — bunda boshqa qurilmalardagi barcha avvalgi kirishlar toʻxtatiladi.',
        'Hisob tashkilot nomidan boʻlishi mumkin; tashkilot xodimlari uning egasi belgilagan rollar va limitlar bilan kirish huquqini oladi.',
        'Sotuvchi faoliyat huquqini tasdiqlovchi hujjatlari Operator tomonidan tekshirilgandan keyingina sotish imkoniyatiga ega boʻladi (Sotuvchilar uchun shartlarga qarang).',
      ],
    },
    {
      h: '3. Operatorning roli va oldi-sotdi shartnomasi',
      p: [
        'Tovarning oldi-sotdi shartnomasi xaridor va sotuvchi oʻrtasida tuziladi. Tovarning sifati, butligi, yaroqlilik muddati va muomalasining qonuniyligi, shuningdek hisob va hisobvaraq-faktura berish uchun sotuvchi javob beradi.',
        '[Hisob-kitob sxemasi: Operator tovar uchun pul mablagʻlarini qabul qilmaydi / Operator toʻlovni sotuvchining agenti sifatida qabul qiladi — hisob-kitob boʻyicha qarordan keyin tanlab, tavsiflash.]',
        'Operator sotuvchilarning hujjatlarini tekshiradi, sharhlarni moderatsiya qiladi va ushbu kelishuvni yoki qonunchilikni buzgan foydalanuvchining kirishini cheklashi mumkin.',
      ],
    },
    {
      h: '4. Buyurtmalar, narxlar va toʻlov',
      p: [
        'Narxlar, yetkazib berish shartlari, minimal partiyalar va yetkazib berish tariflarini sotuvchi belgilaydi. Shartnomaviy va hajmga bogʻliq narxlar buyurtma rasmiylashtirilganda avtomatik qoʻllanadi.',
        'Tovar mavjud boʻlmasa, buyurtma oldindan buyurtma sifatida rasmiylashtiriladi; yetkazib berish muddati sotuvchi bilan kelishiladi.',
        'Toʻlov ushbu buyurtma uchun mavjud usullar bilan amalga oshiriladi: hisob boʻyicha bank oʻtkazmasi, toʻlov tizimlari orqali yoki tasdiqlangan kredit limiti doirasida (muddatli yoki boʻlib toʻlash).',
      ],
    },
    {
      h: '5. Veterinariya preparatlari',
      p: [
        'Sotuvchilar veterinariya preparatlari muomalasi uchun zarur ruxsatnomalarga ega boʻlishi va faqat Oʻzbekiston Respublikasida roʻyxatdan oʻtgan preparatlarni roʻyxatdan oʻtkazish raqami, seriyasi va yaroqlilik muddatini koʻrsatgan holda joylashtirishi shart.',
        'Retsept boʻyicha beriladigan preparatlar qonunchilikda belgilangan tartibda sotiladi. [Xaridorning retsept boʻyicha preparatlarni sotib olish huquqini tasdiqlash tartibi — yurist bilan belgilansin.]',
        'Platformadagi preparatlar haqidagi maʼlumotlar, jumladan veterinariya maslahatlari boʻlimidagi javoblar maʼlumot uchun boʻlib, veterinariya shifokori tayinlovining oʻrnini bosmaydi. Preparatlarni qoʻllash — xaridor javobgarligida va mutaxassis nazorati ostida.',
      ],
    },
    {
      h: '6. Sharhlar va foydalanuvchi materiallari',
      p: [
        'Sharhni faqat ushbu tovarga buyurtmasi sotuvchi tomonidan tasdiqlangan xaridor qoldirishi mumkin; sharhlar moderatsiyadan keyin eʼlon qilinadi. Operator haqorat, reklama, uchinchi shaxslarning shaxsga doir maʼlumotlari yoki ataylab yolgʻon maʼlumot boʻlgan sharhni eʼlon qilmaslik yoki oʻchirish huquqiga ega.',
        'Materiallarni (tavsiflar, rasmlar, hujjatlar) joylashtirib, foydalanuvchi ularga huquqi borligini tasdiqlaydi va Operatorga ularni Platformada koʻrsatishga ruxsat beradi.',
      ],
    },
    {
      h: '7. VetPoints ballari',
      p: [
        'Toʻlangan buyurtmalar uchun xaridorga VetPoints bonus ballari hisoblanadi; ular bilan keyingi buyurtmalarning bir qismini Platformada koʻrsatilgan chegarada toʻlash mumkin. Ballar pul mablagʻi hisoblanmaydi, pulga almashtirilmaydi va boshqa shaxslarga berilmaydi.',
        'Operator ballarni hisoblash va hisobdan chiqarish qoidalarini yangi qoidalarni Platformada eʼlon qilgan holda oʻzgartirish huquqiga ega.',
      ],
    },
    {
      h: '8. Javobgarlik',
      p: [
        'Operator Platformaning ishlashini taʼminlaydi, biroq uning uzluksizligini kafolatlamaydi va ishdagi uzilishlar, sotuvchilar, xaridorlar yoki uchinchi shaxslarning harakatlari natijasida yetkazilgan zararlar uchun javob bermaydi.',
        'Operatorning foydalanuvchi oldidagi javobgarligi har qanday holatda [cheklov miqdori — yurist bilan belgilansin] bilan cheklanadi.',
      ],
    },
    {
      h: '9. Shaxsga doir maʼlumotlar',
      p: ['Foydalanuvchilarning shaxsga doir maʼlumotlari Platformada joylashtirilgan Maxfiylik siyosatiga muvofiq qayta ishlanadi.'],
    },
    {
      h: '10. Shartlarning oʻzgarishi va nizolarni hal qilish',
      p: [
        'Operator ushbu kelishuvni oʻzgartirishi mumkin; yangi tahrir Platformada eʼlon qilingan paytdan kuchga kiradi. Tahrir sanasi ushbu sahifada koʻrsatilgan.',
        'Tomonlar munosabatlariga Oʻzbekiston Respublikasi qonunchiligi qoʻllaniladi. Nizolar muzokaralar yoʻli bilan, kelishuvga erishilmasa — Operator joylashgan joydagi sudda hal qilinadi.',
      ],
    },
    {
      h: '11. Operator rekvizitlari',
      p: [`${OPERATOR}; ${OPERATOR_DETAILS}.`],
    },
  ],

  privacy: [
    {
      h: '1. Umumiy qoidalar',
      p: [
        `Ushbu siyosat VetHub platformasi (https://vethub.uz) foydalanuvchilarining shaxsga doir maʼlumotlarini «Shaxsga doir maʼlumotlar toʻgʻrisida»gi Oʻzbekiston Respublikasi Qonuniga muvofiq qayta ishlash va himoya qilish tartibini belgilaydi. Shaxsga doir maʼlumotlar egasi va operatori — ${OPERATOR}; ${OPERATOR_DETAILS}.`,
        'Roʻyxatdan oʻtib, foydalanuvchi oʻz shaxsga doir maʼlumotlarini ushbu siyosat shartlarida qayta ishlashga rozilik beradi.',
      ],
    },
    {
      h: '2. Qanday maʼlumotlarni qayta ishlaymiz',
      p: [
        'Hisob maʼlumotlari: familiya, ism, elektron pochta manzili, telefon raqami, kompaniya nomi, STIR, Platformadagi rol; parol faqat qaytarib boʻlmaydigan xesh koʻrinishida saqlanadi.',
        'Xaridor-tashkilotlar maʼlumotlari: nomi, STIR, MFO, hisob raqami, manzil; tashkilot xodimlari va ularning rollari.',
        'Sotuvchilar maʼlumotlari: hisoblar uchun bank rekvizitlari, kompaniya haqidagi maʼlumotlar, faoliyat huquqini tasdiqlovchi hujjatlar (litsenziyalar, sertifikatlar).',
        'Buyurtmalar maʼlumotlari: tarkibi va summalari, yetkazib berish manzili va shartlari, qabul qiluvchining telefoni, hisoblar, toʻlovlar, sharhlar.',
        'Murojaatlar: veterinariya maslahati, xaridlarni moliyalashtirish uchun arizalar, qoʻllab-quvvatlash xizmatiga xabarlar.',
        'Texnik maʼlumotlar: server jurnallaridagi IP-manzil va brauzer haqidagi maʼlumotlar, push-bildirishnomalarga obunalar.',
      ],
    },
    {
      h: '3. Ularni nima uchun qayta ishlaymiz',
      p: [
        'Roʻyxatdan oʻtish, kirish va kirishni tiklash; buyurtmalarni rasmiylashtirish va bajarish, shu jumladan yetkazib berish va hujjatlarni rasmiylashtirish uchun zarur boʻlgan xaridor maʼlumotlarini sotuvchiga uzatish; hisoblar va elektron hisobvaraq-fakturalarni berish; buyurtmalar haqida pochta, SMS, push va Telegram orqali bildirishnomalar; sotuvchilarni tekshirish; moliyalashtirish arizalarini koʻrib chiqish; Platforma xavfsizligini taʼminlash; qonunchilik talablarini bajarish.',
      ],
    },
    {
      h: '4. Maʼlumotlarni kimga uzatamiz',
      p: [
        'Sotuvchi va xaridorga — aniq buyurtmani bajarish uchun zarur hajmda.',
        'Platforma ishlashini taʼminlaydigan xizmat koʻrsatuvchilarga: hosting va sayt yetkazib berish, xat va SMS yuborish (Eskiz), toʻlov tizimlari (Payme, Click, Uzum), elektron hujjat aylanishi operatori (Didox) — faqat oʻz vazifasini bajarish uchun.',
        'Davlat organlariga — qonunchilikda nazarda tutilgan hollarda.',
        'Biz shaxsga doir maʼlumotlarni sotmaymiz va uchinchi shaxslar reklamasi uchun uzatmaymiz.',
      ],
    },
    {
      h: '5. Maʼlumotlar qayerda saqlanadi',
      p: [
        '[Saqlash joyi: Oʻzbekiston Respublikasi fuqarolarining shaxsga doir maʼlumotlar bazalari Oʻzbekiston hududidagi serverlarda joylashtirilishi va Shaxsga doir maʼlumotlar bazalari davlat reyestrida roʻyxatdan oʻtkazilishi shart («Shaxsga doir maʼlumotlar toʻgʻrisida»gi Qonunning 27¹-moddasi). Hosting boʻyicha qarordan keyin serverlarning haqiqiy joylashuvi va roʻyxatdan oʻtkazish raqami koʻrsatilsin.]',
      ],
    },
    {
      h: '6. Maʼlumotlarni qancha saqlaymiz',
      p: [
        'Hisob maʼlumotlari — hisob amal qilgan davrda. Buyurtmalar, hisoblar va toʻlovlar haqidagi maʼlumotlar — buxgalteriya hisobi va soliq toʻgʻrisidagi qonunchilikda belgilangan muddatlarda. Server jurnallari — [muddat] kundan oshmagan muddatda.',
      ],
    },
    {
      h: '7. Sizning huquqlaringiz',
      p: [
        'Siz bizda maʼlumotlaringiz mavjudligini bilish va ularni qayta ishlash haqida maʼlumot olish, maʼlumotlarni aniqlashtirish, bloklash yoki oʻchirishni talab qilish, shuningdek qayta ishlashga rozilikni qaytarib olish huquqiga egasiz. Maʼlumotlarning katta qismini shaxsiy kabinetda oʻzgartirish mumkin; boshqa soʻrovlar uchun [murojaatlar uchun email] manziliga yozing. Rozilikni kabinetda hisobni oʻchirib qaytarib olish mumkin (Profil → Hisobni oʻchirish): ism, telefon, pochta, rekvizitlar va saralanganlar oʻchiriladi, kirish yopiladi, buyurtmalar, hisoblar va toʻlovlar esa shaxssizlashtirilgan holda qoladi, chunki ularni saqlashni qonun talab qiladi.',
      ],
    },
    {
      h: '8. Maʼlumotlarni qanday himoya qilamiz',
      p: [
        'Platforma bilan ulanish shifrlanadi (HTTPS); parollar faqat xesh koʻrinishida saqlanadi; maʼlumotlarga kirish rollar boʻyicha cheklangan; parolni tiklash havolalari bir martalik va bir soat amal qiladi; parolni almashtirish barcha avvalgi kirishlarni toʻxtatadi; maʼlumotlar bazasi har kuni zaxiralanadi.',
      ],
    },
    {
      h: '9. Cookie va brauzer xotirasi',
      p: [
        'Platforma brauzerda kirish kaliti, savat tarkibi, tanlangan til va bezak mavzusini saqlaydi. Ularsiz kirish va savat ishlamaydi. Tashriflar soni cookie ishlatmaydigan va tashrif buyuruvchini saytlar oʻrtasida kuzatmaydigan Cloudflare Web Analytics xizmati orqali hisoblanadi. Platforma uchinchi tomon reklama cookie fayllaridan foydalanmaydi.',
      ],
    },
    {
      h: '10. Siyosatning oʻzgarishi',
      p: ['Biz ushbu siyosatni oʻzgartirishimiz mumkin; yangi tahrir eʼlon qilingan paytdan kuchga kiradi. Tahrir sanasi ushbu sahifada koʻrsatilgan.'],
    },
  ],

  sellers: [
    {
      h: '1. Kim sotishi mumkin',
      p: [
        'Platformada tegishli tovarlar muomalasi uchun qonunchilik talab qiladigan ruxsatnomalarga ega yuridik shaxslar va yakka tartibdagi tadbirkorlar sotishi mumkin (veterinariya preparatlari uchun — [litsenziya / ruxsatnoma turi yurist bilan aniqlansin]).',
        'Hujjatlar Operator tomonidan tekshirilgunga qadar sotuvchining tovarlari xaridorlarga koʻrsatilmaydi. Operator qoʻshimcha hujjatlarni soʻrashi va sabab koʻrsatmasdan ruxsat berishni rad etishi mumkin.',
      ],
    },
    {
      h: '2. Takliflarga qoʻyiladigan talablar',
      p: [
        'Sotuvchi faqat sotish huquqiga ega boʻlgan tovarlarni haqqoniy narxlar, qoldiqlar, qadoqlash va minimal partiyalar bilan joylashtiradi. Veterinariya preparatlari uchun roʻyxatdan oʻtkazish raqami, seriyasi va yaroqlilik muddati koʻrsatiladi; retsept boʻyicha beriladigan preparatlar alohida belgilanadi.',
        'Elektron hisobvaraq-faktura va fiskal chek berish uchun tovarda MXIK kodi koʻrsatilishi kerak.',
        '1C yoki fayldan yuklangan narx va qoldiqlarni sotuvchi dolzarb holatda saqlashi shart. Integratsiya kaliti — sotuvchining maxfiy maʼlumoti.',
      ],
    },
    {
      h: '3. Komissiya',
      p: [
        'Platforma komissiyasi buyurtmadagi tovarlar qiymatining 12 foizini tashkil etadi. Komissiya xaridor VetPoints ballarini hisobdan chiqarishidan oldingi summadan hisoblanadi: ballar Platformaning sodiqlik vositasi boʻlib, komissiya bazasini kamaytirmaydi.',
        '[Komissiyani toʻlash tartibi va muddatlari, hujjatlar (dalolatnoma, hisobvaraq-faktura), soliqqa tortish — hisob-kitob sxemasi boʻyicha qarordan keyin yurist va buxgalter bilan belgilansin.]',
      ],
    },
    {
      h: '4. Buyurtmalarni bajarish',
      p: [
        'Sotuvchi buyurtmani tasdiqlaydi, hisob va hisobvaraq-faktura beradi, tovarni kelishilgan muddatda joʻnatadi va Platformada buyurtma holatini yangilaydi. Sotuvchi xaridor oldida tovarning sifati va qonuniyligi uchun javob beradi.',
      ],
    },
    {
      h: '5. Qoidabuzarliklar',
      p: [
        'Notoʻgʻri maʼlumot joylashtirish, roʻyxatdan oʻtmagan yoki muddati oʻtgan preparatlarni sotish, buyurtmalarni muntazam bajarmaslik uchun Operator sotuvchining takliflarini yashirish yoki uning hisobini bloklash huquqiga ega.',
      ],
    },
  ],
};
