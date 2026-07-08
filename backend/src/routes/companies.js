const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Multer setup for logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/logos');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `company_${req.user.companyId}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// PUT /api/companies/logo - Upload company logo (Owner only)
router.put('/logo', authenticate, authorize('owner'), upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Fayl yuklanmadi.' });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;

    const updatedCompany = await prisma.company.update({
      where: { id: req.user.companyId },
      data: { logoUrl }
    });

    res.json({ success: true, logoUrl, message: 'Logotip muvaffaqiyatli yangilandi.' });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// GET /api/companies - Get all companies (SuperAdmin only)
router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { branches: true, users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/companies - Create a new company and its owner (SuperAdmin only)
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { companyName, ownerName, ownerUsername, ownerPassword, ownerPhone } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { username: ownerUsername } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Bu username band.' });
    }

    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    const newCompany = await prisma.company.create({
      data: {
        name: companyName,
        users: {
          create: {
            name: ownerName,
            username: ownerUsername,
            password: hashedPassword,
            phone: ownerPhone,
            role: 'owner'
          }
        },
        expenseCategories: {
          create: [
            { name: 'Oziq ovqat' },
            { name: 'Tozalik vositalari' },
            { name: 'Telekommunikatsiya' },
            { name: 'Remont' },
            { name: "Kommunal to'lovlar" },
            { name: 'Boshqa xarajatlar' }
          ]
        }
      },
      include: {
        users: true
      }
    });

    res.status(201).json({ success: true, data: newCompany, message: 'Kompaniya va Owner yaratildi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/companies/:id - Update company status and subscription (SuperAdmin only)
router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, isActive, subscriptionEndsAt } = req.body;
    const companyId = parseInt(req.params.id);

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        isActive,
        subscriptionEndsAt: subscriptionEndsAt ? new Date(subscriptionEndsAt) : null,
      },
      include: {
        _count: {
          select: { branches: true, users: true }
        }
      }
    });

    res.json({ success: true, data: updatedCompany, message: 'Kompaniya ma\'lumotlari yangilandi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
