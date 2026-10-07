const { OpenAI } = require('openai');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

// Cache chat history in memory (in production, use Redis)
const chatSessions = new Map(); 

const BRANCH_LOCATIONS = {
  samarqand_1: {
    name: 'Samarqand 1 (Registon)',
    title: '🏨 Family Hotel - Samarqand 1',
    subtitle: '📍 Registon maydoni yaqinida',
    city: 'Samarqand',
    lat: 39.652934,
    lng: 66.977715
  },
  samarqand_2: {
    name: 'Samarqand 2 (Atoy)',
    title: '🏨 Family Hotel - Samarqand 2',
    subtitle: '📍 O‘zbekistanskiy, Atoy ko‘chasi 14-uy',
    city: 'Samarqand',
    lat: 39.638247,
    lng: 66.943038
  },
  yunusobod: {
    name: 'Yunusobod',
    title: '🏨 Family Hotel - Yunusobod',
    subtitle: '📍 Toshkent, Yunusobod tumani',
    city: 'Toshkent',
    lat: 41.366643,
    lng: 69.327931
  },
  parkentskiy: {
    name: 'Parkentskiy',
    title: '🏨 Family Hotel - Parkentskiy',
    subtitle: '📍 Toshkent, Parkentskiy bozori yaqinida',
    city: 'Toshkent',
    lat: 41.314917,
    lng: 69.335159
  },
  chorsu: {
    name: 'Chorsu',
    title: '🏨 Family Hotel - Chorsu',
    subtitle: '📍 Toshkent, Chorsu bozori yaqinida',
    city: 'Toshkent',
    lat: 41.328325,
    lng: 69.232709
  },
  mirobod: {
    name: 'Mirobod',
    title: '🏨 Family Hotel - Mirobod',
    subtitle: '📍 Toshkent, Mirobod tumani',
    city: 'Toshkent',
    lat: 41.293004,
    lng: 69.266926
  },
  ttz: {
    name: 'TTZ',
    title: '🏨 Family Hotel - TTZ',
    subtitle: '📍 Toshkent, TTZ dahasi',
    city: 'Toshkent',
    lat: 41.349837,
    lng: 69.385783
  },
  selxoz: {
    name: 'Selxoz',
    title: '🏨 Family Hotel - Selxoz',
    subtitle: '📍 Toshkent, Qishloq xo\'jaligi instituti yaqinida',
    city: 'Toshkent',
    lat: 41.357566,
    lng: 69.340149
  },
  buxoro: {
    name: 'Buxoro',
    title: '🏨 Family Hotel - Buxoro',
    subtitle: '📍 Buxoro shahri, Ahmad Yassaviy ko‘chasi 2-uy',
    city: 'Buxoro',
    lat: 39.784309,
    lng: 64.415329
  },
  zangiota: {
    name: 'Zangiota',
    title: '🏨 Family Hotel - Zangiota',
    subtitle: '📍 Toshkent viloyati, Zangiota tumani, Quyoshli',
    city: 'Toshkent',
    lat: 41.226834,
    lng: 69.157832
  }
};

const BRANCH_PHOTO_COUNTS = {
  samarqand_1: 27,
  samarqand_2: 14,
  yunusobod: 28,
  parkentskiy: 10,
  mirobod: 9,
  ttz: 7,
  selxoz: 8,
  buxoro: 17,
  zangiota: 10
};

function getBranchPhotoUrls(branchKey, max = 4) {
  const count = BRANCH_PHOTO_COUNTS[branchKey] || 0;
  if (count === 0) return [];
  const urls = [];
  const take = Math.min(count, max);
  for (let i = 1; i <= take; i++) {
    urls.push(`https://hotelbase.uz/api/uploads/branches/${branchKey}/${i}.jpg`);
  }
  return urls;
}

// Calculate distance between two GPS coordinates using Haversine formula
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function findNearestBranches(userLat, userLng, limit = 3) {
  const list = Object.entries(BRANCH_LOCATIONS).map(([key, b]) => {
    return {
      key,
      name: b.name,
      title: b.title,
      subtitle: b.subtitle,
      city: b.city,
      distanceKm: getDistanceKm(userLat, userLng, b.lat, b.lng)
    };
  });
  list.sort((a, b) => a.distanceKm - b.distanceKm);
  return list.slice(0, limit);
}

