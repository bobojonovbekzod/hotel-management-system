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

    const report = [];

    for (const room of rooms) {
      const monthlyBookings = await prisma.booking.findMany({
        where: {
          roomId: room.id,
          createdAt: { gte: startDate, lte: endDate }
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalBookings = monthlyBookings.length;
      const totalIncome = monthlyBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      // Find the absolute last occupied date ever
      const lastBooking = await prisma.booking.findFirst({
        where: { roomId: room.id },
        orderBy: { checkOutExpected: 'desc' }
      });

      const lastOccupiedDate = lastBooking 
        ? (lastBooking.checkOutActual || lastBooking.checkOutExpected) 
        : null;

      report.push({
        id: room.id,
        roomNumber: room.roomNumber,
        branchName: room.branch?.name,
        pricePerNight: room.pricePerNight,
        totalBookings,
        totalIncome,
        lastOccupiedDate
      });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Room activity report error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
