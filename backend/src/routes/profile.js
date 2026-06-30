const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// PUT /api/profile
router.put('/', authenticate, async (req, res) => {
  try {
    const { name, username, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Fetch the current user to verify password if trying to change it
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
    }

    // Check if new username is already taken by someone else
    if (username && username !== currentUser.username) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Bu login (username) allaqachon band.' });
      }
    }

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (username) dataToUpdate.username = username;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Joriy parolni kiritishingiz shart.' });
      }
      
      const isMatch = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Joriy parol noto\'g\'ri.' });
      }

      dataToUpdate.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
      }
    });

    res.json({ success: true, data: updatedUser, message: 'Ma\'lumotlar muvaffaqiyatli yangilandi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
