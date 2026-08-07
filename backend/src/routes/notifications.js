const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// --- BARCHA XABARLARNI OLISH ---
router.get('/', async (req, res) => {
  try {
    const { id: userId } = req.user;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Oxirgi 50 ta xabarni olish
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// --- BARCHASINI O'QILGAN QILIB BELGILASH ---
router.put('/read-all', async (req, res) => {
  try {
    const { id: userId } = req.user;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true, message: "Barchasi o'qilgan qilib belgilandi" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
