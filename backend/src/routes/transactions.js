const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/transactions
router.get('/', authenticate, authorize('owner', 'director'), async (req, res) => {
  try {
    const { branchId, date } = req.query;
    
    // Director faqat o'z filialidagi tranzaksiyalarni ko'rishi mumkin
    let targetBranchId = branchId ? parseInt(branchId) : null;
    if (req.user.role === 'director') {
      targetBranchId = req.user.branchId;
    }

    const where = {};
    if (targetBranchId) {
      where.booking = {
        branchId: targetBranchId
      };
    } else {
      where.booking = {
        companyId: req.user.companyId
      };
    }

    // Agar sana berilgan bo'lsa (YYYY-MM-DD), o'sha kundagi to'lovlar
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: {
            room: {
              include: {
                branch: true
              }
            },
            primaryGuest: true,
            admin: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
