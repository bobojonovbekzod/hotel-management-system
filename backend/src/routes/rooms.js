const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/rooms?branchId=1 - Xonalar ro'yxati
router.get('/', authenticate, async (req, res) => {
  try {
    const { branchId, status } = req.query;
    
    let targetBranchId = branchId ? parseInt(branchId) : null;
    
    // Admin va direktor faqat o'z filialini ko'ra oladi
    if (req.user.role === 'admin' || req.user.role === 'director') {
      targetBranchId = req.user.branchId;
    }

    const where = { companyId: req.user.companyId };
    if (targetBranchId) where.branchId = targetBranchId;
    if (status) where.status = status;

    const rooms = await prisma.room.findMany({
      where,
      include: {
        branch: { select: { name: true } },
        bookings: {
          where: { status: 'active' },
          include: {
            primaryGuest: true,
            additionalGuests: { include: { guest: true } },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/rooms - Yangi xona qo'shish
router.post('/', authenticate, authorize('owner'), async (req, res) => {
  try {
    const { branchId, roomNumber, roomType, floor, capacity, pricePerNight, description } = req.body;

    const targetBranchId = req.user.role === 'director' ? req.user.branchId : parseInt(branchId);

    const room = await prisma.room.create({
      data: { companyId: req.user.companyId, branchId: targetBranchId, roomNumber, roomType, floor: parseInt(floor), capacity: parseInt(capacity), pricePerNight: parseFloat(pricePerNight), description },
    });

    res.status(201).json({ success: true, data: room, message: 'Xona muvaffaqiyatli qo\'shildi.' });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Bu raqamli xona allaqachon mavjud.' });
    }
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/rooms/:id/status - Xona holatini o'zgartirish
router.put('/:id/status', authenticate, authorize('owner', 'director', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const roomId = parseInt(req.params.id);

    const existingRoom = await prisma.room.findUnique({ where: { id: roomId, companyId: req.user.companyId } });
    if (!existingRoom) return res.status(404).json({ success: false, message: 'Xona topilmadi.' });

    // Smart Control logic - VAQTINCHA O'CHIRILDI (Mijoz talabiga ko'ra)
    if (status === 'available' && (existingRoom.status === 'cleaning' || existingRoom.status === 'maintenance') && req.user.role === 'admin') {
      const cleanersCount = await prisma.user.count({
        where: { branchId: existingRoom.branchId, role: 'cleaner', isActive: true }
      });
      if (cleanersCount > 0) {
        // return res.status(403).json({ success: false, message: 'SMART_CONTROL_ERROR' });
      }
    }

    const room = await prisma.room.update({
      where: { id: roomId },
      data: { status },
    });

    // Real vaqtda barcha ulangan userlarga xabar
    req.io.to(`branch-${room.branchId}`).emit('room-status-changed', { roomId, status, room });

    res.json({ success: true, data: room, message: 'Xona holati o\'zgartirildi.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/rooms/:id - Xonani tahrirlash
router.put('/:id', authenticate, authorize('owner'), async (req, res) => {
  try {
    const { roomNumber, roomType, floor, capacity, pricePerNight, description } = req.body;
    const room = await prisma.room.update({
      where: { id: parseInt(req.params.id), companyId: req.user.companyId },
      data: { roomNumber, roomType, floor: parseInt(floor), capacity: parseInt(capacity), pricePerNight: parseFloat(pricePerNight), description },
    });
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
