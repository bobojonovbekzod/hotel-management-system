const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot = TelegramBotModule.default || TelegramBotModule;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JOB_BOT_TOKEN = process.env.JOB_BOT_TOKEN || '8268294102:AAGkJHvv50dwX6oZ2HwA1SFsItlcMbNTf4A';

let bot = null;
const userStates = new Map(); // chatId -> state object

// 1. ADMIN TEST QUESTIONS (10 Questions - Hospitality, Service, Logic & Math)
const ADMIN_QUESTIONS = [
  {
    id: 1,
    question: "1/10 (Admin). Mehmonxona mehmoni xonasidan shikoyat qilib, judayam jahli chiqib baqirib keldi. Sizning birinchi harakatingiz qanday bo'lishi kerak?",
    options: [
      { text: "A) Uni botiqlik bilan tinglab, kechirim so'rash va muammoni zudlik bilan hal qilishga harakat qilish.", isCorrect: true },
      { text: "B) Uni tinchlanishini aytib, baland ovozda mehmonxonaning qoidalarini tushuntirish.", isCorrect: false },
      { text: "C) Uning e'rozini eshitmasdan, xavfsizlik xodimini chaqirish.", isCorrect: false },
      { text: "D) Admin xonasiga kirib ketib, mehmonni e'tiborsiz qoldirish.", isCorrect: false }
    ]
  },
  {
    id: 2,
    question: "2/10 (Admin). Smenaga belgilangan vaqtdan 15 daqiqa kechikayotganingizni sezdingiz. Nima qilasiz?",
    options: [
      { text: "A) Indamay kelib smenani qabul qilaveraman.", isCorrect: false },
      { text: "B) Smena adminiga va rahbarga oldindan qo'ng'iroq qilib, kechikish sababini aytib ogohlantiraman.", isCorrect: true },
      { text: "C) Smenani o'tkazib yuborib, ertaga kelaman.", isCorrect: false },
      { text: "D) Hamkasbimdan sezdirmaslikni so'rayman.", isCorrect: false }
    ]
  },
  {
    id: 3,
    question: "3/10 (Admin). Mehmon tun yarmida xonasida televizor ishlamayotganini aytib murojaat qildi. Nima qilasiz?",
    options: [
      { text: "A) Hozir uxlash vaqti deb, ertaga ertalab ko'rib berilishini aytaman.", isCorrect: false },
      { text: "B) Zudlik bilan vaziyatni tekshirib, texnik muammoni hal qilishga yoki boshqa bo'sh xonaga ko'chirishga harakat qilaman.", isCorrect: true },
      { text: "C) Televizor buzilgan bo'lsa mehmon o'zi aybdor deb aytaman.", isCorrect: false },
      { text: "D) Navbatchi farroshni jo'nataman.", isCorrect: false }
    ]
  },
  {
    id: 4,
    question: "4/10 (Admin). Xonadan mehmon unutib qoldirgan qimmatbaho buyum yoki pul topib olindi. Birinchi harakat?",
    options: [
      { text: "A) Uni darhol dalolatnoma qilib, seyfga saqlashga qo'yaman va rahbariyatga xabar beraman.", isCorrect: true },
      { text: "B) Mehmon qaytib kelgunicha o'zimda saqlab turaman.", isCorrect: false },
      { text: "C) Topilgan buyumni o'zimga olib qolaman.", isCorrect: false },
      { text: "D) Uni tozalik xodimiga berib yuboraman.", isCorrect: false }
    ]
  },
  {
    id: 5,
    question: "5/10 (Admin). Mehmonxonada 5 ta xona bor. Har bir xonada 2 tadan mehmon yashamoqda. Agar 2 ta xonadan 1 tadan mehmon chiqib ketsa, mehmonxonada necha kishi qoladi?",
    options: [
      { text: "A) 10 kishi", isCorrect: false },
      { text: "B) 8 kishi", isCorrect: true },
      { text: "C) 6 kishi", isCorrect: false },
      { text: "D) 9 kishi", isCorrect: false }
    ]
  },
  {
    id: 6,
    question: "6/10 (Admin). Bir vaqtning o'zida 3 ta mehmon kelib navbat kutmoqda va telefon uzluksiz jiringlamoqda. Nima qilasiz?",
    options: [
      { text: "A) Shoshmasdan va xushmuomalalik bilan navbatdagi mehmonlarni qabul qilaman va telefondagiga biroz kutishini so'rayman.", isCorrect: true },
      { text: "B) Ishni tashlab admin xonasidan chiqib ketaman.", isCorrect: false },
      { text: "C) Mehmonlarga baqirib, kutishlarini aytaman.", isCorrect: false },
      { text: "D) Telefondagi mehmonni uzib qo'yaman.", isCorrect: false }
    ]
  },
  {
    id: 7,
    question: "7/10 (Admin). Hamkasbingiz smenada tozalik ishlariga ulgurmayapti. Sizning harakatingiz?",
    options: [
      { text: "A) Bu mening vazifam emas deb kuzatib o'tiraman.", isCorrect: false },
      { text: "B) Uniki tugaguncha unga yordamlashib, ishni tezroq va sifatli bitirishga ko'maklashaman.", isCorrect: true },
      { text: "C) Uni rahbarga yomonlab beraman.", isCorrect: false },
      { text: "D) Uning ishini to'xtatib qo'yaman.", isCorrect: false }
    ]
  },
  {
    id: 8,
    question: "8/10 (Admin). Mehmon sizga noo'rin shaxsiy savollar berib, xushmuomalalik chegarasidan chiqmoqda. Nima qilasiz?",
    options: [
      { text: "A) Muloyimlik bilan xizmat doirasidagi professional chegarani saqlayman va nojo'ya javob bermayman.", isCorrect: true },
      { text: "B) U bilan urishib ketaman.", isCorrect: false },
      { text: "C) Uning barcha shaxsiy savollariga javob beraman.", isCorrect: false },
      { text: "D) Unga qo'pollik qilaman.", isCorrect: false }
    ]
  },
  {
    id: 9,
    question: "9/10 (Admin). Mehmon 1 sutkaga 200,000 so'mlik xonani 3 kunga band qildi va 1,000,000 so'm pul berdi. Qancha qaytim (sdacha) qaytarishingiz kerak?",
    options: [
      { text: "A) 300,000 so'm", isCorrect: false },
      { text: "B) 400,000 so'm", isCorrect: true },
      { text: "C) 500,000 so'm", isCorrect: false },
      { text: "D) 200,000 so'm", isCorrect: false }
    ]
  },
  {
    id: 10,
    question: "10/10 (Admin). Mehmonxona xodimi uchun eng muhim fazilat nima?",
    options: [
      { text: "A) Faqat o'z vaqtida kelib-ketish.", isCorrect: false },
      { text: "B) Samimiy xushmuomalalik, pokizalik, intizom va mehmondo'stlik.", isCorrect: true },
      { text: "C) Faqat ko'proq pul topish.", isCorrect: false },
      { text: "D) Barcha mehmonlarga rad javobini berish.", isCorrect: false }
    ]
  }
];

