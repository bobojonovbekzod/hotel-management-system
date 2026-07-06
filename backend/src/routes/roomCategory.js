const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');

// Get all room categories for the company
router.get('/', authenticate, authorize('owner', 'supervisor'), async (req, res) => {
  try {
    const categories = await prisma.roomCategory.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Xatolik yuz berdi' });
  }
});

// Create a new room category
router.post('/', authenticate, authorize('owner'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Xona turi nomini kiriting' });
    }

    const category = await prisma.roomCategory.create({
      data: {
        name: name.trim(),
        companyId: req.user.companyId
      }
    });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Bu xona turi allaqachon mavjud' });
    }
    res.status(500).json({ success: false, message: 'Xatolik yuz berdi' });
  }
});

// Delete a room category
router.delete('/:id', authenticate, authorize('owner'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const category = await prisma.roomCategory.findFirst({
      where: { id, companyId: req.user.companyId }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Topilmadi' });
    }

    await prisma.roomCategory.delete({ where: { id } });
    res.json({ success: true, message: 'O\'chirildi' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Xatolik yuz berdi' });
  }
});

module.exports = router;
