const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot = TelegramBotModule.default || TelegramBotModule;
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const downloadImage = async (url) => {
  const fileName = `clean_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
  const uploadDir = path.join(__dirname, '../../uploads/cleaning');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filePath = path.join(uploadDir, fileName);
  
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    writer.on('finish', () => resolve(`/uploads/cleaning/${fileName}`));
    writer.on('error', reject);
  });
};

const prisma = new PrismaClient();
const token = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

if (token && token !== 'disabled') {
  bot = new TelegramBot(token, { polling: true });
}

const sessions = {}; // In-memory session cache

const setupBot = () => {
  if (!bot) {
    console.log("Telegram bot o'chirib qo'yilgan yoki token yo'q.");
    return;
  }

  console.log("Telegram bot ishga tushdi...");

  // Middleware to restore session from DB if it exists
  const restoreSession = async (chatId) => {
    if (sessions[chatId]) return sessions[chatId];
    const user = await prisma.user.findFirst({
      where: { telegram: chatId.toString(), isActive: true, role: 'cleaner' },
      include: { branch: true },
      orderBy: { createdAt: 'desc' }
    });
    if (user && user.branchId) {
      sessions[chatId] = { userId: user.id, companyId: user.companyId, branchId: user.branchId, role: user.role };
      
      const pendingTask = await prisma.cleaningTask.findFirst({
        where: { cleanerId: user.id, status: 'pending' },
        orderBy: { createdAt: 'desc' }
      });
      if (pendingTask) {
        sessions[chatId].activeTask = pendingTask.id;
      }
      
      return sessions[chatId];
    }
    return null;
  };

  const showMainMenu = (chatId, branchName) => {
    bot.sendMessage(chatId, `Siz *${branchName}* filialidasiz.\nIltimos, kerakli buyruqni tanlang:`, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [
          [{ text: "📸 Ishga keldim (Check-in)" }, { text: "🔄 Filialni o'zgartirish" }],
          [{ text: "🧹 Tozalanadigan xonalar" }],
          [{ text: "🏢 Koridorni tozalash" }, { text: "🛣 Ko'chani tozalash" }],
          [{ text: "📸 Ishdan ketdim (Check-out)" }]
        ],
        resize_keyboard: true
      }
    });
  };

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const session = await restoreSession(chatId);
    
    if (session) {
      const branch = await prisma.branch.findUnique({ where: { id: session.branchId } });
      return showMainMenu(chatId, branch ? branch.name : 'Noma\'lum');
    }

    bot.sendMessage(chatId, "Assalomu alaykum! Mehmonxona tozalik tizimiga xush kelibsiz.\nIltimos, telefon raqamingizni yuboring (Pastdagi tugmani bosing):", {
      reply_markup: {
        keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  });

  bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    let phone = msg.contact.phone_number;
    if (!phone.startsWith('+')) phone = '+' + phone;

    try {
      const incomingPhoneClean = msg.contact.phone_number.replace(/\D/g, '').slice(-9);

      const users = await prisma.user.findMany({
        where: { isActive: true, role: 'cleaner' },
        orderBy: { createdAt: 'desc' }
      });

      const user = users.find(u => {
        const dbPhoneClean = (u.phone || '').replace(/\D/g, '').slice(-9);
        return dbPhoneClean === incomingPhoneClean;
      });

      if (!user) {
        return bot.sendMessage(chatId, "Baza tizimidan sizning raqamingiz topilmadi yoki sizga ruxsat yo'q.", { reply_markup: { remove_keyboard: true } });
      }

      // Save telegram chat id to restore session later
      await prisma.user.update({
        where: { id: user.id },
        data: { telegram: chatId.toString() }
      });

      sessions[chatId] = { userId: user.id, companyId: user.companyId, branchId: user.branchId, role: user.role };

      // Branches selection
      const branches = await prisma.branch.findMany({ where: { companyId: user.companyId } });
      if (branches.length === 0) {
        return bot.sendMessage(chatId, "Filiallar topilmadi.");
      }

      const buttons = branches.map(b => [{ text: b.name, callback_data: `branch_${b.id}` }]);
      bot.sendMessage(chatId, `Xush kelibsiz, ${user.name}!\nIltimos, bugun qaysi filialda ishlashingizni tanlang:`, {
        reply_markup: { inline_keyboard: buttons, remove_keyboard: true }
      });

    } catch (error) {
      bot.sendMessage(chatId, "Xatolik yuz berdi. Qayta urinib ko'ring.");
    }
  });

  bot.onText(/🔄 Filialni o'zgartirish/, async (msg) => {
    const chatId = msg.chat.id;
    const session = await restoreSession(chatId);
    if (!session) return bot.sendMessage(chatId, "Iltimos, avval /start ni bosing.");

    const branches = await prisma.branch.findMany({ where: { companyId: session.companyId } });
    const buttons = branches.map(b => [{ text: b.name, callback_data: `branch_${b.id}` }]);
    bot.sendMessage(chatId, "Yangi filialni tanlang:", {
      reply_markup: { inline_keyboard: buttons }
    });
  });

  bot.onText(/^(🚪 Ishni yakunlash|\/logout)$/, async (msg) => {
    const chatId = msg.chat.id;
    const session = await restoreSession(chatId);
    if (!session) return bot.sendMessage(chatId, "Iltimos, avval /start ni bosing.");

    delete sessions[chatId];
    await prisma.user.update({
      where: { id: session.userId },
      data: { telegram: null } // Unlink device
    });

    bot.sendMessage(chatId, "Sizning smenangiz yopildi va tizimdan chiqdingiz. Rahmat, dam oling!", {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.onText(/📸 Ishga keldim \(Check-in\)/, async (msg) => {
    const chatId = msg.chat.id;
    const session = await restoreSession(chatId);
    if (!session) return bot.sendMessage(chatId, "Iltimos, avval /start ni bosing.");

    const url = `${process.env.FRONTEND_URL}/bot-camera?action=checkin&userId=${session.userId}`;
    
    bot.sendMessage(chatId, "Ishni boshlash (Check-in) uchun quyidagi tugmani bosib, kamerada rasmga tushiring:", {
      reply_markup: {
        inline_keyboard: [[
          { text: "📷 Jonli Kamerani Ochish", web_app: { url } }
        ]]
      }
    });
  });

  bot.onText(/📸 Ishdan ketdim \(Check-out\)/, async (msg) => {
    const chatId = msg.chat.id;
    const session = await restoreSession(chatId);
    if (!session) return bot.sendMessage(chatId, "Iltimos, avval /start ni bosing.");

    const url = `${process.env.FRONTEND_URL}/bot-camera?action=checkout&userId=${session.userId}`;

    bot.sendMessage(chatId, "Ishni yakunlash (Check-out) uchun quyidagi tugmani bosib, kamerada rasmga tushiring:", {
      reply_markup: {
        inline_keyboard: [[
          { text: "📷 Jonli Kamerani Ochish", web_app: { url } }
        ]]
      }
    });
  });

  const checkCanClean = async (userId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const record = await prisma.attendance.findFirst({
      where: { userId: userId, workDate: today }
    });
    
    if (!record || !record.checkIn) {
      return { canClean: false, message: "Iltimos, ishni boshlash uchun avval '📸 Ishga keldim (Check-in)' tugmasini bosing." };
    }
    
    if (record.checkOut) {
      return { canClean: false, message: "Siz bugungi ishingizni yakunlagansiz (Check-out qilingan). Rahmat, dam oling! 😊" };
    }
    
    return { canClean: true };
  };

  bot.onText(/🧹 Tozalanadigan xonalar/, async (msg) => {
    const chatId = msg.chat.id;
    const session = await restoreSession(chatId);
    if (!session || !session.branchId) return bot.sendMessage(chatId, "Iltimos, avval /start ni bosing va filialni tanlang.");

    const attendanceCheck = await checkCanClean(session.userId);
    if (!attendanceCheck.canClean) return bot.sendMessage(chatId, attendanceCheck.message);

    if (session.activeTask) {
      return bot.sendMessage(chatId, "Sizda tugallanmagan tozalash ishi bor. Iltimos, avval rasm yuborib uni yakunlang yoki bekor qiling.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: `cancel_${session.activeTask}` }]]
        }
      });
    }

    try {
      // 1. Get all pending tasks in this branch (rooms that are currently locked by someone)
      const pendingTasks = await prisma.cleaningTask.findMany({
        where: { branchId: session.branchId, status: 'pending' }
      });
      const lockedRoomIds = pendingTasks.map(t => t.roomId);

      // 2. Fetch rooms that are cleaning/maintenance and NOT locked
      const rooms = await prisma.room.findMany({
        where: { 
          branchId: session.branchId, 
          status: { in: ['cleaning', 'maintenance'] },
          id: { notIn: lockedRoomIds }
        }
      });

      if (rooms.length === 0) {
        return bot.sendMessage(chatId, "Hozircha tozalanadigan xonalar yo'q.");
      }

      const buttons = rooms.map(r => [{ text: `Xona #${r.roomNumber}`, callback_data: `clean_${r.id}` }]);

      bot.sendMessage(chatId, "Qaysi xonani tozalaysiz? (Tanlaganingizdan keyin u boshqa farroshlarga ko'rinmaydi):", {
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (error) {
      bot.sendMessage(chatId, "Xatolik yuz berdi.");
    }
  });

  bot.onText(/🏢 Koridorni tozalash/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const session = await restoreSession(chatId);
      if (!session || !session.branchId) return bot.sendMessage(chatId, "Iltimos, avval /start ni bosing va filialni tanlang.");

      const attendanceCheck = await checkCanClean(session.userId);
      if (!attendanceCheck.canClean) return bot.sendMessage(chatId, attendanceCheck.message);

      if (session.activeTask) {
        return bot.sendMessage(chatId, "Sizda tugallanmagan tozalash ishi bor. Iltimos, avval rasm yuborib uni yakunlang yoki bekor qiling.", {
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: `cancel_${session.activeTask}` }]]
          }
        });
      }

      const task = await prisma.cleaningTask.create({
        data: {
          companyId: session.companyId,
          branchId: session.branchId,
          cleanerId: session.userId,
          taskType: 'corridor',
          status: 'pending'
        }
      });
      sessions[chatId].activeTask = task.id;

      const frontendUrl = process.env.FRONTEND_URL || 'https://hotelbase.uz';
      const liveCameraUrl = `${frontendUrl}/bot-camera?userId=${session.userId}&action=cleaning_before&taskId=${task.id}`;

      bot.sendMessage(chatId, "Siz koridorni tozalashni boshladingiz! 🏢\n\nIltimos, galereyadan rasm yubormang! Pastdagi *📸 Jonli Kamerani Ochish* tugmasini bosib, real vaqtda rasmga oling.", {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "📸 Jonli Kamerani Ochish", web_app: { url: liveCameraUrl } }],
            [{ text: "❌ Bekor qilish", callback_data: `cancel_${task.id}` }]
          ]
        }
      });
    } catch (error) {
      console.error("Koridorni tozalash error:", error);
      bot.sendMessage(chatId, "Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    }
  });

  bot.onText(/🛣 Ko'chani tozalash/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const session = await restoreSession(chatId);
      if (!session || !session.branchId) return bot.sendMessage(chatId, "Iltimos, avval /start ni bosing va filialni tanlang.");

      const attendanceCheck = await checkCanClean(session.userId);
      if (!attendanceCheck.canClean) return bot.sendMessage(chatId, attendanceCheck.message);

      if (session.activeTask) {
        return bot.sendMessage(chatId, "Sizda tugallanmagan tozalash ishi bor. Iltimos, avval rasm yuborib uni yakunlang yoki bekor qiling.", {
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: `cancel_${session.activeTask}` }]]
          }
        });
      }

      const task = await prisma.cleaningTask.create({
        data: {
          companyId: session.companyId,
          branchId: session.branchId,
          cleanerId: session.userId,
          taskType: 'street',
          status: 'pending'
        }
      });
      sessions[chatId].activeTask = task.id;

      const frontendUrl = process.env.FRONTEND_URL || 'https://hotelbase.uz';
      const streetCameraUrl = `${frontendUrl}/bot-camera?userId=${session.userId}&action=cleaning_before&taskId=${task.id}`;

      bot.sendMessage(chatId, "Siz ko'chani tozalashni boshladingiz! 🛣\n\nIltimos, galereyadan rasm yubormang! Pastdagi *📸 Jonli Kamerani Ochish* tugmasini bosib, real vaqtda rasmga oling.", {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "📸 Jonli Kamerani Ochish", web_app: { url: streetCameraUrl } }],
            [{ text: "❌ Bekor qilish", callback_data: `cancel_${task.id}` }]
          ]
        }
      });
    } catch (error) {
      console.error("Ko'chani tozalash error:", error);
      bot.sendMessage(chatId, "Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    }
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const session = await restoreSession(chatId);
    const data = query.data;

    if (!session) return bot.answerCallbackQuery(query.id, { text: "Ruxsat yo'q, /start ni bosing" });

    // Handle Branch Selection
    if (data.startsWith('branch_')) {
      const branchId = parseInt(data.split('_')[1]);
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) return bot.answerCallbackQuery(query.id, { text: "Filial topilmadi" });

      sessions[chatId].branchId = branchId;
      await prisma.user.update({
        where: { id: session.userId },
        data: { branchId }
      });

      bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
      bot.answerCallbackQuery(query.id, { text: "Filial saqlandi" });
      showMainMenu(chatId, branch.name);
      return;
    }

    // Handle Cancel Cleaning Task
    if (data.startsWith('cancel_')) {
      const taskId = parseInt(data.split('_')[1]);
      await prisma.cleaningTask.delete({ where: { id: taskId } });
      sessions[chatId].activeTask = null;
      bot.editMessageText("Xonani tozalash bekor qilindi. Boshqa farroshlar bu xonani olishi mumkin.", {
        chat_id: chatId,
        message_id: query.message.message_id
      });
      bot.answerCallbackQuery(query.id);
      return;
    }

    // Handle Room Selection
    if (data.startsWith('clean_')) {
      const roomId = parseInt(data.split('_')[1]);
      
      // Check if there is an existing pending/in_progress task for this room
      let task = await prisma.cleaningTask.findFirst({
        where: { roomId, status: { in: ['pending', 'in_progress'] } }
      });

      if (task) {
        if (task.cleanerId && task.cleanerId !== session.userId) {
          return bot.answerCallbackQuery(query.id, { text: "Kechirasiz, bu xonani allaqachon boshqa farrosh oldi!", show_alert: true });
        }
        // Assign/Claim this existing task for the current cleaner
        task = await prisma.cleaningTask.update({
          where: { id: task.id },
          data: { cleanerId: session.userId }
        });
      } else {
        // Create a pending cleaning task (LOCK THE ROOM)
        task = await prisma.cleaningTask.create({
          data: {
            companyId: session.companyId,
            branchId: session.branchId,
            roomId,
            cleanerId: session.userId,
            status: 'pending'
          }
        });
      }

      sessions[chatId].activeTask = task.id;

      const frontendUrl = process.env.FRONTEND_URL || 'https://hotelbase.uz';
      const liveCameraUrl = `${frontendUrl}/bot-camera?userId=${session.userId}&action=cleaning_before&taskId=${task.id}`;

      bot.editMessageText(`Siz xonani qulfladingiz 🔒\nBoshqalar uni ko'ra olmaydi.\n\nIltimos, galereyadan rasm yubormang! Pastdagi *📸 Jonli Kamerani Ochish* tugmasini bosib, real vaqtda rasmga oling.`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "📸 Jonli Kamerani Ochish", web_app: { url: liveCameraUrl } }],
            [{ text: "❌ Bekor qilish", callback_data: `cancel_${task.id}` }]
          ]
        }
      });
      bot.answerCallbackQuery(query.id);
    }
  });

  bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "⚠️ Galereyadan yoki chatdan rasm yuborish taqiqlangan!\n\nIltimos, xonaning tozaligini va real vaqtni tasdiqlash uchun pastdagi \"📸 Jonli Kamerani Ochish\" Web-App tugmasi orqali rasmga oling.");
  });

};

const sendBotMessage = (chatId, text, options) => {
  if (bot) {
    bot.sendMessage(chatId, text, options).catch(err => console.error("Telegram send message xatosi:", err));
  }
};

module.exports = { setupBot, sendBotMessage };
