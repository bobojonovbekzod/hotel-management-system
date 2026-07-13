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
router.get('/', authenticate, authorize('owner', 'director', 'hr'), async (req, res) => {
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
        isFaceRegistered: true, photoUrl: true, birthDate: true, gender: true, telegram: true,
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
router.post('/', authenticate, authorize('owner', 'director', 'hr'), async (req, res) => {
  try {
    const { name, username, password, role, phone, salary, salaryType, kpiPercentage, branchId, birthDate, gender, telegram } = req.body;

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
        branchId: targetBranchId,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
        telegram: telegram || null
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
router.put('/:id', authenticate, authorize('owner', 'director', 'hr'), async (req, res) => {
  try {
    const { name, phone, salary, salaryType, kpiPercentage, isActive, role, birthDate, gender, telegram } = req.body;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id), companyId: req.user.companyId },
      data: { 
        name, 
        phone, 
        salaryType: salaryType || undefined, 
        salary: salary !== undefined && salary !== null && salary !== '' ? parseFloat(salary) : undefined, 
        kpiPercentage: kpiPercentage !== undefined && kpiPercentage !== null && kpiPercentage !== '' ? parseFloat(kpiPercentage) : undefined, 
        isActive, 
        role,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
        telegram: telegram || null
      },
      select: { id: true, name: true, username: true, role: true, phone: true, salaryType: true, salary: true, kpiPercentage: true, isActive: true, isFaceRegistered: true, photoUrl: true, birthDate: true, gender: true, telegram: true },
    });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/users/:id/face - Yuz rasmini yuklash va Hikvisionga jo'natish
router.post('/:id/face', authenticate, authorize('owner', 'director', 'hr'), async (req, res) => {
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

    const branchIdStr = device.branchId.toString();
    const socketId = req.connectedAgents.get(branchIdStr);

    if (socketId) {
      const agentSocket = req.agentNamespace.sockets.get(socketId);
      if (agentSocket) {
        const agentResponse = await new Promise((resolve) => {
          agentSocket.emit('ADD_FACE', {
            userId: user.id.toString(),
            name: user.name,
            device,
            image: imageBuffer
          }, (res) => resolve(res));
          setTimeout(() => resolve({ success: false, message: 'Agentdan javob kutilmadi (Timeout)' }), 20000);
        });

        if (!agentResponse.success) {
          throw new Error(agentResponse.message || 'Agent orqali rasm yuklashda xatolik');
        }
      } else {
        throw new Error("Filial agenti tarmoqdan uzilgan.");
      }
    } else {
      throw new Error(`Filial (${device.branchId}) agenti onlayn emas. Avval resepshndagi Agent dasturini ishga tushiring.`);
    }

    // Rasmni server diskida saqlash
    const uploadDir = path.join(__dirname, '../../uploads/faces');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filename = `${userId}_${Date.now()}.jpg`;
    const filePath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filePath, imageBuffer);
    const photoUrlPath = `/api/uploads/faces/${filename}`;

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

// DELETE /api/users/:id/face
router.delete('/:id/face', authenticate, authorize('owner', 'director', 'supervisor', 'admin', 'hr'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'Xodim topilmadi.' });

    // Hamma qurilmalarni topamiz
    const devices = await prisma.device.findMany({ where: { companyId: user.companyId } });
    
    for (let device of devices) {
      const branchIdStr = device.branchId.toString();
      const socketId = req.connectedAgents.get(branchIdStr);
      if (socketId) {
        const agentSocket = req.agentNamespace.sockets.get(socketId);
        if (agentSocket) {
          agentSocket.emit('DELETE_FACE', {
            userId: user.id.toString(),
            device
          });
        }
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isFaceRegistered: false, photoUrl: null }
    });

    res.json({ success: true, message: 'Yuz o\'chirildi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize('owner', 'hr'), async (req, res) => {
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

// GET /api/users/hr-stats - HR Dashboard statistikasi
router.get('/hr-stats', authenticate, authorize('owner', 'director', 'supervisor', 'hr'), async (req, res) => {
  try {
    const where = { companyId: req.user.companyId, role: { notIn: ['owner', 'superadmin'] } };
    if (req.user.role === 'director') where.branchId = req.user.branchId;

    const allStaff = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, role: true, isActive: true, createdAt: true,
        birthDate: true, gender: true, telegram: true, phone: true, photoUrl: true,
        branch: { select: { id: true, name: true } }
      }
    });

    const total = allStaff.length;
    const active = allStaff.filter(u => u.isActive).length;
    const inactive = total - active;

    // Branches and Roles count
    const uniqueBranches = new Set(allStaff.map(u => u.branch?.id).filter(Boolean)).size;
    const uniqueRoles = new Set(allStaff.map(u => u.role)).size;

    // Avg Experience (based on createdAt for now)
    const now = new Date();
    let totalMonthsExp = 0;
    allStaff.forEach(u => {
      const ms = now - new Date(u.createdAt);
      totalMonthsExp += ms / (1000 * 60 * 60 * 24 * 30);
    });
    const avgExperience = total > 0 ? (totalMonthsExp / 12 / total).toFixed(1) : 0;

    // Age distribution
    const ageDist = { under25: 0, from25to35: 0, from35to55: 0, over55: 0 };
    allStaff.forEach(u => {
      if (u.birthDate) {
        const age = now.getFullYear() - new Date(u.birthDate).getFullYear();
        if (age < 25) ageDist.under25++;
        else if (age >= 25 && age < 35) ageDist.from25to35++;
        else if (age >= 35 && age < 55) ageDist.from35to55++;
        else ageDist.over55++;
      }
    });

    // Gender distribution
    const genderDist = { male: 0, female: 0, other: 0 };
    allStaff.forEach(u => {
      if (u.gender === 'Erkak') genderDist.male++;
      else if (u.gender === 'Ayol') genderDist.female++;
      else if (u.gender) genderDist.other++;
    });

    // Profile completion
    const profile = {
      telegram: allStaff.filter(u => !!u.telegram).length,
      phone: allStaff.filter(u => !!u.phone).length,
      photo: allStaff.filter(u => !!u.photoUrl).length,
      email: 0 // Optional per user request
    };

    // Role breakdown
    const byRole = {};
    allStaff.forEach(u => {
      byRole[u.role] = (byRole[u.role] || 0) + 1;
    });

    // Branch breakdown
    const byBranch = {};
    allStaff.forEach(u => {
      const branchName = u.branch?.name || 'Filial biriktirilmagan';
      if (!byBranch[branchName]) byBranch[branchName] = { total: 0, active: 0 };
      byBranch[branchName].total++;
      if (u.isActive) byBranch[branchName].active++;
    });

    // New this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = allStaff.filter(u => new Date(u.createdAt) >= monthStart).length;

    // Upcoming birthdays (next 30 days)
    const upcomingBirthdays = [];
    allStaff.forEach(u => {
      if (u.birthDate) {
        const bDate = new Date(u.birthDate);
        let nextBirthday = new Date(now.getFullYear(), bDate.getMonth(), bDate.getDate());
        if (nextBirthday < now) {
          nextBirthday = new Date(now.getFullYear() + 1, bDate.getMonth(), bDate.getDate());
        }
        const diffDays = Math.ceil((nextBirthday - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          upcomingBirthdays.push({
            id: u.id,
            name: u.name,
            birthDate: u.birthDate,
            daysLeft: diffDays,
            ageTurning: nextBirthday.getFullYear() - bDate.getFullYear()
          });
        }
      }
    });
    // Sort by days left
    upcomingBirthdays.sort((a, b) => a.daysLeft - b.daysLeft);

    res.json({
      success: true,
      data: {
        total, active, inactive, newThisMonth,
        departmentsCount: uniqueBranches,
        rolesCount: uniqueRoles,
        avgExperience,
        ageDist,
        genderDist,
        profile,
        upcomingBirthdays,
        byRole: Object.entries(byRole).map(([role, count]) => ({ role, count })),
        byBranch: Object.entries(byBranch).map(([branch, d]) => ({ branch, ...d })),
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
