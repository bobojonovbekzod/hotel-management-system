const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/expenses
router.get('/', authenticate, async (req, res) => {
  try {
    const { branchId, categoryId, month, year } = req.query;
    const where = { companyId: req.user.companyId };

    if (req.user.role === 'admin') {
      where.branchId = req.user.branchId;
    } else if (req.user.role === 'director') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = parseInt(branchId);
    }

    if (categoryId) where.categoryId = parseInt(categoryId);

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.expenseDate = { gte: startDate, lte: endDate };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        admin: { select: { name: true } },
        branch: { select: { name: true } },
        category: true,
      },
      orderBy: { expenseDate: 'desc' },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({ success: true, data: expenses, total });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/expenses - Xarajat qo'shish
router.post('/', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const { categoryId, amount, description, expenseDate, shiftId } = req.body;

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
