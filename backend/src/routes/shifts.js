const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

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
    const hour = now.getHours();
    const shiftType = (hour >= 8 && hour < 19) ? 'morning' : 'night';

    const shift = await prisma.shift.create({
      data: {
        companyId: req.user.companyId,
        branchId: req.user.branchId,
        adminId: req.user.id,
        shiftType,
        startTime: now,
        status: 'active',
      },
    });

    res.status(201).json({ success: true, data: shift, message: 'Smena boshlandi!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/shifts/:id/close - Smenani yopish
router.put('/:id/close', authenticate, authorize('admin', 'director'), async (req, res) => {
  try {
    const { notes } = req.body;
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
      data: { status: 'closed', endTime: new Date(), notes },
    });

    res.json({ success: true, data: updatedShift, message: 'Smena yopildi!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// GET /api/shifts/active - Faol smena
router.get('/my/active', authenticate, authorize('admin'), async (req, res) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { branchId: req.user.branchId, adminId: req.user.id, status: 'active', companyId: req.user.companyId },
      include: {
        _count: { select: { bookings: true } },
        bookings: {
          include: { room: true, primaryGuest: true },
        },
        expenses: true
      },
    });
    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
