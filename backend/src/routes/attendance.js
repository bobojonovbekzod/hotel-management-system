const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const { sendBotMessage } = require('../bot/telegramBot');

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer();

// GET /api/attendance/my-status - User's current attendance status
router.get('/my-status', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await prisma.attendance.findFirst({
      where: { userId: req.user.id, workDate: today }
    });

    let status = 'none';
    if (record) {
      if (record.checkOut) {
        status = 'checked_out';
      } else if (record.checkIn) {
        status = 'checked_in';
      }
    }

    res.json({ success: true, status });
  } catch (error) {
    console.error('My status error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// GET /api/attendance - Davomat hisoboti
router.get('/', authenticate, authorize('owner', 'director', 'supervisor'), async (req, res) => {
  try {
    const { branchId, date } = req.query;
    const where = { companyId: req.user.companyId };

    if (req.user.role === 'director') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = parseInt(branchId);
    }

    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      where.workDate = targetDate;
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
        branch: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// POST /api/attendance/webhook - Face ID dan keladigan xabarni qabul qilish
router.post('/webhook', upload.any(), async (req, res) => {
  try {
    console.log("🔔 [WEBHOOK] Request received from Hikvision!");
    console.log("Body:", JSON.stringify(req.body, null, 2));

    // Hikvision body yoki fayl ichida (masalan, event_log) ma'lumot jo'natadi.
    let eventBody = req.body;
    let employeeNo = null;

    // Agar ma'lumot JSON qilib fayl sifatida kelgan bo'lsa (Multipart form data)
    if (req.files && req.files.length > 0) {
      const eventFile = req.files.find(f => f.fieldname === 'event_log' || f.originalname?.includes('event'));
      if (eventFile) {
        try {
          const fileStr = eventFile.buffer.toString('utf8');
          eventBody = JSON.parse(fileStr);
          console.log("PARSED JSON FROM FILE:", JSON.stringify(eventBody, null, 2));
        } catch (e) {
          console.log("Fayldan JSON o'qib bo'lmadi:", e.message);
        }
      }
    } else if (typeof eventBody.AccessControllerEvent === 'string') {
      try {
        eventBody.AccessControllerEvent = JSON.parse(eventBody.AccessControllerEvent);
      } catch (e) {
        console.log("JSON parse error:", e.message);
      }
    }

    // JSON format bo'lsa:
    if (eventBody?.AccessControllerEvent?.AccessControllerEvent?.employeeNoString) {
      employeeNo = eventBody.AccessControllerEvent.AccessControllerEvent.employeeNoString;
    } else if (eventBody?.AccessControllerEvent?.employeeNoString) {
      employeeNo = eventBody.AccessControllerEvent.employeeNoString;
    } else if (eventBody?.employeeNo) {
      employeeNo = eventBody.employeeNo;
    }

    if (!employeeNo) {
      console.log('Employee number not found in event, ignoring.');
      return res.status(200).send('OK'); // 400 o'rniga 200 qaytaramiz, qurilma qayta-qayta yubormasligi uchun
    }

    const userId = parseInt(employeeNo);

    // Xodimni topamiz
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log('User not found in DB, ignoring.');
      return res.status(200).send('OK'); // 404 o'rniga 200
    }

    // Bugungi sanani topish
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Davomat bazasida bugun uchun yozuv bormi tekshiramiz
    let record = await prisma.attendance.findFirst({
      where: {
        userId,
        workDate: today
      }
    });

    const now = new Date();

    // Davomat qaysi filialga tegishli ekanligini aniqlaymiz
    let attendanceBranchId = user.branchId;
    if (eventBody.ipAddress) {
      const device = await prisma.device.findFirst({ where: { ipAddress: eventBody.ipAddress, companyId: user.companyId } });
      if (device) attendanceBranchId = device.branchId;
    }
    if (!attendanceBranchId) {
      const firstBranch = await prisma.branch.findFirst({ where: { companyId: user.companyId } });
      attendanceBranchId = firstBranch ? firstBranch.id : 1;
    }

    if (!record) {
      // Birinchi marta kirdi (Check-In)
      await prisma.attendance.create({
        data: {
          companyId: user.companyId,
          userId,
          branchId: attendanceBranchId,
          checkIn: now,
          workDate: today
        }
      });
      console.log(`✅ Davomat (Check-In) yozildi: ${user.name}`);
    } else {
      // Ikkinchi (yoki undan ko'p) marta kirdi, bu (Check-Out) vaqtini yangilaydi
      await prisma.attendance.update({
        where: { id: record.id },
        data: { checkOut: now }
      });
      console.log(`✅ Davomat (Check-Out) yangilandi: ${user.name}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});
// GET /api/attendance/cleaners-faces - Barcha farroshlarning yuz rasmlarini olish
router.get('/cleaners-faces', authenticate, authorize('admin', 'director', 'supervisor', 'owner'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        companyId: req.user.companyId,
        role: 'cleaner',
        isFaceRegistered: true,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        photoUrl: true
      }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('cleaners-faces error:', error);
    res.status(500).json({ success: false, message: 'Xatolik yuz berdi' });
  }
});

// POST /api/attendance/webcam-checkin - Veb-kamera orqali yuz tanish davomati
router.post('/webcam-checkin', authenticate, authorize('admin', 'director', 'supervisor', 'owner'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'Foydalanuvchi ID si kerak' });

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!targetUser) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await prisma.attendance.findFirst({
      where: { userId: targetUser.id, workDate: today }
    });

    const now = new Date();
    
    // Agar director yoki owner bo'lsa targetUser.branchId orqali davomat qilamiz. Admin uchun req.user.branchId
    const branchId = req.user.branchId || targetUser.branchId || 1;

    let isCheckIn = false;
    if (!record) {
      await prisma.attendance.create({
        data: {
          companyId: targetUser.companyId,
          userId: targetUser.id,
          branchId,
          checkIn: now,
          workDate: today
        }
      });
      isCheckIn = true;
    } else {
      await prisma.attendance.update({
        where: { id: record.id },
        data: { checkOut: now }
      });
    }

    res.json({ 
      success: true, 
      message: `${targetUser.name} - ${isCheckIn ? 'Ishga kirdi (Check-In)' : 'Ishdan chiqdi (Check-Out)'}`,
      action: isCheckIn ? 'check-in' : 'check-out'
    });
  } catch (error) {
    console.error('webcam-checkin error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// POST /api/attendance/bot-photo - Telegram Mini App dan keladigan jonli rasmlar
router.post('/bot-photo', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { userId, action, photo } = req.body; // action = 'checkin' yoki 'checkout', photo = base64 string
    
    if (!userId || !action || !photo) {
      return res.status(400).json({ success: false, message: 'Ma\'lumotlar to\'liq emas' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!targetUser) return res.status(404).json({ success: false, message: 'Xodim topilmadi' });

    // Rasmni saqlash
    const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `attendance_${action}_${userId}_${Date.now()}.jpg`;
    
    const uploadDir = path.join(__dirname, '../../uploads/attendance');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    const photoUrl = `/uploads/attendance/${fileName}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    let record = await prisma.attendance.findFirst({
      where: { userId: targetUser.id, workDate: today }
    });

    if (action === 'checkin') {
      if (!record) {
        await prisma.attendance.create({
          data: {
            companyId: targetUser.companyId,
            userId: targetUser.id,
            branchId: targetUser.branchId || 1,
            checkIn: now,
            checkInPhoto: photoUrl,
            workDate: today
          }
        });
      } else {
        await prisma.attendance.update({
          where: { id: record.id },
          data: { 
            checkIn: now, 
            checkInPhoto: photoUrl,
            checkOut: null,
            checkOutPhoto: null
          }
        });
      }
    } else if (action === 'checkout') {
      if (!record) {
        // Agar check-in bo'lmagan bo'lsa, baribir yaratamiz va check-out qilamiz
        await prisma.attendance.create({
          data: {
            companyId: targetUser.companyId,
            userId: targetUser.id,
            branchId: targetUser.branchId || 1,
            checkOut: now,
            checkOutPhoto: photoUrl,
            workDate: today
          }
        });
      } else {
        await prisma.attendance.update({
          where: { id: record.id },
          data: { checkOut: now, checkOutPhoto: photoUrl }
        });
      }
    }

    // Send Telegram Notification to the user if they have a linked telegram account
    if (targetUser.telegram) {
      const timeStr = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
      if (action === 'checkin') {
        const msg = `Assalomu alaykum ${targetUser.name}!\nSizning ishni boshlagan vaqtingiz (${timeStr}) tizimga yozildi. ✅\n\nIltimos, ishni boshlash uchun pastdagi "🧹 Tozalanadigan xonalar" tugmasini bosing!`;
        sendBotMessage(targetUser.telegram, msg);
      } else {
        const msg = `Yaxshi dam oling ${targetUser.name}!\nSizning ishni yakunlagan vaqtingiz (${timeStr}) tizimga yozildi. ✅`;
        sendBotMessage(targetUser.telegram, msg);
      }
    }

    res.json({ success: true, message: 'Davomat yozildi', photoUrl });
  } catch (error) {
    console.error('bot-photo error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// POST /api/attendance/web-photo - Web App dan keladigan jonli rasmlar (Authenticated)
router.post('/web-photo', authenticate, express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { action, photo, locationParams } = req.body; // action = 'checkin' yoki 'checkout', photo = base64 string
    const userId = req.user.id;
    
    if (!action || !photo) {
      return res.status(400).json({ success: false, message: 'Ma\'lumotlar to\'liq emas' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!targetUser) return res.status(404).json({ success: false, message: 'Xodim topilmadi' });

    // Rasmni saqlash
    const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `attendance_web_${action}_${userId}_${Date.now()}.jpg`;
    
    const uploadDir = path.join(__dirname, '../../uploads/attendance');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    const photoUrl = `/uploads/attendance/${fileName}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    let record = await prisma.attendance.findFirst({
      where: { userId: targetUser.id, workDate: today }
    });

    if (action === 'checkin') {
      if (!record) {
        await prisma.attendance.create({
          data: {
            companyId: targetUser.companyId,
            userId: targetUser.id,
            branchId: targetUser.branchId || 1,
            checkIn: now,
            checkInPhoto: photoUrl,
            workDate: today
          }
        });
      } else {
        await prisma.attendance.update({
          where: { id: record.id },
          data: { 
            checkIn: now, 
            checkInPhoto: photoUrl,
            checkOut: null,
            checkOutPhoto: null
          }
        });
      }
    } else if (action === 'checkout') {
      if (!record) {
        await prisma.attendance.create({
          data: {
            companyId: targetUser.companyId,
            userId: targetUser.id,
            branchId: targetUser.branchId || 1,
            checkOut: now,
            checkOutPhoto: photoUrl,
            workDate: today
          }
        });
      } else {
        await prisma.attendance.update({
          where: { id: record.id },
          data: { checkOut: now, checkOutPhoto: photoUrl }
        });
      }
    }

    res.json({ success: true, message: 'Davomat yozildi', photoUrl });
  } catch (error) {
    console.error('web-photo error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
