// Hujjatlarning oʻzbekcha matni — legal.ts dagi ruscha matnning tarjimasi.
// Boʻlimlar va xatboshilar ruscha matn bilan birma-bir mos boʻlishi shart
// (legal.test.ts tekshiradi). Ruscha matn oʻzgarsa, bu yerda ham
// oʻzgartiriladi. Kvadrat qavsda — kodda yoʻq faktlar (operator rekvizitlari,
// shaxsiy maʼlumotlar bazasini roʻyxatdan oʻtkazish raqami).

import type { LegalDocKey } from './legal';

const OPERATOR = 'VetHub';
const OPERATOR_DETAILS =
  '[VetHub operatori boʻlgan yuridik shaxsning toʻliq nomi], [STIR], [yuridik manzil], [bank rekvizitlari]; murojaatlar uchun manzil — info@vethub.uz';

export const LEGAL_SECTIONS_UZ: Record<LegalDocKey, { h: string; p: string[] }[]> = {
  terms: [
    {
      h: '1. Umumiy qoidalar',
      p: [
        `Ushbu hujjat — ${OPERATOR} (keyingi oʻrinlarda — Operator) ning https://vethub.uz manzilidagi VetHub platformasi, uning mobil versiyasi, Telegram-boti va dasturiy interfeyslaridan (keyingi oʻrinlarda — Platforma) foydalanuvchi har qanday shaxsga qaratilgan ommaviy ofertasi. Hujjat Platformadan foydalanish, buyurtmalarni rasmiylashtirish va toʻlash shartlarini belgilaydi.`,
        'Ofertaning aksepti — ushbu shartlarga roziligini belgilagan holda Platformada roʻyxatdan oʻtish yoki roʻyxatdan oʻtmasdan buyurtma rasmiylashtirish. Aksept shartlarning toʻliq va soʻzsiz qabul qilinishini bildiradi; foydalanuvchi va Operator oʻrtasidagi shartnoma Oʻzbekiston Respublikasining elektron tijorat toʻgʻrisidagi qonunchiligiga muvofiq elektron shaklda tuzilgan hisoblanadi.',
        'Ushbu ofertaning ajralmas qismlari — Maxfiylik siyosati, sotuvchilar uchun esa Sotuvchilar uchun oferta ham. Barcha hujjatlar Platformaning har bir sahifasi pastidagi havolalar orqali mavjud; amaldagi tahrir sanasi hujjat sahifasida koʻrsatilgan.',
        'Platforma tadbirkorlik maqsadidagi xaridlar uchun moʻljallangan: yuridik shaxslar, yakka tartibdagi tadbirkorlar, fermer va dehqon xoʻjaliklari, veterinariya klinikalari va dorixonalar uchun. Agar xaridor tovarni shaxsiy ehtiyoji uchun sotib olayotgan jismoniy shaxs boʻlsa, munosabatlarga isteʼmolchilar huquqlarini himoya qilish toʻgʻrisidagi qonunchilik shartnoma bilan oʻzgartirib boʻlmaydigan qismida qoʻllaniladi.',
      ],
    },
    {
      h: '2. Atamalar',
      p: [
        'Sotuvchi — Operator tekshiruvidan oʻtgan va Platformada veterinariya preparatlari, vaksinalar, ozuqalar, ozuqa qoʻshimchalari, uskunalar va tegishli tovarlarni sotish boʻyicha takliflar joylashtiradigan yuridik shaxs yoki yakka tartibdagi tadbirkor.',
        'Xaridor — Platformada buyurtma rasmiylashtiruvchi shaxs. Tashkilot — xaridorning «egasi», «boshqaruvchi» va «xarid qiluvchi» rollariga ega bir nechta xodimlari ishlaydigan hisob qaydnomasi.',
        'Taklif — sotuvchining aniq tovar boʻyicha shartlari: narx, qadoq, minimal partiya, qoldiq, seriya va yaroqlilik muddati. Buyurtma — xaridorning bir yoki bir nechta sotuvchi takliflari boʻyicha tovar sotib olish arizasi. Shaxsiy kabinet — kirishdan keyin ochiladigan Platforma boʻlimi.',
      ],
    },
    {
      h: '3. Roʻyxatdan oʻtish, hisob qaydnomasi va tashkilot',
      p: [
        'Foydalanuvchi oʻzi va vakili boʻlgan tashkilot haqida ishonchli maʼlumotlarni (nomi, STIR, aloqa maʼlumotlari) koʻrsatadi va ular oʻzgarganda yangilaydi. Operator ushbu maʼlumotlarni tasdiqlovchi hujjatlarni soʻrashga haqli.',
        'Parol kamida 8 belgidan iborat boʻlishi kerak. Foydalanuvchi parolning saqlanishi va oʻz hisob qaydnomasi ostida bajarilgan barcha harakatlar uchun javobgar. Kirishni tiklash bir soat amal qiladigan bir martalik havola orqali amalga oshiriladi; parolni almashtirish boshqa qurilmalardagi barcha oldingi kirishlarni tugatadi.',
        'Tashkilot egasi xodimlarni taklif qiladi, ularga rollar va xarid limitlarini belgilaydi. Xarid qiluvchining limitidan oshgan summadagi buyurtmasi faqat ega yoki boshqaruvchi kelishganidan keyin bajariladi; kelishilgunga qadar sotuvchi bunday buyurtmani ishga qabul qilmaydi, toʻlov esa mavjud boʻlmaydi. Xodimlarning berilgan huquqlar doirasidagi harakatlari tashkilotning harakatlari hisoblanadi.',
        'Buyurtmada toʻlovchi sifatida faqat rekvizitlari foydalanuvchining oʻzi tomonidan hisob qaydnomasiga kiritilgan yuridik shaxs koʻrsatilishi mumkin. Boshqa shaxsning rekvizitlarini koʻrsatish taqiqlanadi.',
      ],
    },
    {
      h: '4. Operatorning roli',
      p: [
        'Operator axborot maydonchasi va xizmatlarni taqdim etadi: takliflar katalogi va ularni solishtirish, buyurtmalarni rasmiylashtirish, narx soʻrovlari, hujjatlar, bildirishnomalar, shuningdek sotuvchilar topshirigʻiga koʻra onlayn toʻlovni qabul qiladi (6-boʻlim). Operator Platformada joylashtirilgan tovarlarning sotuvchisi hisoblanmaydi.',
        'Oldi-sotdi (yetkazib berish) shartnomasi xaridor va sotuvchi oʻrtasida tuziladi va sotuvchi buyurtmani tasdiqlagan paytdan boshlab tuzilgan hisoblanadi. Sotuvchi tovarning sifati, butligi, yaroqlilik muddati va muomalasining qonuniyligi, u haqidagi maʼlumotlarning ishonchliligi, shuningdek hisob, hisob-faktura va kuzatuv hujjatlarini taqdim etish uchun javobgar.',
        'Operator sotuvchini savdoga qoʻyishda uning hujjatlarini tekshiradi, sharhlarni moderatsiya qiladi va ushbu shartlarni yoki qonunchilikni buzgan foydalanuvchining kirishini cheklashga haqli. Operator tovarning har bir partiyasini tekshirmaydi va tovarning sotuvchi joylashtirgan tavsifga mosligini kafolatlamaydi.',
      ],
    },
    {
      h: '5. Buyurtma',
      p: [
        'Xaridor tovarlar, yetkazib berish usuli, toʻlovchi va toʻlov usulini tanlaydi. Narxlar Platforma tomonidan rasmiylashtirish paytida sotuvchining hajmli chegirmalari, shartnomaviy narxlari va aksiyalarini hisobga olgan holda hisoblanadi; buyurtmaning yakuniy summasi xaridor uni tasdiqlashidan oldin koʻrsatiladi.',
        'Bir nechta sotuvchining tovarlari boʻlgan buyurtma har bir sotuvchi tomonidan oʻz qismida bajariladi: har bir sotuvchi oʻz hujjatlarini taqdim etadi va oʻz pozitsiyalari uchun mustaqil javob beradi.',
        'Sotuvchi tovar mavjudligini va yetkazib berish muddatlarini tasdiqlaydi. «Buyurtma asosida» pozitsiyalar oldindan buyurtma sifatida rasmiylashtiriladi: toʻlov mavjudlik tasdiqlangandan keyin ochiladi. Tovar boʻlmaganda sotuvchi buyurtmani rad etishga haqli; xaridor bildirishnoma oladi, toʻlangan summa qaytariladi.',
        'Xaridor narx soʻrovi (tender) joylashtirishi mumkin: sotuvchilar oʻz takliflarini yuboradi, gʻolibni tanlash esa tanlangan taklif shartlarida buyurtma yaratadi. Sotuvchining tenderdagi taklifi soʻrov muddati tugaguncha amal qiladi.',
        'Xaridor avtobuyurtmani — bir xil buyurtmani jadval boʻyicha muntazam rasmiylashtirishni sozlashi mumkin. Avtobuyurtma shaxsiy kabinetda navbatdagi rasmiylashtirish sanasigacha oʻchiriladi.',
        'Joʻnatilgunga qadar xaridor Platforma orqali sotuvchiga yoki info@vethub.uz manziliga murojaat qilib, buyurtmadan voz kechishi mumkin; bekor qilishni sotuvchi yoki Operator rasmiylashtiradi. Joʻnatilgandan keyin 9-boʻlim qoidalari amal qiladi.',
      ],
    },
    {
      h: '6. Narxlar va toʻlov',
      p: [
        'Narxlar soʻmda koʻrsatiladi. Agar sotuvchi QQS toʻlovchisi boʻlsa, narx QQSni oʻz ichiga oladi, uning summasi esa hisob-fakturada ajratib koʻrsatiladi. Yetkazib berish narxi sotuvchining tariflari boʻyicha hisoblanadi va buyurtmada alohida koʻrsatiladi.',
        'Onlayn toʻlov (Payme, Click, Uzum) Operator tomonidan sotuvchining agenti sifatida — sotuvchi nomidan va uning hisobidan qabul qilinadi. Xaridorning toʻlov majburiyati pul mablagʻlari Operatorga kelib tushgan paytdan boshlab bajarilgan hisoblanadi. Onlayn toʻlovda tovarlarning MXIK kodlari koʻrsatilgan fiskal chek shakllantiriladi.',
        'Bank oʻtkazmasi orqali toʻlov sotuvchining hisobi boʻyicha bevosita uning hisob raqamiga amalga oshiriladi; xaridorning majburiyati mablagʻlar sotuvchining hisob raqamiga tushgan paytdan boshlab bajarilgan hisoblanadi.',
        'Sukut boʻyicha buyurtma oldindan toʻlanadi. Xaridor tashkilotida kelishuvni kutayotgan buyurtma kelishilgunga qadar toʻlanmaydi.',
        'Toʻlovni kechiktirish va boʻlib toʻlash sotuvchi tomonidan tijorat krediti shaklida yoki hamkor bank tomonidan alohida shartnoma boʻyicha, xaridor arizasi boʻyicha maʼqullangan limit doirasida taqdim etiladi. Operator qarz bermaydi. Toʻlovlar jadvali buyurtmada koʻrsatiladi. Toʻlov kechiktirilganda Operator kechiktirilgan toʻlovli yangi buyurtmalarni rasmiylashtirishni toʻxtatib turishga, sotuvchi esa qarzni qonunda belgilangan tartibda toʻlashni talab qilishga haqli.',
        'Toʻlangan buyurtma bekor qilinganda yoki daʼvo qanoatlantirilganda pul 10 bank kuni ichida toʻlov qanday usulda amalga oshirilgan boʻlsa, oʻsha usulda qaytariladi.',
        'Sotuvchi elektron hisob-fakturani elektron hujjat aylanishi operatori orqali taqdim etadi. Elektron raqamli imzo (E-IMZO) bilan imzolangan hujjatlar qogʻozdagi qoʻlda imzolangan hujjatlarga teng kuchga ega.',
      ],
    },
    {
      h: '7. Yetkazib berish va qabul qilish',
      p: [
        'Yetkazib berish usullari, narxi va muddatlarini (kuryer, transport kompaniyasi, olib ketish) sotuvchi oʻz tariflarida belgilaydi; agar sotuvchi chegara belgilagan boʻlsa, undan yuqori summada bepul yetkazib berish amal qiladi. Yetkazib berish muddati buyurtmani tasdiqlashda sotuvchi bilan kelishiladi.',
        'Mulk huquqi va tovarning tasodifan nobud boʻlishi yoki shikastlanishi xavfi tovar xaridorga yoki uning vakiliga topshirilgan paytda xaridorga oʻtadi.',
        'Qabul qilishda xaridor miqdorni, qadoqning butunligini, markirovkani, seriya va yaroqlilik muddatini, sovuq zanjir tovarlari uchun esa harorat rejimiga rioya qilinganligini (agar ishlab chiqaruvchi boshqasini belgilamagan boʻlsa, +2…+8 °C) tekshiradi. Nomuvofiqliklar qabul qilingan kuni dalolatnomada yoki Platformada qayd etiladi.',
        'Xaridor harorat rejimi buzilgan, qadogʻi shikastlangan, yaroqlilik muddati oʻtgan yoki kuzatuv hujjatlarisiz tovarni qabul qilishdan bosh tortishga haqli.',
      ],
    },
    {
      h: '8. Veterinariya preparatlari',
      p: [
        'Platformada faqat Oʻzbekiston Respublikasida roʻyxatdan oʻtgan veterinariya preparatlari joylashtiriladi. Sotuvchi roʻyxat raqami, seriya va yaroqlilik muddatini koʻrsatadi. Yaroqlilik muddati oʻtgan partiyalar Platformada sotilmaydi; agar yaroqlilik muddati tugashiga 90 kundan kam qolgan boʻlsa, taklif «Qisqa muddat» deb belgilanadi.',
        'Retseptli preparatlar Platformada belgilangan. Ularni veterinariya mutaxassisi yoki veterinariya faoliyatiga litsenziyasi boʻlgan tashkilotlar va yakka tartibdagi tadbirkorlar, shuningdek veterinariya shifokori tayinlovi boʻlgan xaridorlar sotib olishga haqli. Buyurtma rasmiylashtirib, xaridor bunday preparatlarni sotib olish huquqini tasdiqlaydi; sotuvchi tasdiqlovchi hujjatlarni soʻrashga va sotishni rad etishga, Operator esa bunday tovarlarga kirishni cheklashga haqli.',
        'Platformadagi preparatlar haqidagi maʼlumotlar, jumladan veterinariya maslahatlari boʻlimidagi javoblar maʼlumot xarakteriga ega va veterinariya shifokorining koʻrigi va tayinlovi oʻrnini bosmaydi.',
        'Xaridor saqlash shartlari va qoʻllash yoʻriqnomalariga, shuningdek hayvonlarni soʻyish va chorvachilik mahsulotlarini sotishdan oldingi kutish muddatlariga rioya etilishi uchun javobgar.',
      ],
    },
    {
      h: '9. Sifat, daʼvolar va qaytarish',
      p: [
        'Tovarning miqdori va tashqi koʻrinishi boʻyicha daʼvolar qabul qilishda bildiriladi. Yashirin kamchiliklar boʻyicha daʼvolar yaroqlilik muddati doirasida, lekin ular aniqlangan paytdan boshlab 10 kundan kechiktirmay bildiriladi. Daʼvo sotuvchiga Platforma orqali, nusxasi info@vethub.uz manziliga yuboriladi.',
        'Sotuvchi daʼvoni 10 kun ichida koʻrib chiqadi. Agar daʼvo asosli boʻlsa, sotuvchi xaridorning tanloviga koʻra tovarni almashtiradi, yetishmaganini yetkazib beradi yoki pulni qaytaradi.',
        'Lozim darajadagi sifatli veterinariya preparatlari, vaksinalar va ozuqa qoʻshimchalari, agar sotuvchi bilan boshqacha kelishilmagan boʻlsa, qaytarilmaydi va almashtirilmaydi: xaridorga topshirilgandan keyin ularning saqlash sharoitlari nazorat qilinmaydi.',
        'Operator nizoni hal qilishga koʻmaklashadi: tomonlardan tushuntirish soʻraydi va nizoli buyurtma boʻyicha sotuvchiga pul oʻtkazishni nizo hal boʻlgunga qadar toʻxtatib turishga haqli.',
      ],
    },
    {
      h: '10. VetPoints ballari',
      p: [
        'Yetkazib berilgan buyurtmalar uchun xaridorga keyingi buyurtmalarning bir qismini toʻlash mumkin boʻlgan VetPoints bonus ballari hisoblanadi. Hisoblash miqdori va ballar bilan toʻlash chegarasi Platformada koʻrsatilgan; ushbu tahrir sanasida — buyurtma summasining 1 % i va keyingi buyurtma summasining 10 % idan koʻp emas. Ballar pul mablagʻi hisoblanmaydi, pulga almashtirilmaydi, boshqa shaxslarga berilmaydi va hisob qaydnomasi oʻchirilganda bekor qilinadi.',
        'Operator ballarni hisoblash va hisobdan chiqarish qoidalarini kamida 14 kun oldin Platformada xabar berib oʻzgartirishga haqli. Oʻzgarishdan oldin hisoblangan ballar saqlanadi.',
      ],
    },
    {
      h: '11. Foydalanuvchilarning sharhlari va materiallari',
      p: [
        'Sharhni faqat ushbu tovarga buyurtmasi sotuvchi tomonidan tasdiqlangan xaridor qoldirishi mumkin; sharhlar moderatsiyadan keyin eʼlon qilinadi. Operator haqoratlar, reklama, uchinchi shaxslarning shaxsiy maʼlumotlari yoki ataylab yolgʻon maʼlumotlar mavjud sharhni eʼlon qilmaslik yoki oʻchirishga haqli.',
        'Materiallarni (tavsiflar, tasvirlar, hujjatlar) joylashtirib, foydalanuvchi ularga huquqi borligini tasdiqlaydi va Operatorga ularni joylashtirish muddati davomida Platformada bepul koʻrsatishga ruxsat beradi.',
      ],
    },
    {
      h: '12. Taqiqlangan harakatlar',
      p: [
        'Quyidagilar taqiqlanadi: notoʻgʻri maʼlumotlar va boshqa shaxslarning rekvizitlarini koʻrsatish; tashkilotning kelishuv va limit mexanizmlarini chetlab oʻtish; Operator roziligisiz Platforma maʼlumotlarini avtomatik vositalar bilan yigʻish; Platforma ishiga aralashish va boshqalarning maʼlumotlariga kirishga urinish; Platformadan roʻyxatdan oʻtmagan, qalbaki yoki taqiqlangan tovarlar muomalasi uchun foydalanish; boshqa foydalanuvchilarga reklama tarqatish.',
        'Buzilish holatida Operator Platformaga kirishni cheklash, takliflarni yashirish, tugallanmagan buyurtmalarni bekor qilish yoki hisob qaydnomasini bloklashga haqli va bu haqda foydalanuvchini elektron pochta orqali xabardor qiladi, Platforma yoki boshqa foydalanuvchilar xavfsizligiga tahdid holatlari bundan mustasno.',
      ],
    },
    {
      h: '13. Intellektual mulk',
      p: [
        'Platforma, uning dasturiy taʼminoti, dizayni va VetHub belgisiga boʻlgan huquqlar Operatorga tegishli. Foydalanuvchi shartnoma amal qilish muddati davomida Platformadan oʻz maqsadiga koʻra foydalanish uchun noeksklyuziv huquq oladi.',
      ],
    },
    {
      h: '14. Javobgarlik',
      p: [
        'Tomonlar majburiyatlarni bajarmaganlik uchun Oʻzbekiston Respublikasi qonunchiligiga muvofiq javobgar. Operator sotuvchi tomonidan oldi-sotdi shartnomasining bajarilishi, tovar sifati, tashuvchilar, banklar va toʻlov tizimlarining harakatlari, shuningdek oʻz nazoratidan tashqaridagi sabablarga koʻra Platforma ishidagi uzilishlar uchun javobgar emas. Rejali ishlar haqida Operator imkon qadar oldindan ogohlantiradi.',
        'Qabul qilingan pul mablagʻlarini oʻtkazish majburiyatidan tashqari, Operatorning javobgarligi haqiqiy zarar bilan cheklanadi va talab bogʻliq boʻlgan buyurtma boʻyicha Operator mukofoti summasidan, agar talab buyurtma bilan bogʻliq boʻlmasa — 1 000 000 soʻmdan oshmaydi. Cheklov qasddan qilingan buzilishga nisbatan qoʻllanilmaydi.',
        'Tomonlar boshqa tomonni asossiz kechiktirmasdan xabardor qilgan yengib boʻlmaydigan kuch holatlari tufayli majburiyatlarni bajarmaganlik uchun javobgarlikdan ozod qilinadi.',
      ],
    },
    {
      h: '15. Shaxsiy maʼlumotlar',
      p: ['Foydalanuvchilarning shaxsiy maʼlumotlari Platformada joylashtirilgan Maxfiylik siyosatiga muvofiq qayta ishlanadi.'],
    },
    {
      h: '16. Bildirishnomalar',
      p: [
        'Buyurtmalar haqidagi bildirishnomalar elektron pochta, SMS, push-bildirishnomalar va, agar foydalanuvchi ulagan boʻlsa, Telegram orqali yuboriladi. Yuridik ahamiyatga ega xabarlar hisob qaydnomasida koʻrsatilgan elektron pochtaga, Operatorga esa info@vethub.uz manziliga yuboriladi va yuborilgandan keyingi kuni olingan hisoblanadi.',
      ],
    },
    {
      h: '17. Amal qilish muddati, oʻzgartirish va bekor qilish',
      p: [
        'Shartnoma muddatsiz amal qiladi. Agar foydalanuvchida tugallanmagan buyurtmalar va qarz boʻlmasa, u shaxsiy kabinetda hisob qaydnomasini oʻchirib (Profil → Hisobni oʻchirish), shartnomani bekor qilishi mumkin.',
        'Operator Platformada yangi tahrirni eʼlon qilib, ushbu shartlarni oʻzgartirishga haqli. Muhim oʻzgarishlar haqida Operator kamida 7 kun oldin xabar beradi. Yangi tahrir kuchga kirgandan keyin Platformadan foydalanishni davom ettirish unga rozilikni bildiradi; roʻyxatdan oʻtishda foydalanuvchi qaysi tahrirni qabul qilgani qayd etiladi.',
      ],
    },
    {
      h: '18. Qoʻllaniladigan huquq va nizolar',
      p: [
        'Tomonlarning munosabatlariga Oʻzbekiston Respublikasi qonunchiligi qoʻllaniladi. Nizolar muzokaralar yoʻli bilan hal qilinadi; daʼvoga javob berish muddati — 30 kun. Agar nizo hal qilinmasa, u Operator joylashgan joydagi sudga, isteʼmolchi bilan nizo esa qonunda belgilangan sudlovlilik qoidalari boʻyicha sudga oshiriladi.',
      ],
    },
    {
      h: '19. Operator rekvizitlari',
      p: [`${OPERATOR}; ${OPERATOR_DETAILS}.`],
    },
  ],

  privacy: [
    {
      h: '1. Umumiy qoidalar',
      p: [
        `Ushbu siyosat Oʻzbekiston Respublikasining «Shaxsga doir maʼlumotlar toʻgʻrisida»gi Qonuniga muvofiq VetHub platformasi (https://vethub.uz, Telegram-bot va dasturiy interfeyslar, keyingi oʻrinlarda — Platforma) foydalanuvchilarining qanday shaxsiy maʼlumotlari, nima maqsadda qayta ishlanishi, kimga berilishi va qanday himoya qilinishini belgilaydi. Shaxsiy maʼlumotlarning mulkdori va operatori — ${OPERATOR}; ${OPERATOR_DETAILS}.`,
        'Roʻyxatdan oʻtib yoki buyurtma rasmiylashtirib, foydalanuvchi oʻz shaxsiy maʼlumotlarini ushbu siyosat shartlarida, jumladan ularni transchegaraviy uzatishni (5-boʻlim) qayta ishlashga rozilik beradi. Rozilikni qaytarib olish mumkin (7-boʻlim).',
      ],
    },
    {
      h: '2. Biz qanday maʼlumotlarni qayta ishlaymiz',
      p: [
        'Hisob qaydnomasi maʼlumotlari: familiya va ism, elektron pochta manzili, telefon raqami, kompaniya nomi, STIR, Platformadagi rol; parol faqat qaytarib boʻlmaydigan xesh koʻrinishida saqlanadi.',
        'Xaridor-tashkilotlar maʼlumotlari: nomi, STIR, MFO, hisob raqami, manzili; tashkilot xodimlari, ularning rollari va xarid limitlari.',
        'Sotuvchilar maʼlumotlari: kompaniya haqidagi maʼlumotlar, hisoblar uchun bank rekvizitlari, faoliyat huquqini tasdiqlovchi hujjatlar (litsenziyalar, sertifikatlar, preparatlarni roʻyxatdan oʻtkazish hujjatlari).',
        'Buyurtmalar maʼlumotlari: tarkibi va summalari, yetkazib berish manzili va shartlari, qabul qiluvchining aloqa telefoni, hisoblar, toʻlovlar, joʻnatmalar, sharhlar, narx soʻrovlari, avtobuyurtmalar.',
        'Murojaatlar: veterinariya maslahati, xaridlarni moliyalashtirish uchun arizalar (arizani koʻrib chiqish uchun zarur boʻlgan xaridlar va aylanma haqidagi maʼlumotlar bilan), qoʻllab-quvvatlash xizmatiga xabarlar.',
        'Texnik maʼlumotlar: server jurnallaridagi IP-manzil va brauzer haqidagi maʼlumotlar, push-bildirishnomalarga obunalar, agar foydalanuvchi botni ulagan boʻlsa — Telegram identifikatori.',
      ],
    },
    {
      h: '3. Qayta ishlash maqsadlari va asoslari',
      p: [
        'Shartnomani bajarish: roʻyxatdan oʻtish, kirish va kirishni tiklash; buyurtmalarni rasmiylashtirish va bajarish, jumladan yetkazib berish va hujjatlarni taqdim etish uchun zarur boʻlgan xaridor maʼlumotlarini sotuvchiga berish; toʻlovni qabul qilish; buyurtmalar haqida bildirishnomalar; tashkilotlar ishi va buyurtmalarni kelishish.',
        'Qonunchilik talablarini bajarish: hisoblar va elektron hisob-fakturalar, fiskal cheklarni taqdim etish, buxgalteriya hujjatlarini saqlash, vakolatli organlarning soʻrovlariga javob berish.',
        'Foydalanuvchi roziligi: moliyalashtirish arizalarini koʻrib chiqish va ularni hamkor bankka berish, veterinariya maslahatlari, Telegram-botni ulash.',
        'Platforma xavfsizligini taʼminlash: ruxsatsiz kirish va suisteʼmollardan himoya, sotuvchilarni tekshirish.',
      ],
    },
    {
      h: '4. Biz maʼlumotlarni kimga beramiz',
      p: [
        'Sotuvchi va xaridorga — aniq buyurtmani bajarish uchun zarur hajmda. Tashkilot egasi va boshqaruvchisiga — uning xodimlarining buyurtmalari haqidagi maʼlumotlar.',
        'Platforma ular orqali ishlaydigan xizmat koʻrsatuvchilarga — faqat ularning vazifasini bajarish uchun: Supabase Inc. (maʼlumotlar bazasi va fayllar, AQSh), Render Services Inc. (ilova serverlari, AQSh), Cloudflare Inc. (saytni yetkazish va tashriflar statistikasi, global tarmoq), Resend (xatlar yuborish, AQSh), Eskiz (SMS yuborish, Oʻzbekiston), Telegram (bildirishnomalar), Payme, Click va Uzum toʻlov tizimlari (Oʻzbekiston), Didox elektron hujjat aylanishi operatori (Oʻzbekiston).',
        'Hamkor bankka — xaridorning moliyalashtirish arizasi boʻyicha va uning roziligi bilan. Davlat organlariga — qonunchilikda nazarda tutilgan hollarda.',
        'Biz shaxsiy maʼlumotlarni sotmaymiz va ularni uchinchi shaxslarning reklamasi uchun bermaymiz.',
      ],
    },
    {
      h: '5. Maʼlumotlar qayerda saqlanadi',
      p: [
        'Platforma maʼlumotlari AQShdagi serverlarda (Supabase, Render) saqlanadi va Cloudflare tarmogʻi orqali uzatiladi. Transchegaraviy uzatish foydalanuvchining roziligi bilan va ushbu xizmat koʻrsatuvchilar bilan tuzilgan shartnomalarda belgilangan, maʼlumotlarning himoyasini taʼminlaydigan qayta ishlash shartlarida amalga oshiriladi. Platforma biometrik va genetik maʼlumotlarni qayta ishlamaydi.',
        'Platformaning shaxsiy maʼlumotlar bazasi Shaxsga doir maʼlumotlar bazalari davlat reyestrida roʻyxatdan oʻtkazilgan: [roʻyxatdan oʻtkazish raqami va sanasi].',
      ],
    },
    {
      h: '6. Maʼlumotlarni qancha vaqt saqlaymiz',
      p: [
        'Hisob qaydnomasi maʼlumotlari — hisob qaydnomasi amal qilib turgan vaqtda; u oʻchirilgandan keyin — darhol shaxssizlashtiriladi. Buyurtmalar, hisoblar va toʻlovlar haqidagi maʼlumotlar — buxgalteriya hisobi va soliqlar toʻgʻrisidagi qonunchilikda belgilangan muddatlar davomida. Server jurnallari — 30 kundan koʻp emas; bazaning zaxira nusxalari — 30 kundan koʻp emas; parolni tiklash havolalari — bir soat.',
      ],
    },
    {
      h: '7. Sizning huquqlaringiz',
      p: [
        'Siz bizda maʼlumotlaringiz mavjudligini bilish va ularni qayta ishlash haqida maʼlumot olish, ularni aniqlashtirish, bloklash yoki oʻchirishni talab qilish, qayta ishlashga rozilikni qaytarib olish, shuningdek Operator harakatlari ustidan vakolatli davlat organiga yoki sudga shikoyat qilish huquqiga egasiz.',
        'Maʼlumotlarning katta qismini shaxsiy kabinetda oʻzgartirish mumkin; boshqa soʻrovlarni info@vethub.uz manziliga yuboring — biz 10 kun ichida javob beramiz. Rozilikni hisob qaydnomasini oʻchirib (Profil → Hisobni oʻchirish) qaytarib olish mumkin: ism, telefon, pochta, rekvizitlar va saralanganlar oʻchiriladi, kirish yopiladi, buyurtmalar, hisoblar va toʻlovlar esa shaxssizlashtirilgan holda qoladi, chunki ularni saqlashni qonun talab qiladi.',
      ],
    },
    {
      h: '8. Maʼlumotlarni qanday himoya qilamiz',
      p: [
        'Platforma bilan ulanish shifrlanadi (HTTPS, HSTS); parollar faqat xesh koʻrinishida saqlanadi; maʼlumotlarga kirish rollar boʻyicha chegaralangan; parolni tiklash havolalari bir martalik; parolni almashtirish barcha oldingi kirishlarni tugatadi; administratorlarning harakatlari jurnalga yoziladi; maʼlumotlar bazasi har kuni zaxiralanadi.',
      ],
    },
    {
      h: '9. Cookie va brauzer xotirasi',
      p: [
        'Platforma brauzerda kirish kaliti, savat tarkibi, tanlangan til va bezak mavzusini saqlaydi. Ularsiz kirish va savat ishlamaydi. Tashriflar soni cookie ishlatmaydigan va tashrif buyuruvchini saytlar oʻrtasida kuzatmaydigan Cloudflare Web Analytics xizmati orqali hisoblanadi. Platforma uchinchi tomon reklama cookie fayllaridan foydalanmaydi.',
      ],
    },
    {
      h: '10. Voyaga yetmaganlar',
      p: ['Platforma tadbirkorlik maqsadidagi xaridlar uchun moʻljallangan va 18 yoshga toʻlmagan shaxslar uchun moʻljallanmagan.'],
    },
    {
      h: '11. Siyosatni oʻzgartirish va aloqa',
      p: [
        'Biz ushbu siyosatni oʻzgartirishimiz mumkin; yangi tahrir eʼlon qilingan paytdan boshlab amal qiladi, tahrir sanasi ushbu sahifada koʻrsatilgan. Shaxsiy maʼlumotlarni qayta ishlash boʻyicha savollarni info@vethub.uz manziliga yuboring.',
      ],
    },
  ],

  sellers: [
    {
      h: '1. Umumiy qoidalar',
      p: [
        `Ushbu hujjat — ${OPERATOR} (keyingi oʻrinlarda — Operator) ning yuridik shaxslar va yakka tartibdagi tadbirkorlarga (keyingi oʻrinlarda — Sotuvchi) VetHub platformasida (https://vethub.uz, keyingi oʻrinlarda — Platforma) tovarlarni joylashtirish haqidagi ommaviy ofertasi. Aksept — ushbu shartlarga roziligini belgilagan holda Platformada sotuvchi sifatida roʻyxatdan oʻtish.`,
        'Ushbu shartnoma boʻyicha Operator Sotuvchiga takliflarni joylashtirish va buyurtmalarni qayta ishlash uchun Platformaga kirishni taqdim etadi, shuningdek xaridorlardan Sotuvchining tovarlari uchun onlayn toʻlovni uning nomidan va uning hisobidan qabul qiladi (agentlik shartnomasi). Sotuvchi Operatorga mukofot (komissiya) toʻlaydi. Foydalanuvchi kelishuvi (ommaviy oferta) va Maxfiylik siyosati Sotuvchiga ushbu hujjatda tartibga solinmagan qismida qoʻllaniladi.',
      ],
    },
    {
      h: '2. Savdoga qoʻyish',
      p: [
        'Sotuvchi quyidagilarni taqdim etadi: roʻyxatdan oʻtish hujjatlari, veterinariya preparatlarini sotish uchun litsenziya (agar uning faoliyati uchun qonunchilikda talab qilinsa), preparatlarni davlat roʻyxatidan oʻtkazish hujjatlari, sertifikatlanishi lozim boʻlgan tovarlarga muvofiqlik sertifikatlari va bank rekvizitlari.',
        'Operator hujjatlarni, qoida tariqasida, uch ish kuni ichida tekshiradi. Tekshiruv tugaguniga qadar Sotuvchining takliflari xaridorlarga koʻrsatilmaydi. Operator qoʻshimcha hujjatlarni soʻrashga va savdoga qoʻyishni rad etishga haqli. Rekvizitlar, STIR oʻzgarganda yoki litsenziya muddati tugaganda Sotuvchi Operatorni xabardor qiladi; qayta tekshiruvgacha savdoga qoʻyish toʻxtatib turilishi mumkin.',
      ],
    },
    {
      h: '3. Takliflarga qoʻyiladigan talablar',
      p: [
        'Sotuvchi faqat sotishga haqli boʻlgan tovarlarni ishonchli narxlar, qoldiqlar, qadoqlar va minimal partiyalar bilan joylashtiradi. Veterinariya preparatlari uchun roʻyxat raqami, seriya va yaroqlilik muddati koʻrsatiladi; retseptli preparatlar va sovuq zanjir tovarlari alohida belgilanadi.',
        'Har bir tovarda MXIK kodi koʻrsatiladi: usiz elektron hisob-faktura va fiskal chek shakllantirilmaydi. Agar Sotuvchi QQS toʻlovchisi boʻlsa, narxlar QQS bilan koʻrsatiladi.',
        'Yaroqlilik muddati oʻtgan partiyalarni Platforma avtomatik ravishda savdodan oladi. Sotuvchi taklifda koʻrsatilganidan kam boʻlmagan qoldiq yaroqlilik muddatiga ega partiyalarni yetkazib berishi shart.',
        '1C yoki fayldan yuklangan narxlar va qoldiqlarni Sotuvchi dolzarb holatda saqlaydi. Integratsiya kaliti — Sotuvchining maxfiy maʼlumoti; undan foydalanib yuklangan maʼlumotlar uchun Sotuvchi javobgar.',
      ],
    },
    {
      h: '4. Buyurtmalarni bajarish',
      p: [
        'Sotuvchi buyurtmani bir ish kuni ichida tasdiqlaydi yoki rad etadi, tovarni kelishilgan muddatda joʻnatadi, elektron hisob-fakturani taqdim etadi va Platformada buyurtma holatini yangilaydi. Xaridor tashkilotida kelishuvni kutayotgan buyurtma kelishilgunga qadar ishga qabul qilinmaydi.',
        'Sotuvchi tovarni Platformada eʼlon qilingan oʻz tariflari boʻyicha yetkazib beradi, oʻzi jalb qilgan tashuvchilar uchun javob beradi va sovuq zanjir tovarlari uchun harorat rejimini taʼminlaydi.',
        'Sotuvchi xaridorlarning daʼvolarini Foydalanuvchi kelishuvida belgilangan muddatlarda koʻrib chiqadi va xaridor oldida tovarning sifati, butligi va muomalasining qonuniyligi uchun javob beradi.',
      ],
    },
    {
      h: '5. Hisob-kitoblar',
      p: [
        'Onlayn toʻlovni (Payme, Click, Uzum) Operator Sotuvchining agenti sifatida qabul qiladi va olingan summani mukofot chegirib tashlangan holda buyurtma «Yetkazildi» holatini olgandan keyin besh bank kunidan kechiktirmay Sotuvchiga oʻtkazadi.',
        'Bank oʻtkazmasi orqali toʻlovni xaridor Sotuvchining hisobi boʻyicha bevosita uning hisob raqamiga kiritadi. Bunday buyurtmalar boʻyicha mukofotni Operator Sotuvchiga har oy, keyingi oyning 5-sanasigacha taqdim etadi; Sotuvchi uni 10 bank kuni ichida toʻlaydi.',
        'Kechiktirilgan va boʻlib toʻlanadigan buyurtmalar boʻyicha pul Sotuvchiga xaridordan kelib tushishiga qarab oʻtkaziladi. Sotuvchi taqdim etgan tijorat krediti boʻyicha toʻlanmaslik xavfini Sotuvchi koʻtaradi.',
        'Toʻlangan buyurtma bekor qilinganda yoki daʼvo qanoatlantirilganda xaridorga qaytarish Sotuvchi hisobidan amalga oshiriladi: oʻtkazilishi lozim boʻlgan summalardan yoki Sotuvchi tomonidan bevosita. Nizoli buyurtma boʻyicha Operator nizo hal boʻlgunga qadar oʻtkazishni toʻxtatib turishga haqli.',
      ],
    },
    {
      h: '6. Operator mukofoti',
      p: [
        'Mukofot buyurtmadagi tovarlar qiymatining (yetkazib berish narxisiz) 12 % ini tashkil etadi va xaridor VetPoints ballarini hisobdan chiqarishidan oldingi summadan hisoblanadi.',
        'VetPoints ballari hisobiga chegirmani Operator taqdim etadi: onlayn toʻlovda Sotuvchi tovarlar qiymatini hisobdan chiqarilgan ballarni hisobga olmagan holda oladi, oʻtkazma orqali toʻlovda esa hisobdan chiqarilgan ballar summasi Operator mukofoti hisobiga oʻtkaziladi.',
        'Operator Sotuvchini kamida 30 kun oldin xabardor qilib, mukofot miqdorini oʻzgartirishga haqli. Yangi miqdor oʻzgarish kuchga kirgandan keyin rasmiylashtirilgan buyurtmalarga qoʻllaniladi.',
      ],
    },
    {
      h: '7. Hisobot va hujjatlar',
      p: [
        'Har oyning 10-sanasigacha Operator oʻtgan oy uchun agent hisobotini va koʻrsatilgan xizmatlar dalolatnomasini shakllantiradi hamda mukofot summasiga elektron hujjat aylanishi operatori orqali elektron hisob-faktura taqdim etadi. Agar besh ish kuni ichida Sotuvchi asoslantirilgan eʼtirozlarini yubormasa, hisobot va dalolatnoma qabul qilingan hisoblanadi. Agar Operator QQS toʻlovchisi boʻlsa, mukofot QQSni oʻz ichiga oladi.',
      ],
    },
    {
      h: '8. Shartnomaviy narxlar, aksiyalar va narx soʻrovlari',
      p: [
        'Sotuvchi alohida xaridorlar uchun shartnomaviy narxlar, hajmli chegirmalar va aksiyalarni belgilashga haqli; Platforma ularni buyurtma rasmiylashtirishda avtomatik qoʻllaydi. Sotuvchining narx soʻrovidagi (tenderdagi) taklifi soʻrov muddati tugaguncha amal qiladi va xaridor uni tanlaganda buyurtmaga aylanadi.',
      ],
    },
    {
      h: '9. Xaridorlar maʼlumotlari',
      p: [
        'Platforma orqali olingan xaridorlarning shaxsiy maʼlumotlaridan Sotuvchi faqat buyurtmani bajarish uchun foydalanadi, ularni uchinchi shaxslarga bermaydi va xaridor roziligisiz reklama uchun foydalanmaydi, shaxsga doir maʼlumotlar toʻgʻrisidagi qonunchilikka rioya qiladi.',
      ],
    },
    {
      h: '10. Javobgarlik va buzilishlar',
      p: [
        'Sotuvchi tovar sifati va muomalasining qonuniyligi, maʼlumotlar va hujjatlarning ishonchliligi uchun javob beradi va Sotuvchining tovari yoki maʼlumotlari sababli yuzaga kelgan uchinchi shaxslarning talablari bilan bogʻliq zararlarni Operatorga qoplaydi.',
        'Notoʻgʻri maʼlumotlar yoki hujjatlar, roʻyxatdan oʻtmagan, qalbaki yoki muddati oʻtgan preparatlarni sotish, buyurtmalarni muntazam bajarmaslik uchun Operator Sotuvchining takliflarini yashirish, nizoli buyurtmalar boʻyicha pul oʻtkazishni toʻxtatib turish yoki hisob qaydnomasini bloklashga haqli.',
      ],
    },
    {
      h: '11. Amal qilish muddati, oʻzgartirish va nizolar',
      p: [
        'Shartnoma muddatsiz amal qiladi. Sotuvchi barcha buyurtmalarni bajarib, hisob-kitoblarni yakunlagandan keyin Operatorni 30 kun oldin xabardor qilib, uni bekor qilishi mumkin. Operator Sotuvchini kamida 15 kun oldin (mukofot oʻzgarishi haqida — 30 kun oldin) xabardor qilib, ushbu shartlarni oʻzgartirishga haqli.',
        'Tomonlarning munosabatlariga Oʻzbekiston Respublikasi qonunchiligi qoʻllaniladi. Daʼvoga javob berish muddati — 30 kun; hal qilinmagan nizolar Operator joylashgan joydagi sudda koʻrib chiqiladi.',
      ],
    },
    {
      h: '12. Operator rekvizitlari',
      p: [`${OPERATOR}; ${OPERATOR_DETAILS}.`],
    },
  ],
};
