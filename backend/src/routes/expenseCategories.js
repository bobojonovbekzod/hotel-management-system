const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/expense-categories - Barcha aktiv xarajat turlari
router.get('/', authenticate, async (req, res) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      where: { companyId: req.user.companyId, isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/expense-categories - Yangi xarajat turini qo'shish (Faqat owner)
router.post('/', authenticate, authorize('owner', 'superadmin'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) return res.status(400).json({ success: false, message: 'Kategoriya nomi kerak' });

    const existing = await prisma.expenseCategory.findFirst({
      where: { companyId: req.user.companyId, name: { equals: name, mode: 'insensitive' } }
    });

    if (existing) {
      if (!existing.isActive) {
        // Activate again
        const updated = await prisma.expenseCategory.update({
          where: { id: existing.id },
          data: { isActive: true }
        });
        return res.json({ success: true, data: updated, message: "Kategoriya qayta tiklandi" });
      }
      return res.status(400).json({ success: false, message: 'Bu turdagi xarajat allaqachon mavjud' });
    }

    const category = await prisma.expenseCategory.create({
      data: {
        companyId: req.user.companyId,
        name
      }
    });

    res.status(201).json({ success: true, data: category, message: "Yangi xarajat turi qo'shildi" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// DELETE /api/expense-categories/:id - Kategoriyani o'chirish (yoki nofaol qilish)
router.delete('/:id', authenticate, authorize('owner', 'superadmin'), async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    await prisma.expenseCategory.update({
      where: { id: categoryId, companyId: req.user.companyId },
      data: { isActive: false }
    });

    res.json({ success: true, message: "Xarajat turi ro'yxatdan olib tashlandi" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
