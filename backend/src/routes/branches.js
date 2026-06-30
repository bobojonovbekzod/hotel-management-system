const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/branches
router.get('/', authenticate, async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true, companyId: req.user.companyId },
      include: {
        _count: { select: { rooms: true, users: true } },
      },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: branches });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/branches - Yangi filial
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'supervisor') {
      return res.status(403).json({ success: false, message: 'Faqat biznes egasi filial qo\'sha oladi.' });
    }
    const { name, address, phone } = req.body;
    const branch = await prisma.branch.create({ data: { companyId: req.user.companyId, name, address, phone } });
    res.status(201).json({ success: true, data: branch });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/branches/:id - Filialni tahrirlash
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'supervisor') {
      return res.status(403).json({ success: false, message: 'Faqat biznes egasi filialni tahrirlay oladi.' });
    }
    const branchId = parseInt(req.params.id);
    const { name, address, phone } = req.body;
    
    // Check ownership
    const existing = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!existing || existing.companyId !== req.user.companyId) {
      return res.status(404).json({ success: false, message: 'Filial topilmadi.' });
    }

    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: { name, address, phone }
    });
    res.json({ success: true, data: branch });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// DELETE /api/branches/:id - Filialni o'chirish (yoki nofaol qilish)
router.delete('/:id', authenticate, authorize('owner', 'superadmin'), async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'supervisor') {
      return res.status(403).json({ success: false, message: 'Faqat biznes egasi filialni o\'chira oladi.' });
    }
    const branchId = parseInt(req.params.id);
    
    // Check ownership
    const existing = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!existing || existing.companyId !== req.user.companyId) {
      return res.status(404).json({ success: false, message: 'Filial topilmadi.' });
    }

    // We can soft delete or hard delete. For now let's just make it inactive to keep related records safe, or hard delete if there are no rooms/users.
    // Let's hard delete to keep it simple, Prisma will cascade if configured, but let's just delete.
    // Actually, setting isActive = false is safer for Hotel Systems.
    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: { isActive: false }
    });
    
    res.json({ success: true, message: 'Filial o\'chirildi (nofaol qilindi).' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi (Filialda bog\'langan xodim/xonalar bo\'lishi mumkin).' });
  }
});

module.exports = router;
