const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

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
        primaryBookings: { take: 1, orderBy: { createdAt: 'desc' }, include: { room: true } },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: guests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
