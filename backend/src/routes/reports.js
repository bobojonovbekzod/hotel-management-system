const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/rooms-activity - Fetch room analytics for owner
router.get('/rooms-activity', authenticate, authorize('owner', 'director'), async (req, res) => {
  try {
    const { branchId } = req.query;
    
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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const report = [];

    for (const room of rooms) {
      const recentBookings = await prisma.booking.findMany({
        where: {
          roomId: room.id,
          createdAt: { gte: thirtyDaysAgo }
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalBookings30Days = recentBookings.length;
      let totalOccupiedDays30Days = 0;

      recentBookings.forEach(b => {
        const checkIn = new Date(b.checkIn);
        const checkOut = b.checkOutActual ? new Date(b.checkOutActual) : new Date(b.checkOutExpected);
        
        // Calculate days occupied within the last 30 days
        const start = checkIn < thirtyDaysAgo ? thirtyDaysAgo : checkIn;
        const end = checkOut > new Date() ? new Date() : checkOut;
        
        if (start < end) {
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          totalOccupiedDays30Days += diffDays;
        }
      });

      // Find the absolute last occupied date ever
      const lastBooking = await prisma.booking.findFirst({
        where: { roomId: room.id },
        orderBy: { checkOutExpected: 'desc' }
      });

      const lastOccupiedDate = lastBooking 
        ? (lastBooking.checkOutActual || lastBooking.checkOutExpected) 
        : null;

      let status = 'Faol';
      if (totalBookings30Days === 0) {
        status = 'Shubhali (Ishlatilmayapti)';
      } else if (totalBookings30Days < 3) {
        status = 'Kam ishlatilgan';
      }

      report.push({
        id: room.id,
        roomNumber: room.roomNumber,
        branchName: room.branch?.name,
        pricePerNight: room.pricePerNight,
        status,
        totalBookings30Days,
        totalOccupiedDays30Days,
        lastOccupiedDate,
        currentStatus: room.status
      });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Room activity report error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
