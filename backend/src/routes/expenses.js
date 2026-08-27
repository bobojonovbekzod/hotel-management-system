const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/expenses
router.get('/', authenticate, async (req, res) => {
  try {
    const { branchId, categoryId, startDate, endDate, month, year, search } = req.query;
    const where = {};
    if (req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    if (req.user.role === 'admin' || req.user.role === 'director') {
      where.branchId = req.user.branchId;
    } else if (branchId && branchId !== 'all') {
      where.branchId = parseInt(branchId);
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = parseInt(categoryId);
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { admin: { name: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const allExpenses = await prisma.expense.findMany({
      where,
      include: {
        admin: { select: { id: true, name: true, username: true } },
        branch: { select: { id: true, name: true } },
        category: true,
        shift: { select: { id: true, shiftType: true, startTime: true, endTime: true, status: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Process effective shift date for each expense
    const processedExpenses = allExpenses.map(e => {
      let effectiveDateObj = new Date(e.expenseDate || e.createdAt);

      // If linked to a night shift within 24h, attribute to night shift start date (for breakfast/late night expenses)
      if (e.shift?.startTime && e.shift?.shiftType === 'night') {
        const shiftStart = new Date(e.shift.startTime);
        const diffHours = (effectiveDateObj.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
        if (diffHours >= 0 && diffHours <= 24) {
          effectiveDateObj = shiftStart;
        }
      }

      const shiftDateStr = effectiveDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }); // YYYY-MM-DD
      const formattedShiftDate = effectiveDateObj.toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent' }); // DD.MM.YYYY

      return {
        ...e,
        effectiveDate: effectiveDateObj,
        shiftDateStr,
        formattedShiftDate,
        shiftType: e.shift?.shiftType || null
      };
    });

    // Filter by date interval based on Shift Date
    let expenses = processedExpenses;
    if (startDate && endDate) {
      expenses = processedExpenses.filter(e => e.shiftDateStr >= startDate && e.shiftDateStr <= endDate);
    } else if (startDate) {
      expenses = processedExpenses.filter(e => e.shiftDateStr >= startDate);
    } else if (endDate) {
      expenses = processedExpenses.filter(e => e.shiftDateStr <= endDate);
    }

    // Sort by effective shift date desc
    expenses.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryBreakdown = {};
    expenses.forEach(e => {
      const catName = e.category?.name || 'Boshqa';
      categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + e.amount;
    });

    res.json({
      success: true,
      data: expenses,
      total,
      count: expenses.length,
      categoryBreakdown
    });
  } catch (error) {
    console.error('Error in GET /api/expenses:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/expenses - Xarajat qo'shish
router.post('/', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const { categoryId, amount, description, expenseDate, shiftId } = req.body;

    if (req.user.role === 'admin' && !shiftId) {
      return res.status(403).json({ success: false, message: 'Avval smena boshlang!' });
    }

    const expense = await prisma.expense.create({
      data: {
        companyId: req.user.companyId,
        branchId: req.user.branchId,
        adminId: req.user.id,
        shiftId: shiftId ? parseInt(shiftId) : null,
        categoryId: parseInt(categoryId),
        amount: parseFloat(amount),
        description,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      },
    });

    res.status(201).json({ success: true, data: expense, message: 'Xarajat muvaffaqiyatli qo\'shildi.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', authenticate, authorize('owner', 'superadmin'), async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: parseInt(req.params.id), companyId: req.user.companyId } });
    res.json({ success: true, message: 'Xarajat o\'chirildi.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
