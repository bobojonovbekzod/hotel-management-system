const TelegramBot = require('node-telegram-bot-api');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Token env faylida bo'lishi kerak: TELEGRAM_BOT_TOKEN
const token = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

if (token && token !== 'disabled') {
  bot = new TelegramBot(token, { polling: true });
}

const sessions = {}; // phone number authentication cache

const setupBot = () => {
  if (!bot) {
    console.log("Telegram bot o'chirib qo'yilgan yoki token yo'q.");
    return;
  }

  console.log("Telegram bot ishga tushdi...");

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Assalomu alaykum! Mehmonxona tizimiga xush kelibsiz. Iltimos, telefon raqamingizni yuboring (Pastdagi tugmani bosing):", {
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
      const user = await prisma.user.findFirst({
        where: { phone: phone, role: 'cleaner', isActive: true },
        include: { branch: true }
      });

      if (!user) {
        return bot.sendMessage(chatId, "Baza tizimidan sizning raqamingiz topilmadi yoki siz tozalik xodimi emassiz.", { reply_markup: { remove_keyboard: true } });
      }

      sessions[chatId] = { userId: user.id, companyId: user.companyId, branchId: user.branchId };
      
      bot.sendMessage(chatId, `Xush kelibsiz, ${user.name}! Siz ${user.branch.name} filialiga biriktirilgansiz. \n\nPastdagi menyudan foydalaning.`, {
        reply_markup: {
          keyboard: [
            [{ text: "🧹 Tozalanadigan xonalar" }]
          ],
          resize_keyboard: true
        }
      });
    } catch (error) {
      bot.sendMessage(chatId, "Xatolik yuz berdi. Qayta urinib ko'ring.");
    }
  });

  bot.onText(/🧹 Tozalanadigan xonalar/, async (msg) => {
    const chatId = msg.chat.id;
    const session = sessions[chatId];
    if (!session) return bot.sendMessage(chatId, "Iltimos, avval /start ni bosing va raqamingizni yuboring.");

    try {
      const rooms = await prisma.room.findMany({
        where: { branchId: session.branchId, status: 'cleaning' }
      });

      if (rooms.length === 0) {
        return bot.sendMessage(chatId, "Hozircha tozalanadigan xonalar yo'q. Dam oling! 😊");
      }

      const buttons = rooms.map(r => [{ text: `Xona #${r.roomNumber}`, callback_data: `clean_${r.id}` }]);

      bot.sendMessage(chatId, "Qaysi xonani tozalaysiz? Tanlang:", {
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (error) {
      bot.sendMessage(chatId, "Xatolik yuz berdi.");
    }
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const session = sessions[chatId];
    const data = query.data;

    if (!session) return bot.answerCallbackQuery(query.id, { text: "Ruxsat yo'q, /start ni bosing" });

    if (data.startsWith('clean_')) {
      const roomId = parseInt(data.split('_')[1]);
      
      // Create a pending cleaning task
      const task = await prisma.cleaningTask.create({
        data: {
          companyId: session.companyId,
          branchId: session.branchId,
          roomId,
          cleanerId: session.userId,
          status: 'pending'
        }
      });

      sessions[chatId].activeTask = task.id;

      bot.editMessageText(`Xona tayyorlanyapti... Iltimos, xonaning *tozalashdan oldingi* (iflos holati) rasmini yuboring.`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      });
    }
  });

  bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const session = sessions[chatId];
    if (!session || !session.activeTask) return;

    try {
      const taskId = session.activeTask;
      const task = await prisma.cleaningTask.findUnique({ where: { id: taskId }, include: { room: true } });
      if (!task) return;

      const fileId = msg.photo[msg.photo.length - 1].file_id;
      // In production, download file to /uploads/cleaners/...
      // For now, we just save the fileId or URL if we have one. We will just save fileId as image path mock.
      const fileUrl = await bot.getFileLink(fileId);

      if (!task.beforeImage) {
        await prisma.cleaningTask.update({
          where: { id: taskId },
          data: { beforeImage: fileUrl }
        });
        bot.sendMessage(chatId, "Rasm qabul qilindi! Rahmat. Endi xonani tozalang va *tozalashdan keyingi* (top-toza) rasmini yuboring.", { parse_mode: 'Markdown' });
      } else if (!task.afterImage) {
        await prisma.cleaningTask.update({
          where: { id: taskId },
          data: { afterImage: fileUrl, status: 'completed' }
        });

        // Update room status
        await prisma.room.update({
          where: { id: task.roomId },
          data: { status: 'available' }
        });

        session.activeTask = null;
        bot.sendMessage(chatId, `Barakalla! ${task.room.roomNumber}-xona toza deb belgilandi va tizimga qo'shildi. 🎉`);
      }
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, "Rasm yuklashda xatolik yuz berdi.");
    }
  });

};

module.exports = setupBot;
