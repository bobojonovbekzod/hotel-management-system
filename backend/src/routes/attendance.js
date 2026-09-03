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
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0));

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

    where.user = { role: 'cleaner' };

    if (date) {
      const [y, m, d] = date.slice(0, 10).split('-').map(Number);
      const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      
      where.checkIn = { gte: startOfDay, lte: endOfDay };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
        branch: { select: { name: true } }
      },
      orderBy: { checkIn: 'desc' }
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

    const now = new Date();
    // UTC noon date to prevent timezone shift issues across matrix queries
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0));
    
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

    const now = new Date();
    // UTC noon date to prevent timezone shift issues across matrix queries
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0));

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

    const now = new Date();
    // UTC noon date to prevent timezone shift issues across matrix queries
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0));

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

// GET /api/attendance/monthly-matrix - Faqat Tozalik xodimlari uchun oylik tabel matritsasi
router.get('/monthly-matrix', authenticate, authorize('owner', 'director', 'supervisor', 'admin'), async (req, res) => {
  try {
    const { branchId, month } = req.query; // month format: YYYY-MM e.g. 2026-09
    const targetBranchId = branchId ? parseInt(branchId) : (['director', 'admin'].includes(req.user.role) ? req.user.branchId : null);

    const now = new Date();
    const targetMonth = month ? month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, mStr] = targetMonth.split('-').map(Number);
    
    // Days in month
    const daysInMonth = new Date(year, mStr, 0).getDate();
    const days = [];
    const dayNamesUz = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, mStr - 1, d, 12, 0, 0);
      const dateStr = `${year}-${String(mStr).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        dayName: dayNamesUz[dateObj.getDay()],
        isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6
      });
    }

    // Query ONLY cleaner staff (role: 'cleaner')
    const userWhere = {
      companyId: req.user.companyId,
      role: 'cleaner',
      isActive: true
    };
    if (targetBranchId) {
      userWhere.branchId = targetBranchId;
    }

    const cleaners = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        role: true,
        salary: true,
        salaryType: true,
        branch: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    const cleanerIds = cleaners.map(c => c.id);

    const startDate = new Date(year, mStr - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, mStr - 1, daysInMonth, 23, 59, 59, 999);

    // Query Attendance records for cleaners in month
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: { in: cleanerIds },
        workDate: { gte: startDate, lte: endDate }
      }
    });

    // Query month-specific salary history records for targetMonth
    const salaryHistories = await prisma.userSalaryHistory.findMany({
      where: {
        userId: { in: cleanerIds },
        month: targetMonth
      }
    });

    const monthSalaryMap = {};
    salaryHistories.forEach(sh => {
      monthSalaryMap[sh.userId] = { salary: sh.salary, salaryType: sh.salaryType };
    });

    // Process cleaners with month-specific rates if present
    const processedCleaners = cleaners.map(c => {
      if (monthSalaryMap[c.id]) {
        return {
          ...c,
          salary: monthSalaryMap[c.id].salary,
          salaryType: monthSalaryMap[c.id].salaryType
        };
      }
      return c;
    });

    // Build attendance matrix map: { userId: { 'YYYY-MM-DD': true } }
    const matrix = {};
    cleaners.forEach(c => {
      matrix[c.id] = {};
    });

    attendanceRecords.forEach(att => {
      if (att.workDate && att.userId) {
        const dStr = att.workDate.toISOString().slice(0, 10);
        if (matrix[att.userId]) {
          matrix[att.userId][dStr] = true;
        }
      }
    });

    res.json({
      success: true,
      data: {
        month: targetMonth,
        days,
        cleaners: processedCleaners,
        matrix
      }
    });
  } catch (error) {
    console.error('Error in GET /api/attendance/monthly-matrix:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// POST /api/attendance/set-monthly-salary - Muayyan oy uchun xodimning stavka narxini saqlash
router.post('/set-monthly-salary', authenticate, authorize('owner', 'director', 'supervisor', 'admin'), async (req, res) => {
  try {
    const { userId, month, salary, salaryType } = req.body;
    const targetUserId = parseInt(userId);

    const user = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!user || user.companyId !== req.user.companyId) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi.' });
    }

    const targetSalary = parseFloat(salary);
    const targetSalaryType = salaryType || 'per_shift';

    // Upsert UserSalaryHistory for (userId, month)
    await prisma.userSalaryHistory.upsert({
      where: {
        userId_month: {
          userId: targetUserId,
          month
        }
      },
      update: {
        salary: targetSalary,
        salaryType: targetSalaryType
      },
      create: {
        userId: targetUserId,
        month,
        salary: targetSalary,
        salaryType: targetSalaryType
      }
    });

    // Also update default user.salary
    await prisma.user.update({
      where: { id: targetUserId },
      data: { salary: targetSalary, salaryType: targetSalaryType }
    });

    res.json({ success: true, message: `${month} oyi uchun kunlik stavka saqlandi.` });
  } catch (error) {
    console.error('Error in POST /api/attendance/set-monthly-salary:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});


// POST /api/attendance/toggle-cell - Tabel katakchasini o'zgartirish (Keldi / Kelmadi)
router.post('/toggle-cell', authenticate, authorize('owner', 'director', 'supervisor', 'admin'), async (req, res) => {
  try {
    const { userId, dateStr, isPresent } = req.body;
    const targetUserId = parseInt(userId);

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { branch: true }
    });

    if (!user || user.companyId !== req.user.companyId) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi.' });
    }

    const workDate = new Date(dateStr + 'T12:00:00.000Z');

    if (isPresent) {
      const existing = await prisma.attendance.findFirst({
        where: { userId: targetUserId, workDate }
      });

      if (!existing) {
        await prisma.attendance.create({
          data: {
            companyId: user.companyId,
            branchId: user.branchId || req.user.branchId || 1,
            userId: targetUserId,
            workDate,
            checkIn: null,
            notes: 'Tabel orqali kiritildi'
          }
        });
      }
    } else {
      await prisma.attendance.deleteMany({
        where: { userId: targetUserId, workDate }
      });
    }

    res.json({ success: true, message: 'Davomat yangilandi.' });
  } catch (error) {
    console.error('Error in POST /api/attendance/toggle-cell:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
