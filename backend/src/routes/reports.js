const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/rooms-activity - Fetch room analytics for owner
router.get('/rooms-activity', authenticate, authorize('owner', 'director'), async (req, res) => {
  try {
    const { branchId, month } = req.query; // month format: 'YYYY-MM'
    
    let targetBranchId = branchId ? parseInt(branchId) : null;
    if (req.user.role === 'director') targetBranchId = req.user.branchId;

    const whereRoom = { companyId: req.user.companyId };
    if (targetBranchId) whereRoom.branchId = targetBranchId;

    const rooms = await prisma.room.findMany({
      where: whereRoom,
      include: {
        branch: { select: { name: true } },
      },
      orderBy: [
        { branchId: 'asc' },
        { roomNumber: 'asc' }
      ]
    });

    let startDate, endDate;
    if (month) {
      const [year, m] = month.split('-');
      startDate = new Date(year, parseInt(m) - 1, 1);
      endDate = new Date(year, parseInt(m), 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Barcha xonalar IDlarini ajratib olamiz
    const roomIds = rooms.map(r => r.id);

    // 1-so'rov: Bir vaqtning o'zida hamma xonalar bo'yicha jami tushum va band qilishlar sonini guruhlab olamiz
    const monthlyStats = await prisma.booking.groupBy({
      by: ['roomId'],
      where: {
        roomId: { in: roomIds },
        createdAt: { gte: startDate, lte: endDate }
      },
      _count: { id: true },
      _sum: { totalPrice: true }
    });

    const statsMap = {};
    for (const stat of monthlyStats) {
      statsMap[stat.roomId] = {
        totalBookings: stat._count.id,
        totalIncome: stat._sum.totalPrice || 0
      };
    }

    // 2-so'rov: Bir vaqtning o'zida barcha xonalar uchun faqat eng oxirgi band qilingan tarixni olamiz
    const latestBookings = await prisma.booking.findMany({
      where: { roomId: { in: roomIds } },
      distinct: ['roomId'],
      orderBy: { checkOutExpected: 'desc' },
      select: { roomId: true, checkOutExpected: true, checkOutActual: true }
    });

    const lastOccupiedMap = {};
    for (const booking of latestBookings) {
      lastOccupiedMap[booking.roomId] = booking.checkOutActual || booking.checkOutExpected;
    }

    // Olingan natijalarni xonalarga tezkorlik bilan biriktiramiz
    const report = rooms.map(room => ({
      id: room.id,
      roomNumber: room.roomNumber,
      branchName: room.branch?.name,
      pricePerNight: room.pricePerNight,
      totalBookings: statsMap[room.id]?.totalBookings || 0,
      totalIncome: statsMap[room.id]?.totalIncome || 0,
      lastOccupiedDate: lastOccupiedMap[room.id] || null
    }));

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Room activity report error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