// 2. TOZALIK XODIMI TEST QUESTIONS (10 Questions - Hygiene, Cleaning, Ethics & Honesty, NO Math)
const CLEANER_QUESTIONS = [
  {
    id: 1,
    question: "1/10 (Tozalik xodimi). Xonani tozalashni birinchi nimadan boshlash kerak?",
    options: [
      { text: "A) Xonani shamollatish, axlatlarni yig'ish va choyshablarni almashtirishdan.", isCorrect: true },
      { text: "B) Darhol polni yuvishdan.", isCorrect: false },
      { text: "C) Mehmonning shaxsiy kiyimlarini yig'ishdan.", isCorrect: false },
      { text: "D) Televizor va mebellarni artishdan.", isCorrect: false }
    ]
  },
  {
    id: 2,
    question: "2/10 (Tozalik xodimi). Xonadan mehmon unutib qoldirgan pul yoki qimmatbaho uzuk topib oldingiz. Nima qilasiz?",
    options: [
      { text: "A) Darhol uni ma'muriyatga (Admin / Rahbarga) topshiraman.", isCorrect: true },
      { text: "B) Zudlik bilan cho'ntagimga solib olaman.", isCorrect: false },
      { text: "C) Mehmonxona tashqarisiga olib chiqib ketaman.", isCorrect: false },
      { text: "D) Boshqa tozalik xodimi bilan bo'lishib olaman.", isCorrect: false }
    ]
  },
  {
    id: 3,
    question: "3/10 (Tozalik xodimi). Mehmon yashab turgan xonani tozalayotganda mehmonning sumkasi yoki hamyoni ochiq turganini ko'rdingiz. Sizning harakatingiz?",
    options: [
      { text: "A) Unga umuman tegmayman, faqat xonaning tozaligiga mas'uliyat bilan qarayman.", isCorrect: true },
      { text: "B) Hamyon ichini ochib qarayman.", isCorrect: false },
      { text: "C) Sumkani boshqa xonaga o'tkazaman.", isCorrect: false },
      { text: "D) Hamyondan ozgina pul olib qo'yaman.", isCorrect: false }
    ]
  },
  {
    id: 4,
    question: "4/10 (Tozalik xodimi). Tozalash jarayonida xonadagi piyola yoki vazani adashib sindirib qo'ydingiz. Nima qilasiz?",
    options: [
      { text: "A) Sindirganimni yashirmay, darhol admin va rahbariyatga xabar beraman.", isCorrect: true },
      { text: "B) Siniqlarni yashirib, indamay chiqib ketaman.", isCorrect: false },
      { text: "C) Mehmon sindirdi deb yolg'on gapiraman.", isCorrect: false },
      { text: "D) Hamkasbim sindirdi deb aytaman.", isCorrect: false }
    ]
  },
  {
    id: 5,
    question: "5/10 (Tozalik xodimi). Hammom va hojatxonani tozalashda ishlatiladigan mato (rag) bilan xonadagi stollarni artish mumkinmi?",
    options: [
      { text: "A) Aslo mumkin emas! Sanitar gigiyena qoidasiga ko'ra har bir hududning alohida sochig'i/matosi bo'lishi shart.", isCorrect: true },
      { text: "B) Mayli, agarda mato toza bo'lsa artish mumkin.", isCorrect: false },
      { text: "C) Faqat suv bilan yuvilsa bo'ldi.", isCorrect: false },
      { text: "D) Ahamiyati yo'q.", isCorrect: false }
    ]
  },
  {
    id: 6,
    question: "6/10 (Tozalik xodimi). Ish smenangiz soat 09:00 da boshlanadi. Qachon kelishingiz kerak?",
    options: [
      { text: "A) Soat 08:45-08:50 larda kelib, kiyimni almashtirib, ishga tayyor bo'lishim kerak.", isCorrect: true },
      { text: "B) Soat 09:30 da kelaman.", isCorrect: false },
      { text: "C) Soat 10:00 da kelaman.", isCorrect: false },
      { text: "D) Qachon uyg'onsam o'shanda kelaman.", isCorrect: false }
    ]
  },
  {
    id: 7,
    question: "7/10 (Tozalik xodimi). Xonani tozalab bo'lgach, uni topshirishdan oldin nima qilish kerak?",
    options: [
      { text: "A) Xona pokizaligi, sochiqlar, sovun-shampunlar va choyshablar to'liq tayyorligini o'zim qayta ko'zdan kechiraman.", isCorrect: true },
      { text: "B) Xona eshigini ochiq qoldirib chiqib ketaman.", isCorrect: false },
      { text: "C) Hech narsani tekshirmayman.", isCorrect: false },
      { text: "D) Chiroqlarni va konditsionerni yoniq qoldiraman.", isCorrect: false }
    ]
  },
  {
    id: 8,
    question: "8/10 (Tozalik xodimi). Koridorda mehmonni uchratib qoldingiz. Birinchi harakatingiz?",
    options: [
      { text: "A) Samimiy tabassum bilan mehmonga salom beraman.", isCorrect: true },
      { text: "B) Yuzimni burib o'tib ketaman.", isCorrect: false },
      { text: "C) Mehmonga qaramaslikka harakat qilaman.", isCorrect: false },
      { text: "D) Mehmon bilan urishaman.", isCorrect: false }
    ]
  },
  {
    id: 9,
    question: "9/10 (Tozalik xodimi). Hamkasbingiz tozalashda yordam so'radi, sizning esa bitta xonangiz qolgan. Nima qilasiz?",
    options: [
      { text: "A) O'z xonamni bitirib, hamkasbimga yordamga oshiqaman.", isCorrect: true },
      { text: "B) Menga aloqasi yo'q deb rad etaman.", isCorrect: false },
      { text: "C) Ishni tashlab uyga ketaman.", isCorrect: false },
      { text: "D) Hamkasbim ustidan kulaman.", isCorrect: false }
    ]
  },
  {
    id: 10,
    question: "10/10 (Tozalik xodimi). Mehmonxona pokizaligi va gigiyenasi kimning qo'lida?",
    options: [
      { text: "A) Har bir tozalik xodimi va jamoaning mas'uliyatli ishida.", isCorrect: true },
      { text: "B) Faqat mehmonlarning o'zida.", isCorrect: false },
      { text: "C) Faqat adminning o'zida.", isCorrect: false },
      { text: "D) Hech kimda.", isCorrect: false }
    ]
  }
];