// Extract GPS coordinates from Meta attachment or Graph API
async function extractLocationCoordinates(mid, attachments) {
  const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;

  // 1. Direct coordinates in webhook payload
  if (attachments && Array.isArray(attachments)) {
    for (const att of attachments) {
      if (att.payload?.coordinates) {
        const lat = parseFloat(att.payload.coordinates.lat);
        const lng = parseFloat(att.payload.coordinates.long);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
      if (att.payload?.url) {
        const match = att.payload.url.match(/markers=([0-9.-]+)(?:%2C|,)([0-9.-]+)/);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }
      }
    }
  }

  // 2. Query Meta Graph API using message ID (mid)
  if (mid && PAGE_ACCESS_TOKEN) {
    try {
      const url = `https://graph.facebook.com/v20.0/${mid}?fields=attachments&access_token=${PAGE_ACCESS_TOKEN}`;
      const res = await axios.get(url, { timeout: 8000 });
      const data = res.data?.attachments?.data;
      if (Array.isArray(data)) {
        for (const item of data) {
          const mediaUrl = item.generic_template?.media_url || item.image_data?.url || item.media_url || '';
          const match = mediaUrl.match(/markers=([0-9.-]+)(?:%2C|,)([0-9.-]+)/);
          if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
          }
        }
      }
    } catch (err) {
      console.error('Error fetching location from Meta Graph API:', err.response?.data || err.message);
    }
  }

  return null;
}

// Track messages sent by bot to avoid treating our own echoes as human operator
const recentBotMessages = new Set();

function recordBotMessage(recipientId, text) {
  if (!text) return;
  const key = `${recipientId}:${text.trim().slice(0, 80)}`;
  recentBotMessages.add(key);
  setTimeout(() => recentBotMessages.delete(key), 60000);
}

function isSentByBot(recipientId, text) {
  if (!text) {
    // If text is empty (e.g. template echo), check if we recently sent a template
    const templateKey = `${recipientId}:TEMPLATE_LOCATION_CARD`;
    if (recentBotMessages.has(templateKey)) {
      recentBotMessages.delete(templateKey);
      return true;
    }
    return false;
  }
  const key = `${recipientId}:${text.trim().slice(0, 80)}`;
  if (recentBotMessages.has(key)) {
    recentBotMessages.delete(key);
    return true;
  }
  return false;
}

async function sendInstagramMessage(recipientId, text) {
  const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
  if (!PAGE_ACCESS_TOKEN) {
    console.log('WARNING: META_PAGE_ACCESS_TOKEN not set. Message not sent:', text);
    return;
  }
  
  recordBotMessage(recipientId, text);

  try {
    const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
    await axios.post(url, {
      recipient: { id: recipientId },
      message: { text: text }
    });
  } catch (error) {
    console.error('Error sending message to Instagram:', error.response?.data || error.message);
  }
}

async function sendInstagramImage(recipientId, imageUrl) {
  const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
  if (!PAGE_ACCESS_TOKEN) return;

  try {
    const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
    await axios.post(url, {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'image',
          payload: {
            url: imageUrl,
            is_reusable: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Error sending image to Instagram:', error.response?.data || error.message);
  }
}

async function sendInstagramBranchPhotos(recipientId, branchKey) {
  let urls = [];
  if (branchKey === 'all_samarqand') {
    urls = [
      'https://hotelbase.uz/api/uploads/branches/samarqand_1/1.jpg',
      'https://hotelbase.uz/api/uploads/branches/samarqand_1/2.jpg',
      'https://hotelbase.uz/api/uploads/branches/samarqand_2/1.jpg',
      'https://hotelbase.uz/api/uploads/branches/samarqand_2/2.jpg'
    ];
  } else if (BRANCH_PHOTO_COUNTS[branchKey]) {
    urls = getBranchPhotoUrls(branchKey, 4);
  } else {
    // Default fallback to popular branch
    urls = getBranchPhotoUrls('yunusobod', 3);
  }

  for (const photoUrl of urls) {
    await sendInstagramImage(recipientId, photoUrl);
    // Small delay between sending photos
    await new Promise(r => setTimeout(r, 350));
  }
}

async function sendInstagramLocationCard(recipientId, branchKey) {
  const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
  if (!PAGE_ACCESS_TOKEN) return;

  recordBotMessage(recipientId, 'TEMPLATE_LOCATION_CARD');

  let keys = [branchKey];
  if (branchKey === 'all_samarqand') {
    keys = ['samarqand_1', 'samarqand_2'];
  }

  const elements = [];
  for (const k of keys) {
    const branch = BRANCH_LOCATIONS[k];
    if (!branch) continue;
    elements.push({
      title: branch.title,
      subtitle: branch.subtitle,
      buttons: [
        {
          type: 'web_url',
          url: `https://yandex.uz/maps/?pt=${branch.lng},${branch.lat}&z=17&l=map`,
          title: '🚕 Yandex Xarita'
        },
        {
          type: 'web_url',
          url: `https://maps.google.com/?q=${branch.lat},${branch.lng}`,
          title: '🗺️ Google Maps'
        }
      ]
    });
  }

  if (elements.length === 0) return;

  const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  const payload = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements
        }
      }
    }
  };

  try {
    await axios.post(url, payload);
  } catch (error) {
    console.error('Error sending location card to Instagram:', error.response?.data || error.message);
  }
}

