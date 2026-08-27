const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/transactions
router.get('/', authenticate, authorize('owner', 'director'), async (req, res) => {
  try {
    const { branchId, date } = req.query;
    
    let targetBranchId = branchId ? parseInt(branchId) : null;
    if (req.user.role === 'director') {
      targetBranchId = req.user.branchId;
    }

    const branchFilter = targetBranchId 
      ? { branchId: targetBranchId }
      : { companyId: req.user.companyId };

    let startOfDay, endOfDay;
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      // Mehmonxona ish kuni: UZT bo'yicha 06:00 dan keyingi kun 05:59 gacha.
      // UZT = UTC+5. Shuning uchun UTC bo'yicha 01:00 dan boshlanadi.
      startOfDay = new Date(Date.UTC(year, month - 1, day, 1, 0, 0));
      endOfDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 59, 59, 999));
    } else {
      const now = new Date();
      // Joriy kunni olish: UZT (+5) da 06:00 gacha bo'lgan vaqt oldingi kunga hisoblanadi.
      // Shuning uchun UTC vaqtdan 1 soat ayirib, sana kunini aniqlaymiz.
      const businessDate = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const year = businessDate.getUTCFullYear();
      const month = businessDate.getUTCMonth();
      const day = businessDate.getUTCDate();
      startOfDay = new Date(Date.UTC(year, month, day, 1, 0, 0));
      endOfDay = new Date(Date.UTC(year, month, day + 1, 0, 59, 59, 999));
    }

    // 1. O'sha sanada boshlangan barcha smenalarni olamiz
    const shifts = await prisma.shift.findMany({
      where: {
        ...branchFilter,
        startTime: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        admin: { select: { name: true } },
        branch: { select: { name: true } }
      },
      orderBy: { startTime: 'desc' }
    });

    const shiftIds = shifts.map(s => s.id);

    // 2. Shu smenalarga biriktirilgan YOKI o'sha sanada qilingan (lekin smenasi yo'q) to'lovlarni olamiz
    const payments = await prisma.payment.findMany({
      where: { 
        OR: [
          { shiftId: { in: shiftIds } },
          { 
            shiftId: null, 
            createdAt: { gte: startOfDay, lte: endOfDay },
            booking: targetBranchId ? { branchId: targetBranchId } : { companyId: req.user.companyId }
          }
        ]
      },
      include: {
        booking: {
          include: {
            room: { include: { branch: true } },
            primaryGuest: true,
            admin: { select: { name: true } }
          }
        }
      }
    });

    const expenses = await prisma.expense.findMany({
      where: { 
        OR: [
          { shiftId: { in: shiftIds } },
          {
            shiftId: null,
            expenseDate: { gte: startOfDay, lte: endOfDay },
            ...(targetBranchId ? { branchId: targetBranchId } : { companyId: req.user.companyId })
          }
        ]
      },
      include: {
        branch: true,
        admin: { select: { name: true } }
      }
    });

    // Tranzaksiyalarni formatlaymiz
    const formattedPayments = payments.map(p => ({
      id: `p-${p.id}`,
      type: 'income',
      createdAt: p.createdAt,
      amount: p.amount,
      method: p.method,
      shiftId: p.shiftId,
      branchName: p.booking?.room?.branch?.name || '-',
      adminName: p.booking?.admin?.name || '-',
      details: p.booking ? `${p.booking.room?.roomNumber}-xona (${p.booking.primaryGuest?.firstName} ${p.booking.primaryGuest?.lastName})` : '-'
    }));

    const formattedExpenses = expenses.map(e => ({
      id: `e-${e.id}`,
      type: 'expense',
      createdAt: e.createdAt || e.expenseDate,
      amount: e.amount,
      method: '-', 
      shiftId: e.shiftId,
      branchName: e.branch?.name || '-',
      adminName: e.admin?.name || '-',
      details: e.description || 'Xarajat'
    }));

    const allTransactions = [...formattedPayments, ...formattedExpenses];

    // Smenalar bo'yicha guruhlaymiz
    const groupedData = shifts.map(shift => {
      const shiftTransactions = allTransactions
        .filter(t => t.shiftId === shift.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const totalIncome = shift.totalIncome;
      const terminal = shiftTransactions.filter(t => t.type === 'income' && (t.method === 'terminal' || t.method === 'karta')).reduce((sum, t) => sum + t.amount, 0);
      const qrcode = shiftTransactions.filter(t => t.type === 'income' && t.method === 'qrcode').reduce((sum, t) => sum + t.amount, 0);
      const transfer = shiftTransactions.filter(t => t.type === 'income' && t.method === 'transfer').reduce((sum, t) => sum + t.amount, 0);
      const expensesTotal = shiftTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      const qoldiq = totalIncome - terminal - qrcode - transfer - expensesTotal;
      const cashIncome = totalIncome - terminal - qrcode - transfer;

      return {
        shift: {
          id: shift.id,
          startTime: shift.startTime,
          endTime: shift.endTime,
          shiftType: shift.shiftType,
          status: shift.status,
          adminName: shift.admin?.name || 'Noma\'lum',
          branchName: shift.branch?.name || '-'
        },
        stats: {
          totalIncome,
          terminal,
          qrcode,
          transfer,
          cashIncome,
          expenses: expensesTotal,
          qoldiq
        },
        transactions: shiftTransactions
      };
    });

    // Smenasiz tranzaksiyalarni yig'amiz
    const otherTransactions = allTransactions
      .filter(t => !t.shiftId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (otherTransactions.length > 0) {
      const totalIncome = otherTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const terminal = otherTransactions.filter(t => t.type === 'income' && (t.method === 'terminal' || t.method === 'karta')).reduce((sum, t) => sum + t.amount, 0);
      const qrcode = otherTransactions.filter(t => t.type === 'income' && t.method === 'qrcode').reduce((sum, t) => sum + t.amount, 0);
      const transfer = otherTransactions.filter(t => t.type === 'income' && t.method === 'transfer').reduce((sum, t) => sum + t.amount, 0);
      const expensesTotal = otherTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const cashIncome = totalIncome - terminal - qrcode - transfer;
      const qoldiq = totalIncome - terminal - qrcode - transfer - expensesTotal;

      groupedData.push({
        shift: {
          id: 'other',
          shiftType: 'other',
          adminName: 'Boshqalar (Smenasiz)',
          branchName: targetBranchId ? 'Joriy filial' : 'Barcha filiallar'
        },
        stats: {
          totalIncome,
          terminal,
          qrcode,
          transfer,
          cashIncome,
          expenses: expensesTotal,
          qoldiq
        },
        transactions: otherTransactions
      });
    }

    res.json({ success: true, data: groupedData });
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// PUT /api/transactions/payments/:id - To'lov ma'lumotlarini tahrirlash
router.put('/payments/:id', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const { method, amount } = req.body;
    const userRole = req.user.role;

    // To'lovni topish
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'To\'lov topilmadi' });
    }

    // Owner tekshiruvi: faqat Owner summani o'zgartira oladi
    const newAmount = amount ? parseFloat(amount) : payment.amount;
    let amountDiff = 0;
    
    if (newAmount !== payment.amount) {
      if (userRole !== 'owner') {
        return res.status(403).json({ success: false, message: 'Summani o\'zgartirish huquqi faqat Rahbarda mavjud.' });
      }
      amountDiff = newAmount - payment.amount;
    }

    // Yangilash
    await prisma.$transaction(async (tx) => {
      // 1. Payment jadvalini yangilash
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          method: method || payment.method,
          ...(amountDiff !== 0 ? { amount: newAmount } : {})
        }
      });

      // 2. Agar summa o'zgargan bo'lsa, Booking va Shift jadvallarini ham moslash
      if (amountDiff !== 0) {
        // Booking
        if (payment.bookingId) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: { paidAmount: { increment: amountDiff } }
          });
        }
        
        // Shift
        if (payment.shiftId) {
          await tx.shift.update({
            where: { id: payment.shiftId },
            data: { totalIncome: { increment: amountDiff } }
          });
        }
      }
    });

    res.json({ success: true, message: 'To\'lov muvaffaqiyatli tahrirlandi' });
  } catch (error) {
    console.error('Payment update error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
