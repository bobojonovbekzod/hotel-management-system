const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username va parol kiritilishi shart.' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { branch: true, company: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Username yoki parol noto\'g\'ri.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Username yoki parol noto\'g\'ri.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, branchId: user.branchId, companyId: user.companyId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Muvaffaqiyatli kirdingiz!',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({ success: true, user: userWithoutPassword });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const isPasswordValid = await bcrypt.compare(currentPassword, req.user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Joriy parol noto\'g\'ri.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.json({ success: true, message: 'Parol muvaffaqiyatli o\'zgartirildi.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
