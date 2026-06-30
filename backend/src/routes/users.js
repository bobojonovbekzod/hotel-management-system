const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const HikvisionService = require('../services/hikvision');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/users - Foydalanuvchilar ro'yxati
router.get('/', authenticate, authorize('owner', 'director'), async (req, res) => {
  try {
    const where = { companyId: req.user.companyId };
    if (req.user.role === 'director') {
      where.branchId = req.user.branchId;
    } else if (req.query.branchId) {
      where.branchId = parseInt(req.query.branchId);
    }
    if (req.query.role) where.role = req.query.role;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, username: true, role: true, phone: true,
        salary: true, salaryType: true, kpiPercentage: true, isActive: true, createdAt: true,
        isFaceRegistered: true, photoUrl: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ branchId: 'asc' }, { role: 'asc' }, { name: 'asc' }],
    });

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/users - Yangi foydalanuvchi
router.post('/', authenticate, authorize('owner', 'director'), async (req, res) => {
  try {
    const { name, username, password, role, phone, salary, salaryType, kpiPercentage, branchId } = req.body;

    const targetBranchId = req.user.role === 'director' ? req.user.branchId : (branchId ? parseInt(branchId) : null);

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        companyId: req.user.companyId,
        name, 
        username, 
        password: hashedPassword, 
        role, 
        phone, 
        salaryType: salaryType || 'static',
        salary: parseFloat(salary || 0), 
        kpiPercentage: kpiPercentage ? parseFloat(kpiPercentage) : 0,
        branchId: targetBranchId 
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ success: true, data: userWithoutPassword, message: 'Foydalanuvchi yaratildi.' });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Bu username allaqachon mavjud.' });
    }
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, authorize('owner', 'director'), async (req, res) => {
  try {
    const { name, phone, salary, salaryType, kpiPercentage, isActive, role } = req.body;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id), companyId: req.user.companyId },
      data: { name, phone, salaryType: salaryType || undefined, salary: salary ? parseFloat(salary) : undefined, kpiPercentage: kpiPercentage !== undefined ? parseFloat(kpiPercentage) : undefined, isActive, role },
      select: { id: true, name: true, username: true, role: true, phone: true, salaryType: true, salary: true, kpiPercentage: true, isActive: true, isFaceRegistered: true, photoUrl: true },
    });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/users/:id/face - Yuz rasmini yuklash va Hikvisionga jo'natish
router.post('/:id/face', authenticate, authorize('owner', 'director'), async (req, res) => {
  try {
    const { deviceId, base64Image } = req.body;
    const userId = parseInt(req.params.id);

    if (!deviceId || !base64Image) {
      return res.status(400).json({ success: false, message: 'Qurilma ID si va rasm kerak.' });
    }

    const device = await prisma.device.findUnique({ where: { id: parseInt(deviceId) } });
    if (!device) return res.status(404).json({ success: false, message: 'Qurilma topilmadi.' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'Xodim topilmadi.' });

    // Base64 dan bufferni olish (masalan: "data:image/jpeg;base64,/9j/4AAQSkZJRg...")
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const hikvision = new HikvisionService(device);
    await hikvision.addFace(user.id.toString(), user.name, imageBuffer);

    // Rasmni server diskida saqlash
    const uploadDir = path.join(__dirname, '../../uploads/faces');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filename = `${userId}_${Date.now()}.jpg`;
    const filePath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filePath, imageBuffer);
    const photoUrlPath = `/uploads/faces/${filename}`;

    // Tizim bazasida belgilash
    await prisma.user.update({
      where: { id: userId },
      data: { isFaceRegistered: true, photoUrl: photoUrlPath }
    });

    res.json({ success: true, message: 'Yuz qurilmaga muvaffaqiyatli yuklandi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server xatosi' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize('owner'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Boshqa jadvallarda ishlatilgan bo'lsa o'chirmaslik uchun tekshirish
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: req.user.companyId },
      include: { 
        _count: { 
          select: { 
            bookings: true, 
            shifts: true, 
            expenses: true, 
            attendance: true,
            payrollTransactions: true,
            givenTransactions: true
          } 
        } 
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi.' });
    }

    const totalRelations = user._count.bookings + user._count.shifts + user._count.expenses + user._count.attendance + user._count.payrollTransactions + user._count.givenTransactions;

    if (totalRelations > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu xodimga tegishli smena, to\'lov yoki davomatlar borligi sababli o\'chirib bo\'lmaydi. O\'rniga xodimni "Nofaol" holatiga o\'tkazing.' 
      });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true, message: 'Xodim o\'chirildi.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