function setupJobBot() {
  if (bot) return bot;

  try {
    bot = new TelegramBot(JOB_BOT_TOKEN, { polling: true });
    console.log("🟢 Family Hotel Job Bot (@family_hotel_job_bot) muvaffaqiyatli ishga tushdi!");

    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      userStates.set(chatId, { step: 'NAME', answers: [], score: 0 });

      await bot.sendMessage(chatId, 
        `👋 **Assalomu alaykum! Family Hotel mehmonxonalar tarmog'iga xush kelibsiz!**\n\n` +
        `Biz jamoamizga mas'uliyatli va mehmondo'st xodimlarni taklif etamiz.\n\n` +
        `📝 **Iltimos, F.I.SH (To'liq ismingiz va familiyangiz)ni kiriting:**`,
        { parse_mode: 'Markdown' }
      );
    });

    // 1. CONTACT SHARING HANDLER
    bot.on('contact', async (msg) => {
      const chatId = msg.chat.id;
      const state = userStates.get(chatId);
      if (state && state.step === 'PHONE') {
        state.phone = msg.contact.phone_number;
        state.step = 'EXPERIENCE';
        userStates.set(chatId, state);

        await bot.sendMessage(chatId, 
          `💼 **Oldin qaysi tashkilotlarda ishlagansiz va qanday tajribaga egasiz?**\n` +
          `(Masalan: *"Mehmonxonada administrator bo'lib 2 yil ishlaganman"* yoki *"Tozalik sohasida ishlaganman"*):`,
          { reply_markup: { remove_keyboard: true }, parse_mode: 'Markdown' }
        );
      }
    });

    // 2. TEXT MESSAGES HANDLER
    bot.on('message', async (msg) => {
      if (msg.text && msg.text.startsWith('/')) return;
      if (msg.contact) return; // Prevent contact messages from triggering text validation errors!

      const chatId = msg.chat.id;
      const state = userStates.get(chatId);
      if (!state) return;

      const text = (msg.text || '').trim();

      // Step 1: NAME
      if (state.step === 'NAME') {
        if (!text || text.length < 3) {
          return bot.sendMessage(chatId, "⚠️ Iltimos, to'liq ismingizni kiriting:");
        }
        state.name = text;
        state.step = 'POSITION';
        userStates.set(chatId, state);

        await bot.sendMessage(chatId, 
          `📋 **${state.name}, qaysi lavozimga (o'ringa) ishga kirmoqchisiz?**\nQuyidagi tugmalardan birini tanlang:`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🛎️ Administrator (Admin)", callback_data: "pos_Admin" }],
                [{ text: "🧹 Tozalik xodimi (Farrosh / Housekeeper)", callback_data: "pos_Tozalik" }]
              ]
            }
          }
        );
      }
      // Step 4: PHONE (Manual text input)
      else if (state.step === 'PHONE') {
        if (!text || text.length < 7) {
          return bot.sendMessage(chatId, "⚠️ Iltimos, to'g'ri telefon raqamingizni kiriting (masalan: +998901234567):");
        }
        state.phone = text;
        state.step = 'EXPERIENCE';
        userStates.set(chatId, state);

        await bot.sendMessage(chatId, 
          `💼 **Oldin qayerda ishlagansiz va qanday tajribaga egasiz?**\n` +
          `(Masalan: *"2 yil tajribam bor"* yoki *"Yangi boshlovchiman"*):`,
          { reply_markup: { remove_keyboard: true }, parse_mode: 'Markdown' }
        );
      }
      // Step 5: EXPERIENCE
      else if (state.step === 'EXPERIENCE') {
        if (!text) return;
        state.experience = text;
        state.step = 'YEARS';
        userStates.set(chatId, state);

        await bot.sendMessage(chatId, 
          `⏱️ **Necha yillik umumiy ish stajingiz (tajribangiz) bor?**\n` +
          `(Masalan: *"1 yil"*, *"3 yil"*, *"Tajribam yo'q"*):`,
          { parse_mode: 'Markdown' }
        );
      }
      // Step 6: YEARS -> START TEST
      else if (state.step === 'YEARS') {
        if (!text) return;
        state.yearsOfExperience = text;
        state.step = 'TEST';
        state.currentQuestion = 0;
        state.score = 0;
        userStates.set(chatId, state);

        const posName = state.position === 'Tozalik xodimi' ? 'Tozalik xodimi' : 'Administrator';
        await bot.sendMessage(chatId, 
          `✅ **Ma'lumotlar saqlandi!**\n\n` +
          `📋 Endi **10 talik ${posName} lavozimi testi** boshlanadi.\n` +
          `Har bir savolga A, B, C, D variantlaridan birini tanlaysiz.\n\n` +
          `Tayyormisiz? Birinchi savol:`,
          { parse_mode: 'Markdown' }
        );

        sendQuestion(chatId, 0, state.position);
      }
    });

    // 3. CALLBACK QUERY HANDLER
    bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;
      const state = userStates.get(chatId);

      await bot.answerCallbackQuery(query.id);

      // Handle Position Selection
      if (data.startsWith('pos_')) {
        if (state && state.step === 'POSITION') {
          const selectedPos = data === 'pos_Tozalik' ? 'Tozalik xodimi' : 'Admin';
          state.position = selectedPos;
          state.step = 'BRANCH';
          userStates.set(chatId, state);

          // Fetch branches from DB (EXCLUDE Zangiota)
          let branches = [];
          try {
            branches = await prisma.branch.findMany({ 
              where: { 
                isActive: true,
                NOT: { name: { contains: 'Zangiota', mode: 'insensitive' } }
              } 
            });
          } catch (e) {
            console.error("Error fetching branches:", e);
          }

          const inlineKeyboard = [];
          for (let i = 0; i < branches.length; i += 2) {
            const row = [];
            row.push({ text: `🏢 ${branches[i].name}`, callback_data: `branch_${branches[i].id}_${branches[i].name}` });
            if (branches[i + 1]) {
              row.push({ text: `🏢 ${branches[i + 1].name}`, callback_data: `branch_${branches[i + 1].id}_${branches[i + 1].name}` });
            }
            inlineKeyboard.push(row);
          }

          await bot.sendMessage(chatId, 
            `🏢 **Qaysi filialimizda ishlamoqchisiz?**\nQuyidagi filiallardan birini tanlang:`,
            {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: inlineKeyboard }
            }
          );
        }
      }
      // Handle Branch selection
      else if (data.startsWith('branch_')) {
        if (state && state.step === 'BRANCH') {
          const parts = data.split('_');
          state.branchId = parseInt(parts[1], 10);
          state.branchName = parts[2] || '';
          state.step = 'PHONE';
          userStates.set(chatId, state);

          await bot.sendMessage(chatId, 
            `📱 **Telefon raqamingizni kiriting:**\n` +
            `Pastdagi tugmani bosib kontaktni ulashing yoki raqamingizni yozib yuboring (masalan: +998901234567):`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                keyboard: [[{ text: "📱 Kontaktni ulashish", request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true
              }
            }
          );
        }
      }
      // Handle Test Answer selection
      else if (data.startsWith('ans_')) {
        if (state && state.step === 'TEST') {
          const parts = data.split('_');
          const qIndex = parseInt(parts[1], 10);
          const optIndex = parseInt(parts[2], 10);

          const questionsList = state.position === 'Tozalik xodimi' ? CLEANER_QUESTIONS : ADMIN_QUESTIONS;

          if (qIndex === state.currentQuestion) {
            const questionObj = questionsList[qIndex];
            const selectedOpt = questionObj.options[optIndex];

            if (selectedOpt.isCorrect) {
              state.score += 1;
            }

            state.answers.push({
              questionId: questionObj.id,
              selected: selectedOpt.text,
              isCorrect: selectedOpt.isCorrect
            });

            state.currentQuestion += 1;
            userStates.set(chatId, state);

            if (state.currentQuestion < questionsList.length) {
              sendQuestion(chatId, state.currentQuestion, state.position);
            } else {
              // TEST COMPLETED!
              await finishTest(chatId, state);
            }
          }
        }
      }
    });

  } catch (err) {
    console.error("Job bot startup error:", err);
  }

  return bot;
}

