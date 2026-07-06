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

    const wherePayment = {};
    const whereExpense = { companyId: req.user.companyId };

    if (targetBranchId) {
      wherePayment.booking = { branchId: targetBranchId };
      whereExpense.branchId = targetBranchId;
    } else {
      wherePayment.booking = { companyId: req.user.companyId };
    }

    // Agar sana berilgan bo'lsa (YYYY-MM-DD), o'sha kundagi to'lovlar
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      wherePayment.createdAt = { gte: startOfDay, lte: endOfDay };
      whereExpense.expenseDate = { gte: startOfDay, lte: endOfDay };
    }

    const payments = await prisma.payment.findMany({
      where: wherePayment,
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
      }
    });

    const expenses = await prisma.expense.findMany({
      where: whereExpense,
      include: {
        branch: true,
        admin: {
          select: { name: true }
        }
      }
    });

    const formattedPayments = payments.map(p => ({
      id: `p-${p.id}`,
      type: 'income',
      createdAt: p.createdAt,
      amount: p.amount,
      method: p.method,
      branchName: p.booking?.room?.branch?.name || '-',
      adminName: p.booking?.admin?.name || '-',
      details: p.booking ? `${p.booking.room?.roomNumber}-xona (${p.booking.primaryGuest?.firstName} ${p.booking.primaryGuest?.lastName})` : '-'
    }));

    const formattedExpenses = expenses.map(e => ({
      id: `e-${e.id}`,
      type: 'expense',
      createdAt: e.expenseDate,
      amount: e.amount,
      method: '-', 
      branchName: e.branch?.name || '-',
      adminName: e.admin?.name || '-',
      details: e.description || 'Xarajat'
    }));

    const allTransactions = [...formattedPayments, ...formattedExpenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: allTransactions });
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