// Cache active operator sessions: userId -> expiry timestamp in ms
const operatorSessions = new Map();

function isOperatorActive(userId) {
  const expiry = operatorSessions.get(userId);
  if (!expiry) return false;
  if (Date.now() < expiry) {
    return true;
  } else {
    operatorSessions.delete(userId);
    return false;
  }
}

function getOrCreateSession(senderId) {
  if (!chatSessions.has(senderId)) {
    chatSessions.set(senderId, [
      {
        role: "system",
        content: `Siz 'Family Hotel' mehmonxonalar tarmog'ining Instagram va chatdagi samimiy, xushmuomala va do'stona administratorisiz (jonli, insoniy tilda gaplashuvchi qiziquvchan yordamchi).

QAT'IY QOIDALAR:
1. QAT'IY TIL MOSLIGI (ENG BIRINCHI VA ENG MUHIM QOIDA):
   - Mijoz qaysi tilda yozsa (O'zbek, Rus, Ingliz), BARCHA javoblaringiz (salomlashish, narxlar, savollar) 100% FAQAT O'SHA TILDA bo'lishi SHART!
   - AGAR MIJOZ RUS TILIDA YOZSA: Faqat va faqat rus tilida gapiring ("Здравствуйте!", "Добро пожаловать 😊", "Двухместные номера от 300 000 сум" va h.k.). HECH QACHON o'zbekcha salom ("Assalomu alaykum") yoki o'zbekcha so'z qo'shmang!
   - AGAR MIJOZ O'ZBEK TILIDA YOZSA: Faqat o'zbek tilida gapiring ("Assalomu alaykum!", "Ha, albatta 😊", "Xonalarimiz 150 000 so'mdan" va h.k.).
   - AGAR MIJOZ INGLIZ TILIDA YOZSA: Faqat ingliz tilida gapiring ("Hello!", "Welcome to Family Hotel 😊").

2. TABIIY, JONLI VA ODDY TIL:
   - Hech qachon robotik, kitobiy yoki haddan tashqari rasmiy gapirmang! (Masalan: "hurmatli mijoz", "tashrifingizdan mamnunmiz", "istiqomat qilishingiz mumkin", "taqdim etishingizni so'raymiz", "xizmatimizdan mamnun bo'lasiz", "уважаемый клиент", "рады приветствовать" kabi quruq iboralardan QAT'IYAN QOCHING).
   - O'rniga oddiy, samimiy, iliq va tushunarli tilda gapiring:
     -- O'zbekcha: "Assalomu alaykum!", "Ha, albatta", "Bemalol", "Shinam xonalarimiz bor", "Xush kelibsiz 😊".
     -- Ruscha: "Здравствуйте!", "Да, конечно!", "У нас уютные номера", "Добро пожаловать 😊".
   - Har bir javobingiz qisqa va lo'nda bo'lsin (maksimum 1-2 ta gap!). Uzun doston yozmang.

3. ASOSIY MAQSAD — TELEFON RAQAMINI OLISH (LID):
   - Mijozning savoliga (narx, manzil, sharoit) darhol to'g'ri javob berib, ketidan xonani band qilib qo'yish yoki operator bog'lanishi uchun muloyimlik bilan telefon raqamini so'rang.
   - O'zbekcha: "Raqamingizni qoldirsangiz, operatorimiz 2 daqiqada bog'lanib, xonani sizga band qilib beradi 📲".
   - Ruscha: "Оставьте ваш номер телефона, и наш менеджер свяжется с вами за пару минут для бронирования 📲".

4. TARMOQ FILIALLARI (Jami 10 ta):
   Toshkent shahri va viloyatidagi filiallar:
   - Chorsu filiali (branch_key: 'chorsu'): Chorsu bozori, Eski shahar, Urda, Navoiy ko'chasi, Paxtakor, Shayxontohur yaqinida.
   - Mirobod filiali (branch_key: 'mirobod'): Mirobod bozori, Severniy vokzal (Shimoliy vokzal), Toshkent aeroporti, Oybek, Nukus ko'chasi yaqinida.
   - Yunusobod filiali (branch_key: 'yunusobod'): Yunusobod bozori, Megaplanet, Shahriston, Bodomzor, Ahmad Donish yaqinida.
   - Parkentskiy filiali (branch_key: 'parkentskiy'): Parkentskiy bozori, Oltintepa ko'chasi, Buyuk Ipak Yo'li (Maksim Gorkiy), Aviator yaqinida.
   - TTZ filiali (branch_key: 'ttz'): TTZ dahasi, Ahmad Yugnakiy, Rohat, Qorasuv yaqinida.
   - Selxoz filiali (branch_key: 'selxoz'): Qishloq xo'jaligi instituti (TashGres), Qibray yo'li yaqinida.
   - Zangiota filiali (branch_key: 'zangiota'): Zangiota tumani, Quyoshli, Erkin, Janubiy yo'nalish yaqinida.

   Samarqand shahridagi filiallar:
   - Samarqand 1-filial (branch_key: 'samarqand_1'): Registon maydoni, Gur-Amir maqbarasi yaqinida.
   - Samarqand 2-filial (branch_key: 'samarqand_2'): Atoy ko'chasi 14-uy, O‘zbekistanskiy, Samarqand vokzali yaqinida.

   Buxoro shahridagi filial:
   - Buxoro filiali (branch_key: 'buxoro'): Buxoro shahri, Labi Hovuz, Ark qal'asi, Ahmad Yassaviy ko'chasi 2-uy.

5. NARXLAR VA XONALAR:
   - 1 kishilik (1-местный): 150,000 so'mdan.
   - 2 kishilik (2-местный):
     -- Standart (Wi-Fi, TV): 300,000 so'mdan.
     -- Lux (Wi-Fi, TV, Konditsioner): 350,000 so'mdan.
   - 3 va 4 kishilik xonalar, hamda uzoq muddatga (oylik) turish imkoniyati ham bor.
   - QAT'IY QOIDA: Xona nomlarini o'zingizdan aslo to'qimang! Faqat yuqoridagi 1 kishilik, 2 kishilik Standart, 2 kishilik Lux yoki 3-4 kishilik xonalar haqida gapiring.
   - Agar mijoz "Ok", "Rahmat", "Спасибо", "Понятно" deb qisqa yozsa:
     -- O'zbekcha: "Sizga qaysi filialimiz qulayroq? Telefon raqamingizni qoldirsangiz, operatorimiz xonani band qilib beradi 📲"
     -- Ruscha: "Какой филиал вам ближе? Оставьте ваш номер телефона, и мы забронируем номер 📲"
   - Kirish (check-in): 12:00 dan, chiqish (check-out): ertasi kuni 12:00 gacha.

6. ZAKS / BEZ ZAKS BO'YICHA QAT'IY QOIDA:
   - HECH QACHON mijoz o'zi so'ramaguncha zaks yoki bez zaks haqida gap ochmang va o'z tashabbusingiz bilan buni taklif qilmang!
   - FAQAT VA FAQAT mijozning o'zi "zaks kerakmi?", "bez zaks mumkinmi?", "нужен ли загс?", "без загса можно?" deb to'g'ridan-to'g'ri so'ragan taqdirdagina:
     -- O'zbek tilida: "Zaks qog'oz shart emas, faqat pasport bo'lsa yetarli 😊" deb aniq va lo'nda javob bering.
     -- Rus tilida: "Загс не требуется, достаточно иметь при себе паспорта 😊" deb javob bering.

7. LOKATSIYA VA ENG YAQIN FILIAL:
   - Agar mijoz GPS lokatsiya yuborsa: Eng yaqin 1-2 ta filialni masofasi bilan ayting va telefon raqamini so'rang.
   - Agar shahar aytilmagan bo'lsa:
     -- O'zbekcha: "Sizga qaysi manzilimiz qulayroq? Toshkent, Samarqand yoki Buxoromi? 😊"
     -- Ruscha: "В каком городе вам удобнее? Ташкент, Самарканд или Бухара? 😊"
   - Filial manzilini so'rashganda darhol 'send_branch_location' funksiyasini chaqiring (kartochka yuboradi).

8. RASMLAR VA FOTOLAR:
   - Filial yoki xonalar rasmi so'ralganda darhol 'send_branch_photos' funksiyasini chaqiring.

9. LID QABUL QILISH:
   - Mijoz telefon raqamini qoldirganda darhol 'save_lead' funksiyasini chaqiring va mijoz yozgan tilda javob bering:
     -- O'zbekcha: "Katta rahmat! Raqamingizni qabul qildik, hozir operatorimiz siz bilan bog'lanadi 😊"
     -- Ruscha: "Большое спасибо! Приняли ваш номер, сейчас наш менеджер свяжется с вами 😊"`
      }
    ]);
  }
  return chatSessions.get(senderId);
}