async function sendQuestion(chatId, qIndex, position) {
  const questionsList = position === 'Tozalik xodimi' ? CLEANER_QUESTIONS : ADMIN_QUESTIONS;
  const qObj = questionsList[qIndex];
  const inlineKeyboard = qObj.options.map((opt, idx) => ([
    { text: opt.text, callback_data: `ans_${qIndex}_${idx}` }
  ]));

  await bot.sendMessage(chatId, 
    `❓ **${qObj.question}**`, 
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    }
  );
}

async function finishTest(chatId, state) {
  const finalScore = state.score;
  const passed = finalScore >= 9;

  userStates.delete(chatId);

  if (passed) {
    // Save to Database
    try {
      const candidate = await prisma.candidate.create({
        data: {
          companyId: 1,
          branchId: state.branchId || null,
          position: state.position || 'Admin',
          name: state.name || 'Nomzod',
          phone: state.phone || '',
          experience: state.experience || '',
          yearsOfExperience: state.yearsOfExperience || '',
          score: finalScore,
          totalQuestions: 10,
          status: 'new',
          answersJson: JSON.stringify(state.answers),
          telegramUserId: BigInt(chatId)
        },
        include: { branch: true }
      });

      console.log("New passed candidate saved to DB:", candidate.id, candidate.name, candidate.position, finalScore);
    } catch (e) {
      console.error("Error saving candidate to DB:", e);
    }

    await bot.sendMessage(chatId, 
      `🎉 **TABRIKLAYMIZ, ${state.name.toUpperCase()}!**\n\n` +
      `Siz **${state.position}** lavozimi testidan 10 ta savoldan **${finalScore} ta** to'g'ri javob berdingiz va saralash bosqichidan muvaffaqiyatli o'tdingiz! 👏\n\n` +
      `Sizning anketangiz va test natijalaringiz rahbariyatimiz va HR bo'limiga yuborildi. Tezingizda siz bilan bog'lanamiz! 📞🏢`,
      { parse_mode: 'Markdown' }
    );
  } else {
    await bot.sendMessage(chatId, 
      `🙏 **Hurmatli ${state.name}!**\n\n` +
      `Testimizda ishtirok etganingiz uchun sizga tashakkur bildiramiz.\n\n` +
      `Siz 10 ta savoldan **${finalScore} ta** to'g'ri javob berdingiz. Afsuski, saralash mezonidan o'ta olmadingiz.\n` +
      `Kelgusi faoliyatingizda omad tilaymiz! 🤝`,
      { parse_mode: 'Markdown' }
    );
  }
}

module.exports = { setupJobBot };
