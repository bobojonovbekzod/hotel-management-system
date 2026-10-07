const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { authenticate, authorize } = require('../middleware/auth');
const {
  guestPublicLimiter,
  guestRequestLimiter,
  guestChatLimiter,
  sanitizeText
} = require('../middleware/rateLimiter');
const {
  translateGuestMessage,
  translateStaffReply,
  getSmartConciergeReply
} = require('../services/geminiService');
const { sendBotMessage } = require('../bot/telegramBot');

const BRANCH_WIFI_CONFIG = {
  'Selxoz': { phone: '+998 33 701 05 55', wifiName: 'Comnet', wifiPass: 'Family4545' },
  'Samarqand 2': { phone: '+998 33 718 05 55', wifiName: 'Buston', wifiPass: '09092013' },
  'Samarqand': { phone: '+998 33 713 05 55', wifiName: 'FAMILY-5G', wifiPass: 'family4545' },
  'Buxoro': { phone: '+998 33 716 05 55', wifiName: 'Family_Hotel_5G', wifiPass: '886890689' },
  'Yunusobod': { phone: '+998 33 152 11 11', wifiName: 'Familygav_EXT', wifiPass: '12345678f' },
  'Parkentskiy': { phone: '+998 33 703 05 55', wifiName: 'FAMILY', wifiPass: 'Family4545' },
  'TTZ': { phone: '+998 33 702 05 55', wifiName: 'FAMILY-4G', wifiPass: 'Family4545' },
};

function getBranchConfig(branchName) {
  for (const key of Object.keys(BRANCH_WIFI_CONFIG)) {
    if (branchName.toLowerCase().includes(key.toLowerCase())) {
      return BRANCH_WIFI_CONFIG[key];
    }
  }
  return { 
    phone: '+998 55 500 00 00', 
    wifiName: `HotelBase_${branchName.replace(/\s+/g, '')}`, 
    wifiPass: 'hotelbase2026' 
  };
}

// Secure upload configuration for guest issue photos
const uploadDir = path.join(__dirname, '../../uploads/guest_requests');
if (!fs.existsSync(uploadDir)) {
  try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari qabul qilinadi.'));
    }
  }
});

/**
 * Helper to broadcast guest notifications to Telegram staff & group
 */