function handleOperatorTakeover(userId, text, minutes = 15) {
  const expiryTime = Date.now() + minutes * 60 * 1000;
  operatorSessions.set(userId, expiryTime);

  const history = getOrCreateSession(userId);
  if (text) {
    history.push({ role: "assistant", content: text });
    if (history.length > 25) {
      history.splice(1, 2);
    }
  }
}

function recordIncomingGreeting(userId, text) {
  const history = getOrCreateSession(userId);
  if (text) {
    history.push({ role: "assistant", content: text });
    if (history.length > 25) {
      history.splice(1, 2);
    }
  }
}

async function handleInstagramMessage(senderId, text, io) {
  const history = getOrCreateSession(senderId);
  history.push({ role: "user", content: text });

  // Limit history length to save tokens
  if (history.length > 25) {
    history.splice(1, 2); 
  }

  // Check if call operator is currently actively handling this chat (within 15 minutes)
  if (isOperatorActive(senderId)) {
    const remainingSecs = Math.round((operatorSessions.get(senderId) - Date.now()) / 1000);
    console.log(`[OPERATOR ACTIVE] User ${senderId} sent: "${text}". AI is muted for ${remainingSecs}s. Recorded message into chat history.`);
    return;
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log('Mocking AI response (No API key found)');
      let aiText = "Assalomu alaykum! Bizda xonalar 300,000 so'mdan boshlanadi. Telefon raqamingizni qoldirsangiz, operatorlarimiz aloqaga chiqishadi.";
      if (text.match(/\+?[0-9]{9,12}/)) {
        await saveLead(senderId, text, text.match(/\+?[0-9]{9,12}/)[0], io);
        aiText = "Rahmat! Operatorlarimiz tez orada sizga qo'ng'iroq qilishadi.";
      }
      history.push({ role: "assistant", content: aiText });
      await sendInstagramMessage(senderId, aiText);
      return;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: history,
      tools: [
        {
          type: "function",
          function: {
            name: "save_lead",
            description: "Mijoz xona bron qilmoqchi bo'lib telefon raqamini qoldirganda chaqiriladi.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Mijozning ismi (agar aytgan bo'lsa)" },
                phone: { type: "string", description: "Mijozning telefon raqami (+998 bilan)" },
              },
              required: ["phone"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "send_branch_location",
            description: "Mijoz biror filial lokatsiyasini yoki manzilini so'raganda interaktiv xarita kartochkasini (Yandex Xarita va Google Maps tugmalari bilan) yuborish uchun chaqiriladi.",
            parameters: {
              type: "object",
              properties: {
                branch_key: {
                  type: "string",
                  enum: [
                    "samarqand_1",
                    "samarqand_2",
                    "all_samarqand",
                    "yunusobod",
                    "parkentskiy",
                    "chorsu",
                    "mirobod",
                    "ttz",
                    "selxoz",
                    "buxoro",
                    "zangiota"
                  ],
                  description: "Qaysi filial lokatsiyasi so'ralgani."
                }
              },
              required: ["branch_key"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "send_branch_photos",
            description: "Mijoz xonalar yoki filial rasmlarini / suratlarini ko'rishni so'raganda chaqiriladi.",
            parameters: {
              type: "object",
              properties: {
                branch_key: {
                  type: "string",
                  enum: [
                    "samarqand_1",
                    "samarqand_2",
                    "all_samarqand",
                    "yunusobod",
                    "parkentskiy",
                    "chorsu",
                    "mirobod",
                    "ttz",
                    "selxoz",
                    "buxoro",
                    "zangiota"
                  ],
                  description: "Qaysi filial rasmlari so'ralgani. Agar aniq filial aytilmagan bo'lsa, mijoz so'ragan shahar yoki asosiy filial tanlanadi."
                }
              },
              required: ["branch_key"]
            }
          }
        }
      ],
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      let hasSavedLead = false;
      let hasSentLocationCard = false;
      let hasSentPhotos = false;

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === 'save_lead') {
          hasSavedLead = true;
          const args = JSON.parse(toolCall.function.arguments);
          const customerName = args.name || "Instagram Mijoz";
          const customerPhone = args.phone;
          
          await saveLead(senderId, customerName, customerPhone, io);
          
          history.push({
            role: "function",
            name: "save_lead",
            content: "Lid muvaffaqiyatli saqlandi. Mijoz yozgan tilda (ruscha bo'lsa ruscha, o'zbekcha bo'lsa o'zbekcha) minnatdorchilik bildiring va operator tezda bog'lanishini ayting."
          });
        }

        if (toolCall.function.name === 'send_branch_location') {
          hasSentLocationCard = true;
          const args = JSON.parse(toolCall.function.arguments);
          await sendInstagramLocationCard(senderId, args.branch_key);
          history.push({
            role: "function",
            name: "send_branch_location",
            content: `Filial xarita kartochkasi Yandex va Google Maps tugmalari bilan mijozga yuborildi. Mijoz yozgan tilda (ruscha bo'lsa ruscha, o'zbekcha bo'lsa o'zbekcha) xaritadan ko'rishi mumkinligini aytib, telefon raqamini so'rang.`
          });
        }

        if (toolCall.function.name === 'send_branch_photos') {
          hasSentPhotos = true;
          const args = JSON.parse(toolCall.function.arguments);
          await sendInstagramBranchPhotos(senderId, args.branch_key);
          history.push({
            role: "function",
            name: "send_branch_photos",
            content: "Filial xonalarining rasmlari mijozga yuborildi. Mijoz yozgan tilda (ruscha bo'lsa ruscha, o'zbekcha bo'lsa o'zbekcha) xona band qilish uchun telefon raqamini so'rang."
          });
        }
      }
      
      // Get final response after function call
      const secondResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: history
      });
      
      const reply = secondResponse.choices[0].message.content;
      if (reply) {
        history.push({ role: "assistant", content: reply });
        await sendInstagramMessage(senderId, reply);
      }
      
    } else {
      const reply = responseMessage.content;
      if (reply) {
        history.push({ role: "assistant", content: reply });
        await sendInstagramMessage(senderId, reply);
      }
    }
    
  } catch (err) {
    console.error('OpenAI Error:', err);
  }
}

async function saveLead(instagramId, name, phone, io) {
  try {
    const newLead = await prisma.lead.create({
      data: {
        companyId: 1, // Default company
        name: name,
        phone: phone,
        source: 'Instagram AI',
        stage: 'new',
        notes: `Instagram ID: ${instagramId}`
      }
    });
    console.log('New Lead created from Instagram:', newLead.id);
    
    // Notify via Socket.io
    if (io) {
      io.emit('new_lead', newLead);
    }
  } catch (error) {
    console.error('Error saving lead:', error);
  }
}

module.exports = {
  handleInstagramMessage,
  handleOperatorTakeover,
  recordIncomingGreeting,
  isOperatorActive,
  isSentByBot,
  extractLocationCoordinates,
  findNearestBranches
};
