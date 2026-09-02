const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/expenses
router.get('/', authenticate, async (req, res) => {
  try {
    const { branchId, categoryId, startDate, endDate, search, isCompanyExpense } = req.query;
    const where = {};
    if (req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    if (isCompanyExpense !== undefined) {
      where.isCompanyExpense = isCompanyExpense === 'true';
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
    const { categoryId, amount, description, expenseDate, shiftId, branchId, isCompanyExpense, paymentSource } = req.body;

    if (req.user.role === 'admin' && !shiftId) {
      return res.status(403).json({ success: false, message: 'Avval smena boshlang!' });
    }

    const targetBranchId = branchId ? parseInt(branchId) : req.user.branchId;

    let finalExpenseDate = expenseDate ? new Date(expenseDate) : new Date();

    if (shiftId) {
      const activeShift = await prisma.shift.findUnique({
        where: { id: parseInt(shiftId) }
      });
      if (activeShift && activeShift.startTime) {
        const shiftStart = new Date(activeShift.startTime);
        // Calculate business date of shift (if startTime < 08:00 AM, it belongs to previous calendar day)
        const businessDate = new Date(shiftStart);
        if (shiftStart.getHours() < 8) {
          businessDate.setDate(businessDate.getDate() - 1);
        }
        finalExpenseDate = new Date(businessDate.getFullYear(), businessDate.getMonth(), businessDate.getDate(), 12, 0, 0);
      }
    }

    const expense = await prisma.expense.create({
      data: {
        companyId: req.user.companyId || 1,
        branchId: targetBranchId,
        adminId: req.user.id,
        shiftId: shiftId ? parseInt(shiftId) : null,
        categoryId: parseInt(categoryId),
        amount: parseFloat(amount),
        description,
        isCompanyExpense: Boolean(isCompanyExpense),
        paymentSource: paymentSource || 'cash', // 'cash', 'bank', 'transfer'
        expenseDate: finalExpenseDate,
      },
    });


    res.status(201).json({ success: true, data: expense, message: 'Xarajat muvaffaqiyatli qo\'shildi.' });
  } catch (error) {
    console.error('Error in POST /api/expenses:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});


// PUT /api/expenses/:id - Xarajatni tahrirlash
router.put('/:id', authenticate, authorize('owner', 'superadmin', 'admin', 'director'), async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const { categoryId, amount, description, expenseDate, branchId, isCompanyExpense, paymentSource } = req.body;

    const existingExpense = await prisma.expense.findFirst({
      where: { id: expenseId, companyId: req.user.companyId || 1 }
    });

    if (!existingExpense) {
      return res.status(404).json({ success: false, message: 'Xarajat topilmadi.' });
    }

    const updateData = {};
    if (categoryId) updateData.categoryId = parseInt(categoryId);
    if (amount) updateData.amount = parseFloat(amount);
    if (description !== undefined) updateData.description = description;
    if (expenseDate) updateData.expenseDate = new Date(expenseDate);
    if (branchId) updateData.branchId = parseInt(branchId);
    if (isCompanyExpense !== undefined) updateData.isCompanyExpense = Boolean(isCompanyExpense);
    if (paymentSource) updateData.paymentSource = paymentSource;

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData
    });

    res.json({ success: true, data: updatedExpense, message: 'Xarajat muvaffaqiyatli tahrirlandi.' });
  } catch (error) {
    console.error('Error in PUT /api/expenses/:id:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', authenticate, authorize('owner', 'superadmin'), async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: parseInt(req.params.id), companyId: req.user.companyId || 1 } });
    res.json({ success: true, message: 'Xarajat o\'chirildi.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});


module.exports = router;