async function notifyStaffViaTelegram(branch, roomNumber, payload) {
  const branchTag = `#${(branch.name || 'Filial').replace(/\s+/g, '_')}`;
  const roomTag = `#Xona_${roomNumber}`;
  const categoryIcon = {
    housekeeping: '🧹 Tozalash (Housekeeping)',
    maintenance: '❄️ Texnik nosozlik (Maintenance)',
    amenities: '🧴 Sochiq / Buyumlar (Amenities)',
    dining: '🍽️ Restoran / Nonushta',
    chat: '💬 Xabar / Savol',
    general: '🛎️ Umumiy xizmat'
  }[payload.category] || '🛎️ Xizmat so\'rovi';

  const telegramMsg = 
`🔔 <b>YANGI MEHMON XABARI</b>

🏨 <b>Filial:</b> ${branch.name} ${branchTag}
🚪 <b>Xona:</b> ${roomNumber}-xona ${roomTag}
🏷 <b>Turi:</b> ${categoryIcon}
🌐 <b>Mehmon tili:</b> ${payload.detectedLangName || payload.guestLanguage || 'Inglizcha'}

💬 <b>Mehmon yozgan asl xabar:</b>
<i>"${payload.originalMessage}"</i>

🇺🇿 <b>O'zbekcha tarjimasi (AI):</b>
<b>"${payload.translatedMessageUz}"</b>

⏰ <b>Vaqt:</b> ${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;

  // 1. If global staff group ID is set in .env
  const staffGroupId = process.env.TELEGRAM_STAFF_GROUP_ID;
  if (staffGroupId && staffGroupId !== 'disabled') {
    sendBotMessage(staffGroupId, telegramMsg, { parse_mode: 'HTML' });
  }

  // 2. Also send directly to active admins and supervisors of this branch who linked Telegram
  try {
    const branchStaff = await prisma.user.findMany({
      where: {
        branchId: branch.id,
        isActive: true,
        telegram: { not: null },
        role: { in: ['admin', 'director', 'supervisor', 'cleaner'] }
      },
      select: { telegram: true }
    });

    for (const staff of branchStaff) {
      if (staff.telegram && staff.telegram !== staffGroupId) {
        sendBotMessage(staff.telegram, telegramMsg, { parse_mode: 'HTML' });
      }
    }
  } catch (e) {
    console.error('[Telegram Notify Error]', e.message);
  }
}

// In-memory live tracking of the active language currently open on each room's phone screen
const roomActiveLanguageMap = new Map(); // key: `${branchId}_${roomNumber}` -> 'hi', 'de', 'ru', etc.

// ==========================================
// 1. PUBLIC GUEST ROUTES (Strict Zero-Trust)
// ==========================================

/**
 * GET /api/guest/info/:branchId/:roomNumber
 * Fetches public room & branch info without exposing private hotel data.
 */
router.get('/info/:branchId/:roomNumber', guestPublicLimiter, async (req, res) => {
  try {
    const { branchId, roomNumber } = req.params;
    const bId = parseInt(branchId, 10);

    if (isNaN(bId) || !roomNumber) {
      return res.status(400).json({ success: false, message: 'Filial yoki xona raqami noto\'g\'ri' });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: bId },
      include: { company: true }
    });

    if (!branch || !branch.isActive) {
      return res.status(404).json({ success: false, message: 'Filial topilmadi' });
    }

    const room = await prisma.room.findFirst({
      where: { branchId: bId, roomNumber: roomNumber.toString() }
    });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Xona topilmadi' });
    }

    if (req.query.lang) {
      const cleanLang = req.query.lang.toLowerCase().slice(0, 5);
      roomActiveLanguageMap.set(`${bId}_${room.roomNumber}`, cleanLang);
    }

    const bConfig = getBranchConfig(branch.name);

    // Return ONLY safe public display properties
    return res.json({
      success: true,
      data: {
        companyId: branch.companyId,
        companyName: branch.company?.name || 'HotelBase',
        companyLogo: branch.company?.logoUrl || null,
        branchId: branch.id,
        branchName: branch.name,
        branchAddress: branch.address || 'Toshkent sh.',
        branchPhone: bConfig.phone,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        floor: room.floor,
        wifiName: bConfig.wifiName,
        wifiPass: bConfig.wifiPass,
        breakfastHours: '07:00 - 10:30',
        checkoutHours: '12:00'
      }
    });
  } catch (error) {
    console.error('[Guest Info Error]', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

/**
 * POST /api/guest/request
 * Guest submits an issue, housekeeping request, or amenity order.
 */
router.post('/request', upload.single('photo'), guestRequestLimiter, async (req, res) => {
  try {
    const {
      branchId,
      roomNumber,
      category = 'general',
      message = '',
      guestName = 'Guest',
      guestLanguage = 'en'
    } = req.body;

    const bId = parseInt(branchId, 10);
    const cleanRoom = sanitizeText(roomNumber, 20);
    const cleanMessage = sanitizeText(message, 600);
    const cleanGuestName = sanitizeText(guestName, 50) || 'Guest';

    if (!bId || !cleanRoom || !cleanMessage) {
      return res.status(400).json({ success: false, message: 'Xona va xabar matni talab qilinadi' });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: bId },
      include: { company: true }
    });

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Filial topilmadi' });
    }

    // Real-time AI Translation to Uzbek
    const aiAnalysis = await translateGuestMessage(cleanMessage);
    const translatedUz = aiAnalysis.uzbekTranslation || cleanMessage;
    const detectedCategory = category !== 'general' ? category : (aiAnalysis.category || 'general');

    const photoUrl = req.file ? `/api/uploads/guest_requests/${req.file.filename}` : null;

    // Create persistent record in DB
    const newRequest = await prisma.guestRequest.create({
      data: {
        companyId: branch.companyId,
        branchId: branch.id,
        roomNumber: cleanRoom,
        category: detectedCategory,
        guestName: cleanGuestName,
        guestLanguage: aiAnalysis.detectedLang || guestLanguage,
        originalMessage: cleanMessage,
        translatedMessageUz: translatedUz,
        photoUrl,
        status: 'pending'
      }
    });

    // Notify Real-Time WebSocket to Reception Dashboards
    if (req.io) {
      req.io.emit('new_guest_request', {
        ...newRequest,
        branchName: branch.name,
        detectedLangName: aiAnalysis.detectedLangName
      });
    }

    // Notify Telegram Group & Staff (O'chirilgan - mijoz talabiga ko'ra)
    /* notifyStaffViaTelegram(branch, cleanRoom, {
      category: detectedCategory,
      detectedLangName: aiAnalysis.detectedLangName,
      guestLanguage,
      originalMessage: cleanMessage,
      translatedMessageUz: translatedUz
    }); */

    // Provide friendly confirmation in guest's language
    const confirmationTranslations = {
      en: "Thank you! Your request has been received by the reception team.",
      ru: "Спасибо! Ваш запрос передан администратору.",
      uz: "Rahmat! So'rovingiz qabul qilindi, tez orada bajariladi.",
      zh: "谢谢！前台已收到您的请求。",
      ar: "شكرا لك! تم استلام طلبك من قبل موظفي الاستقبال.",
      tr: "Teşekkür ederiz! Talebiniz resepsiyona iletildi."
    };
    const ackMsg = confirmationTranslations[aiAnalysis.detectedLang] || confirmationTranslations.en;

    return res.json({
      success: true,
      message: ackMsg,
      data: newRequest
    });
  } catch (error) {
    console.error('[Guest Request Error]', error);
    res.status(500).json({ success: false, message: 'So\'rovni yuborishda xatolik yuz berdi' });
  }
});

/**
 * POST /api/guest/language
 * Guest updates active language on mobile portal
 */
router.post('/language', async (req, res) => {
  try {
    const { branchId, roomNumber, sessionId, language } = req.body;
    const cleanLang = (language || 'en').toLowerCase().slice(0, 5);
    const bId = parseInt(branchId, 10);
    const cleanRoom = sanitizeText(roomNumber, 20);

    if (bId && cleanRoom) {
      roomActiveLanguageMap.set(`${bId}_${cleanRoom}`, cleanLang);

      await prisma.guestRequest.updateMany({
        where: {
          branchId: bId,
          roomNumber: cleanRoom,
          status: { in: ['pending', 'in_progress'] }
        },
        data: { guestLanguage: cleanLang }
      });

      if (req.io) {
        req.io.emit('guest_language_changed', {
          branchId: bId,
          roomNumber: cleanRoom,
          language: cleanLang
        });
      }
    }

    return res.json({ success: true, language: cleanLang });
  } catch (err) {
    return res.json({ success: false });
  }
});

/**
 * GET /api/guest/active-lang/:branchId/:roomNumber
 * Admin fetches the live language chosen on guest phone
 */
router.get('/active-lang/:branchId/:roomNumber', async (req, res) => {
  try {
    const { branchId, roomNumber } = req.params;
    const bId = parseInt(branchId, 10) || 1;
    const cleanRoom = sanitizeText(roomNumber, 20) || '0';

    const live = roomActiveLanguageMap.get(`${bId}_${cleanRoom}`);
    if (live) {
      return res.json({ success: true, language: live });
    }

    const reqItem = await prisma.guestRequest.findFirst({
      where: { branchId: bId, roomNumber: cleanRoom },
      orderBy: { id: 'desc' }
    });

    return res.json({ success: true, language: reqItem?.guestLanguage || 'en' });
  } catch (err) {
    return res.json({ success: false, language: 'en' });
  }
});

/**
 * POST /api/guest/chat
 * Guest sends a chat message. Real-time translation to Uzbek and instant AI concierge.
 */
router.post('/chat', guestChatLimiter, async (req, res) => {
  try {
    const {
      branchId,
      roomNumber,
      sessionId,
      message,
      guestLanguage = 'auto',
      guestName = 'Guest'
    } = req.body;

    const bId = parseInt(branchId, 10);
    const cleanRoom = sanitizeText(roomNumber, 20);
    const cleanMessage = sanitizeText(message, 600);
    const cleanGuestName = sanitizeText(guestName, 50) || 'Guest';
    const cleanSessionId = sanitizeText(sessionId, 100) || `room_${bId}_${cleanRoom}_${new Date().toISOString().slice(0,10)}`;

    if (!bId || !cleanRoom || !cleanMessage) {
      return res.status(400).json({ success: false, message: 'Xabar matni bo\'sh bo\'lishi mumkin emas' });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: bId },
      include: { company: true }
    });

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Filial topilmadi' });
    }

    // 1. Translate Guest message to Uzbek
    const aiTranslation = await translateGuestMessage(cleanMessage, guestLanguage);
    const translatedUz = aiTranslation.uzbekTranslation || cleanMessage;
    const detectedLang = aiTranslation.detectedLang || 'en';

    // 2. Save Guest Message to DB
    const guestMsgRecord = await prisma.guestChatMessage.create({
      data: {
        companyId: branch.companyId,
        branchId: branch.id,
        roomNumber: cleanRoom,
        sessionId: cleanSessionId,
        sender: 'guest',
        senderName: cleanGuestName,
        originalText: cleanMessage,
        translatedText: translatedUz,
        sourceLang: detectedLang,
        targetLang: 'uz',
        isRead: false
      }
    });

    // 3. Automatically create or update active GuestRequest ticket for Reception Dashboard
    let activeRequest = await prisma.guestRequest.findFirst({
      where: {
        branchId: branch.id,
        roomNumber: cleanRoom,
        status: { in: ['pending', 'in_progress'] }
      }
    });

    if (activeRequest) {
      activeRequest = await prisma.guestRequest.update({
        where: { id: activeRequest.id },
        data: {
          originalMessage: cleanMessage,
          translatedMessageUz: translatedUz,
          guestLanguage: detectedLang,
          status: 'pending',
          updatedAt: new Date()
        }
      });
    } else {
      activeRequest = await prisma.guestRequest.create({
        data: {
          companyId: branch.companyId,
          branchId: branch.id,
          roomNumber: cleanRoom,
          guestName: cleanGuestName,
          category: 'chat',
          originalMessage: cleanMessage,
          translatedMessageUz: translatedUz,
          guestLanguage: detectedLang,
          status: 'pending'
        }
      });
    }

    // 4. (Autonomous FAQ reply disabled: Staff communicates directly with live translation)

    // 5. WebSocket broadcast to Admin Reception Dashboard
    if (req.io) {
      req.io.emit('new_guest_request', {
        ...activeRequest,
        branchName: branch.name,
        detectedLangName: aiTranslation.detectedLangName
      });
      req.io.emit('guest_chat_message', {
        ...guestMsgRecord,
        branchName: branch.name,
        detectedLangName: aiTranslation.detectedLangName
      });
    }

    // 6. Telegram notification to staff (O'chirilgan)
    /* notifyStaffViaTelegram(branch, cleanRoom, {
      category: 'chat',
      detectedLangName: aiTranslation.detectedLangName,
      guestLanguage: detectedLang,
      originalMessage: cleanMessage,
      translatedMessageUz: translatedUz
    }); */

    return res.json({
      success: true,
      data: {
        guestMessage: guestMsgRecord,
        aiReply: null,
        detectedLang: aiTranslation.detectedLang,
        detectedLangName: aiTranslation.detectedLangName
      }
    });
  } catch (error) {
    console.error('[Guest Chat Error]', error);
    res.status(500).json({ success: false, message: 'Xabarni yuborishda xatolik' });
  }
});

/**
 * GET /api/guest/chat/:sessionId
 * Guest fetches chat history for their current room session.
 */
router.get('/chat/:sessionId', guestPublicLimiter, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const cleanSessionId = sanitizeText(sessionId, 100);

    if (!cleanSessionId) {
      return res.status(400).json({ success: false, message: 'Sessiya ID talab qilinadi' });
    }

    const messages = await prisma.guestChatMessage.findMany({
      where: { sessionId: cleanSessionId },
      orderBy: { createdAt: 'asc' },
      take: 50
    });

    return res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('[Guest Chat Fetch Error]', error);
    res.status(500).json({ success: false, message: 'Xabarlarni yuklashda xatolik' });
  }
});

// ==============================================
// 2. ADMIN PROTECTED ROUTES (JWT Auth Required)
// ==============================================

/**
 * GET /api/guest-requests
 * Reception / Admin views all guest requests & stats
 */
router.get('/admin/requests', authenticate, async (req, res) => {
  try {
    const { branchId, status, category, limit = 50 } = req.query;
    const where = {};

    // Filter by company
    if (req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    // Filter by branch
    if (branchId) {
      where.branchId = parseInt(branchId, 10);
    } else if (req.user.branchId && req.user.role !== 'superadmin' && req.user.role !== 'owner') {
      where.branchId = req.user.branchId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    const requests = await prisma.guestRequest.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10) || 50
    });

    const pendingCount = await prisma.guestRequest.count({
      where: { ...where, status: 'pending' }
    });

    return res.json({
      success: true,
      data: requests,
      stats: { pendingCount, total: requests.length }
    });
  } catch (error) {
    console.error('[Admin Requests Error]', error);
    res.status(500).json({ success: false, message: 'Ma\'lumotlarni yuklashda xatolik' });
  }
});

/**
 * PATCH /api/guest-requests/:id/status
 * Admin marks request as in_progress, resolved, or cancelled
 */
router.patch('/admin/requests/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const reqId = parseInt(id, 10);
    if (isNaN(reqId)) {
      return res.status(400).json({ success: false, message: 'ID noto\'g\'ri' });
    }

    const existing = await prisma.guestRequest.findUnique({ where: { id: reqId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'So\'rov topilmadi' });
    }

    const updated = await prisma.guestRequest.update({
      where: { id: reqId },
      data: {
        status: status || existing.status,
        adminNotes: adminNotes !== undefined ? sanitizeText(adminNotes, 500) : existing.adminNotes,
        resolvedAt: status === 'resolved' ? new Date() : existing.resolvedAt,
        resolvedById: status === 'resolved' ? req.user.id : existing.resolvedById
      },
      include: {
        branch: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } }
      }
    });

    if (req.io) {
      req.io.emit('guest_request_status_updated', updated);
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Admin Update Status Error]', error);
    res.status(500).json({ success: false, message: 'Holatni o\'zgartirishda xatolik' });
  }
});

/**
 * POST /api/guest-requests/reply
 * Reception replies in Uzbek -> AI translates into Guest's language -> Guest sees it in chat
 */
router.post('/admin/reply', authenticate, async (req, res) => {
  try {
    const { sessionId, roomNumber, branchId, replyTextUz, guestLanguage, overrideLang } = req.body;

    const cleanReplyUz = sanitizeText(replyTextUz, 800);
    if (!cleanReplyUz || !sessionId) {
      return res.status(400).json({ success: false, message: 'Javob matni va sessiya ID talab qilinadi' });
    }

    const bId = parseInt(branchId, 10) || req.user.branchId || 1;
    const cleanRoom = roomNumber ? roomNumber.toString() : '0';

    // 1. Check if admin explicitly overrode target language in admin chat dropdown
    let targetLang = overrideLang;

    // 2. Check live language currently open on the guest's mobile phone screen
    if (!targetLang || targetLang === 'auto') {
      targetLang = roomActiveLanguageMap.get(`${bId}_${cleanRoom}`);
    }

    // 3. If passed as guestLanguage
    if (!targetLang || targetLang === 'auto') {
      if (guestLanguage && guestLanguage !== 'auto') {
        targetLang = guestLanguage;
      }
    }

    // 4. Fallback to latest active request in DB
    if (!targetLang || targetLang === 'auto') {
      const activeReq = await prisma.guestRequest.findFirst({
        where: {
          branchId: bId,
          roomNumber: cleanRoom
        },
        orderBy: { id: 'desc' }
      });
      if (activeReq && activeReq.guestLanguage) {
        targetLang = activeReq.guestLanguage;
      }
    }

    // 5. Fallback to latest guest chat message
    if (!targetLang || targetLang === 'auto') {
      const lastGuestMsg = await prisma.guestChatMessage.findFirst({
        where: {
          sessionId: sessionId,
          sender: 'guest'
        },
        orderBy: { id: 'desc' }
      });
      if (lastGuestMsg && lastGuestMsg.sourceLang) {
        targetLang = lastGuestMsg.sourceLang;
      }
    }

    if (!targetLang) targetLang = 'en';

    console.log(`[Admin Reply] Room: ${cleanRoom}, TargetLang: ${targetLang}, UzText: "${cleanReplyUz}"`);

    // AI Translation from Uzbek into Guest's language
    const aiTranslation = await translateStaffReply(cleanReplyUz, targetLang);
    const translatedGuestText = aiTranslation.translatedText || cleanReplyUz;

    const replyMessage = await prisma.guestChatMessage.create({
      data: {
        companyId: req.user.companyId || 1,
        branchId: bId,
        roomNumber: cleanRoom,
        sessionId: sessionId,
        sender: 'staff',
        senderName: req.user.name || 'Reception',
        originalText: cleanReplyUz,
        translatedText: translatedGuestText,
        sourceLang: 'uz',
        targetLang: targetLang,
        isRead: true
      }
    });

    try {
      await prisma.guestRequest.updateMany({
        where: {
          branchId: bId,
          roomNumber: cleanRoom,
          status: { in: ['pending', 'in_progress'] }
        },
        data: { guestLanguage: targetLang }
      });
    } catch (e) {}

    if (req.io) {
      req.io.emit('guest_chat_message', replyMessage);
    }

    return res.json({
      success: true,
      data: replyMessage
    });
  } catch (error) {
    console.error('[Admin Reply Error]', error);
    res.status(500).json({ success: false, message: 'Javob yuborishda xatolik' });
  }
});

/**
 * GET /api/guest-requests/chat/:sessionId
 * Admin views complete conversation thread for a specific room session
 */
router.get('/admin/chat/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await prisma.guestChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({ success: true, data: messages });
  } catch (error) {
    console.error('[Admin Chat View Error]', error);
    res.status(500).json({ success: false, message: 'Chatni yuklashda xatolik' });
  }
});

module.exports = router;
