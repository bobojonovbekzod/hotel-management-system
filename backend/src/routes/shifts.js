const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const fs = require('fs');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/shifts - Smenalar ro'yxati
router.get('/', authenticate, async (req, res) => {
  try {
    const { branchId, month, year } = req.query;
    const where = { companyId: req.user.companyId };

    if (req.user.role === 'admin') {
      where.branchId = req.user.branchId;
      where.adminId = req.user.id;
    } else if (req.user.role === 'director') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = parseInt(branchId);
    }

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        admin: { select: { name: true, username: true } },
        branch: { select: { name: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: shifts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/shifts - Yangi smenani boshlash
router.post('/start', authenticate, authorize('admin', 'director'), async (req, res) => {
  try {
    // Faol smena bor-yo'qligini tekshirish (butun filial bo'yicha)
    const activeShift = await prisma.shift.findFirst({
      where: { branchId: req.user.branchId, status: 'active', companyId: req.user.companyId },
      include: { admin: true }
    });

    if (activeShift) {
      if (activeShift.adminId === req.user.id) {
        return res.status(400).json({ success: false, message: 'Sizda allaqachon faol smena bor.' });
      } else {
        return res.status(400).json({ success: false, message: `Hozirda ${activeShift.admin.name} smenada turibdi. Avval u smenasini yopishi kerak.` });
      }
    }

    const now = new Date();
    
    // Smena turi frontend'dan kelishi shart
    const shiftType = req.body.shiftType;
    if (!shiftType) {
      return res.status(400).json({ success: false, message: "Smena turini tanlang." });
    }

    let startPhotoUrl = null;
    if (req.body.base64Photo) {
      try {
        const base64Data = req.body.base64Photo.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const filename = `shift_${req.user.id}_${Date.now()}.jpg`;
        const uploadDir = path.join(__dirname, '../../uploads/shifts');
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(uploadDir, filename), imageBuffer);
        startPhotoUrl = `/api/uploads/shifts/${filename}`;
      } catch (err) {
        console.error("Failed to save shift photo:", err);
      }
    }

    const shift = await prisma.shift.create({
      data: {
        companyId: req.user.companyId,
        branchId: req.user.branchId,
        adminId: req.user.id,
        shiftType,
        startTime: now,
        status: 'active',
        startPhotoUrl,
      },
    });

    res.status(201).json({ success: true, data: shift, message: 'Smena boshlandi!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// GET /api/shifts/issues/active - Hal qilinmagan muammoli smenalar
router.get('/issues/active', authenticate, authorize('admin', 'director', 'owner', 'hr'), async (req, res) => {
  try {
    const targetBranchId = req.user.role === 'owner' || req.user.role === 'hr' ? undefined : req.user.branchId;

    const issues = await prisma.shift.findMany({
      where: {
        branchId: targetBranchId,
        companyId: req.user.companyId,
        hasIssue: true,
        isIssueResolved: false
      },
      include: {
        admin: { select: { name: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: issues });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// GET /api/shifts/issues/history - Barcha smena muammolari tarixi (KPI uchun)
router.get('/issues/history', authenticate, authorize('admin', 'director', 'owner', 'hr'), async (req, res) => {
  try {
    const { branchId } = req.query;
    
    // Owner can see all branches or filter by branchId. Director/Admin only sees their own branch.
    const targetBranchId = req.user.role === 'owner' || req.user.role === 'hr'
      ? (branchId ? parseInt(branchId) : undefined)
      : req.user.branchId;

    const history = await prisma.shift.findMany({
      where: {
        companyId: req.user.companyId,
        branchId: targetBranchId,
        hasIssue: true
      },
      include: {
        admin: { select: { name: true, username: true, role: true } },
        issueResolvedBy: { select: { name: true, username: true, role: true } },
        branch: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/shifts/issues/:id/resolve - Smena muammosini hal qilish
router.put('/issues/:id/resolve', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const shiftId = parseInt(req.params.id);
    const shift = await prisma.shift.update({
      where: { id: shiftId, companyId: req.user.companyId },
      data: {
        isIssueResolved: true,
        issueResolvedById: req.user.id
      }
    });
    res.json({ success: true, data: shift, message: 'Muammo hal qilindi!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/shifts/:id/close - Smenani yopish
router.put('/:id/close', authenticate, authorize('admin', 'director'), async (req, res) => {
  try {
    const { notes, hasIssue, issueDescription } = req.body;
    const shiftId = parseInt(req.params.id);

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Smena yopilgan yoki topilmadi.' });
    }

    // O'zboshimchalik (Anti-fraud): Tekshiramiz, vaqti o'tib ketgan (overstay) xonalar bormi?
    const now = new Date();
    const overstayBookings = await prisma.booking.findMany({
      where: {
        branchId: shift.branchId,
        status: 'active',
        checkOutExpected: { lt: now }
      }
    });

    if (overstayBookings.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Smenani yopish taqiqlanadi! Sizda vaqti o'tgan ${overstayBookings.length} ta xona bor. Iltimos ularni Check-out qiling yoki muddatini uzaytiring.` 
      });
    }

    const updatedShift = await prisma.shift.update({
      where: { id: shiftId, companyId: req.user.companyId },
      data: { 
        status: 'closed', 
        endTime: new Date(), 
        notes,
        hasIssue: hasIssue || false,
        issueDescription: hasIssue ? issueDescription : null,
        isIssueResolved: hasIssue ? false : true
      },
    });

    res.json({ success: true, data: updatedShift, message: 'Smena yopildi!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// GET /api/shifts/active - Faol smena
router.get('/my/active', authenticate, authorize('admin', 'director', 'supervisor', 'owner'), async (req, res) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { branchId: req.user.branchId, adminId: req.user.id, status: 'active', companyId: req.user.companyId },
      include: {
        _count: { select: { bookings: true } },
        bookings: {
          include: { room: true, primaryGuest: true },
        },
        expenses: true,
        payments: {
          include: {
            booking: {
              include: {
                room: true,
                primaryGuest: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
    });
    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
