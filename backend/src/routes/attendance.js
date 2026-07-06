const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer();

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

module.exports = router;
