const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');

// Support BigInt JSON serialization
BigInt.prototype.toJSON = function() {
  return this.toString();
};

// GET /api/candidates - Get paginated list of HR candidates
router.get('/', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const search = (req.query.search || '').trim().toLowerCase();
    const branchId = req.query.branchId ? parseInt(req.query.branchId) : undefined;
    const status = req.query.status && req.query.status !== 'all' ? req.query.status : undefined;
    const position = req.query.position && req.query.position !== 'all' ? req.query.position : undefined;

    const where = {
      companyId,
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
      ...(position ? { position } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { experience: { contains: search, mode: 'insensitive' } },
          { position: { contains: search, mode: 'insensitive' } }
        ]
      } : {})
    };

    const total = await prisma.candidate.count({ where });

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const safeCandidates = candidates.map(c => ({
      ...c,
      telegramUserId: c.telegramUserId ? c.telegramUserId.toString() : null
    }));

    res.json({
      success: true,
      data: safeCandidates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("GET /api/candidates error:", error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PATCH /api/candidates/:id/status - Update candidate status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'new', 'interviewed', 'hired', 'rejected'

    if (!['new', 'interviewed', 'hired', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Noto\'g\'ri status' });
    }

    const updated = await prisma.candidate.update({
      where: { id: parseInt(id) },
      data: { status },
      include: { branch: true }
    });

    res.json({ success: true, data: updated, message: 'Status muvaffaqiyatli yangilandi' });
  } catch (error) {
    console.error("PATCH /api/candidates/:id/status error:", error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// DELETE /api/candidates/:id - Delete a candidate record
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.candidate.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true, message: 'Nomzod o\'chirildi' });
  } catch (error) {
    console.error("DELETE /api/candidates/:id error:", error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
