const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

function buildGuestFilter(phone, passport) {
  const phoneClean = (phone || '').trim();
  const passportClean = (passport || '').trim();
  const guestFilter = [];

  const phoneDigits = phoneClean.replace(/\D/g, '');
  if (phoneDigits.length >= 7) {
    const searchPart = phoneDigits.slice(-7);
    guestFilter.push({ phone: { contains: searchPart } });
  }

  if (passportClean.length >= 4) {
    guestFilter.push({ passportNumber: { equals: passportClean, mode: 'insensitive' } });
  }

  return guestFilter;
}

// GET /api/guests/check-active - Mehmonning faol broni borligini tekshirish
router.get('/check-active', authenticate, async (req, res) => {
  try {
    const { phone, passport } = req.query;
    const guestFilter = buildGuestFilter(phone, passport);

    if (guestFilter.length === 0) {
      return res.json({ success: true, hasActiveBooking: false });
    }

    const activeBooking = await prisma.booking.findFirst({
      where: {
        companyId: req.user.companyId,
        status: 'active',
        primaryGuest: { OR: guestFilter }
      },
      include: {
        room: { select: { roomNumber: true, roomType: true } },
        branch: { select: { name: true } },
        primaryGuest: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (activeBooking) {
      const debt = activeBooking.totalPrice - activeBooking.paidAmount;
      return res.json({
        success: true,
        hasActiveBooking: true,
        activeBooking: {
          id: activeBooking.id,
          roomNumber: activeBooking.room?.roomNumber,
          roomType: activeBooking.room?.roomType,
          branchName: activeBooking.branch?.name,
          guestName: `${activeBooking.primaryGuest.firstName} ${activeBooking.primaryGuest.lastName}`,
          guestPhone: activeBooking.primaryGuest.phone,
          totalPrice: activeBooking.totalPrice,
          paidAmount: activeBooking.paidAmount,
          debt: debt > 0 ? debt : 0,
          checkIn: activeBooking.checkIn
        }
      });
    }

    res.json({ success: true, hasActiveBooking: false });
  } catch (error) {
    console.error('Error checking active guest booking:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// GET /api/guests - Mehmonlar qidirish
router.get('/', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    const where = { companyId: req.user.companyId };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { passportNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    const guests = await prisma.guest.findMany({
      where,
      include: {
        primaryBookings: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: { room: true, branch: true }
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const formattedGuests = guests.map(g => {
      const activeBooking = g.primaryBookings.find(b => b.status === 'active');
      return {
        ...g,
        hasActiveBooking: !!activeBooking,
        activeBooking: activeBooking ? {
          id: activeBooking.id,
          roomNumber: activeBooking.room?.roomNumber,
          branchName: activeBooking.branch?.name,
          debt: Math.max(0, activeBooking.totalPrice - activeBooking.paidAmount)
        } : null
      };
    });

    res.json({ success: true, data: formattedGuests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
