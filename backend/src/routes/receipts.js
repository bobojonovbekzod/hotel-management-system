const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');
const { numberToUzbekWords } = require('../utils/numberToUzbekWords');

const BRANCH_LEGAL_ENTITIES = {
  'yunusobod': {
    companyName: '"BIZNES PRO INVESTMENT" MCHJ',
    address: 'Toshkent shahri, Yunusobod tumani, Sohibkor ko‘chasi 1/1',
    phone: '+998 33 152 11 11'
  },
  'zangiota': {
    companyName: '"FAMILY HOTELS AG" MCHJ',
    address: 'Toshkent viloyati, Zangiota tumani, Quyoshli',
    phone: '+998 33 152 11 11'
  },
  'buxoro': {
    companyName: '"MY HOTEL" MCHJ',
    address: 'Buxoro shahri, Ahmad Yassaviy ko‘chasi 2-uy',
    phone: '+998 33 716 05 55'
  },
  'samarqand': {
    companyName: '"FAMILY HOTELS AG" MCHJ',
    address: 'Samarqand shahri, Suzangaron ko‘chasi 5-uy',
    phone: '+998 33 713 05 55'
  },
  'samarqand-2': {
    companyName: '"TRIPLET" MCHJ',
    address: 'Samarqand shahri, O‘zbekistanskiy, Atoy ko‘chasi 14-uy',
    phone: '+998 33 718 05 55'
  },
  'selxoz': {
    companyName: '"MY HOTEL" MCHJ',
    address: 'Toshkent shahri, TashGres 148-uy',
    phone: '+998 33 701 05 55'
  },
  'ttz': {
    companyName: '"FAMILY HOTELS AG" MCHJ',
    address: 'Toshkent shahri, Ahmad Yugnakiy massivi 11a-uy',
    phone: '+998 33 702 05 55'
  },
  'parkentskiy': {
    companyName: '"FAMILY" OK',
    address: 'Toshkent shahri, Oltintepa ko‘chasi 189 b-uy',
    phone: '+998 33 703 05 55'
  },
  'mirobod': {
    companyName: '"ORIENT HOSTEL" OK',
    address: 'Toshkent shahri, Mingguzar ko‘chasi 14-uy',
    phone: '+998 33 704 05 55'
  },
  'chorsu': {
    companyName: '"FAMILY HOTELS AG" MCHJ',
    address: 'Toshkent shahri, Qizil tut ko‘chasi 3-berk, 60-uy',
    phone: '+998 33 705 05 55'
  }
};

const BRANCH_ID_TO_KEY = {
  1: 'samarqand',
  2: 'yunusobod',
  3: 'buxoro',
  4: 'ttz',
  5: 'parkentskiy',
  6: 'selxoz',
  7: 'chorsu',
  8: 'mirobod',
  9: 'zangiota',
  10: 'samarqand-2'
};

const BRANCH_LABELS = {
  'yunusobod': 'Yunusobod filiali',
  'zangiota': 'Zangiota filiali',
  'buxoro': 'Buxoro filiali',
  'samarqand': 'Samarqand 1 (Registon)',
  'samarqand-2': 'Samarqand 2 (Atoy)',
  'selxoz': 'Selxoz filiali',
  'ttz': 'TTZ filiali',
  'parkentskiy': 'Parkentskiy filiali',
  'mirobod': 'Mirobod filiali',
  'chorsu': 'Chorsu filiali'
};

function getBranchKeyForUser(user) {
  if (!user) return 'yunusobod';
  if (user.branchId && BRANCH_ID_TO_KEY[user.branchId]) {
    return BRANCH_ID_TO_KEY[user.branchId];
  }
  const branchName = (user.branch?.name || '').toLowerCase().trim();
  if (branchName.includes('zangiota')) return 'zangiota';
  if (branchName.includes('samarqand') && branchName.includes('2')) return 'samarqand-2';
  if (branchName.includes('samarqand')) return 'samarqand';
  if (branchName.includes('buxoro')) return 'buxoro';
  if (branchName.includes('yunusobod')) return 'yunusobod';
  if (branchName.includes('parkent')) return 'parkentskiy';
  if (branchName.includes('mirobod')) return 'mirobod';
  if (branchName.includes('selxoz')) return 'selxoz';
  if (branchName.includes('ttz')) return 'ttz';
  if (branchName.includes('chorsu')) return 'chorsu';
  return 'yunusobod';
}

function getEntityForBranch(branchName) {
  if (!branchName) return BRANCH_LEGAL_ENTITIES['yunusobod'];
  const normalized = branchName.toLowerCase().replace(/\s+/g, '-');
  for (const [key, val] of Object.entries(BRANCH_LEGAL_ENTITIES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return val;
    }
  }
  return {
    companyName: '"FAMILY HOTEL" MCHJ',
    address: 'Toshkent shahri',
    phone: '+998 33 152 11 11'
  };
}

// 1. GET LEGAL ENTITIES (FILTERED BY ADMIN BRANCH OR ALL FOR OWNER/DIRECTOR)
router.get('/entities', authenticate, async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userBranchKey = getBranchKeyForUser(req.user);

    // If admin or supervisor (branch level user)
    const isBranchRestricted = userRole === 'admin' || (userRole === 'supervisor' && req.user.branchId);

    if (isBranchRestricted && BRANCH_LEGAL_ENTITIES[userBranchKey]) {
      const singleEntity = {
        key: userBranchKey,
        branchLabel: BRANCH_LABELS[userBranchKey] || req.user.branch?.name || 'Filialingiz',
        ...BRANCH_LEGAL_ENTITIES[userBranchKey]
      };
      return res.json({
        success: true,
        isSingleBranch: true,
        defaultEntityKey: userBranchKey,
        entities: [singleEntity]
      });
    }

    // Owner, Director, Superadmin: can access all branches
    const list = Object.entries(BRANCH_LEGAL_ENTITIES).map(([key, val]) => ({
      key,
      branchLabel: BRANCH_LABELS[key] || key,
      ...val
    }));

    res.json({
      success: true,
      isSingleBranch: false,
      defaultEntityKey: userBranchKey,
      entities: list
    });
  } catch (error) {
    console.error('Error getting legal entities:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. GET NEXT RECEIPT NUMBER
router.get('/next-number', authenticate, async (req, res) => {
  try {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Count receipts created today
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const countToday = await prisma.receipt.count({
      where: {
        createdAt: { gte: startOfDay }
      }
    });

    const nextNum = (countToday + 1).toString().padStart(4, '0');
    const receiptNumber = `KV-${dateStr}-${nextNum}`;

    res.json({ success: true, receiptNumber });
  } catch (error) {
    console.error('Error generating receipt number:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. SEARCH GUESTS & BOOKINGS FOR AUTOCOMPLETE
router.get('/search-guests', authenticate, async (req, res) => {
  try {
    const { query, branchId } = req.query;
    const userBranchId = req.user.role === 'superadmin' || req.user.role === 'owner' 
      ? (branchId ? parseInt(branchId) : undefined)
      : req.user.branchId;

    const trimmedQuery = (query || '').trim();
    if (!trimmedQuery) {
      return res.json({ success: true, results: [] });
    }

    const queryParts = trimmedQuery.split(/\s+/).filter(Boolean);

    const searchConditions = [
      { primaryGuest: { firstName: { contains: trimmedQuery, mode: 'insensitive' } } },
      { primaryGuest: { lastName: { contains: trimmedQuery, mode: 'insensitive' } } },
      { primaryGuest: { passportNumber: { contains: trimmedQuery, mode: 'insensitive' } } },
      { room: { roomNumber: { contains: trimmedQuery, mode: 'insensitive' } } }
    ];

    if (queryParts.length >= 2) {
      const [w1, ...rest] = queryParts;
      const w2 = rest.join(' ');
      searchConditions.push(
        {
          AND: [
            { primaryGuest: { firstName: { contains: w1, mode: 'insensitive' } } },
            { primaryGuest: { lastName: { contains: w2, mode: 'insensitive' } } }
          ]
        },
        {
          AND: [
            { primaryGuest: { firstName: { contains: w2, mode: 'insensitive' } } },
            { primaryGuest: { lastName: { contains: w1, mode: 'insensitive' } } }
          ]
        }
      );
    }

    const where = {
      companyId: req.user.companyId || 1,
      ...(userBranchId && { branchId: userBranchId }),
      OR: searchConditions
    };

    const bookings = await prisma.booking.findMany({
      where,
      take: 25,
      orderBy: { id: 'desc' },
      include: {
        primaryGuest: true,
        room: true,
        branch: true
      }
    });

    const results = bookings.map(b => ({
      bookingId: b.id,
      guestName: `${b.primaryGuest?.firstName || ''} ${b.primaryGuest?.lastName || ''}`.trim() || 'Noma\'lum',
      passportNumber: b.primaryGuest?.passportNumber || '',
      roomNumber: b.room?.roomNumber || '',
      branchId: b.branchId,
      branchName: b.branch?.name || '',
      checkIn: b.checkIn,
      checkOut: b.checkOutActual || b.checkOutExpected,
      totalPrice: b.totalPrice,
      paidAmount: b.paidAmount
    }));

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error searching guests for receipt:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. GET ALL RECEIPTS (HISTORY)
router.get('/', authenticate, async (req, res) => {
  try {
    const { branchId, search, page = 1, limit = 50 } = req.query;
    const userBranchId = req.user.role === 'superadmin' || req.user.role === 'owner' 
      ? (branchId ? parseInt(branchId) : undefined)
      : req.user.branchId;

    const where = {
      companyId: req.user.companyId || 1,
      ...(userBranchId && { branchId: userBranchId }),
      ...(search && {
        OR: [
          { receiptNumber: { contains: search, mode: 'insensitive' } },
          { guestName: { contains: search, mode: 'insensitive' } },
          { roomNumber: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [total, receipts] = await Promise.all([
      prisma.receipt.count({ where }),
      prisma.receipt.findMany({
        where,
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        orderBy: { id: 'desc' },
        include: {
          branch: true
        }
      })
    ]);

    res.json({
      success: true,
      receipts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. CREATE OR UPDATE RECEIPT
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      id,
      receiptId,
      branchId,
      receiptNumber,
      companyName,
      companyAddress,
      companyPhone,
      guestName,
      passportNumber,
      roomNumber,
      checkInDate,
      checkOutDate,
      receiptDate,
      adminName,
      services,
      totalAmount,
      amountInWords,
      notes,
      bookingId
    } = req.body;

    const targetBranchId = branchId ? parseInt(branchId) : (req.user.branchId || 1);
    const branch = await prisma.branch.findUnique({ where: { id: targetBranchId } });
    const entityInfo = getEntityForBranch(branch?.name);

    const calculatedWords = amountInWords || numberToUzbekWords(totalAmount);
    const existingId = id || receiptId;

    if (existingId) {
      const existing = await prisma.receipt.findUnique({ where: { id: parseInt(existingId) } });
      if (existing) {
        const updated = await prisma.receipt.update({
          where: { id: parseInt(existingId) },
          data: {
            companyName: companyName || existing.companyName,
            companyAddress: companyAddress || existing.companyAddress,
            companyPhone: companyPhone || existing.companyPhone,
            guestName: guestName || existing.guestName,
            passportNumber: passportNumber || null,
            roomNumber: roomNumber ? String(roomNumber) : null,
            checkInDate: checkInDate ? new Date(checkInDate) : null,
            checkOutDate: checkOutDate ? new Date(checkOutDate) : null,
            receiptDate: receiptDate ? new Date(receiptDate) : existing.receiptDate,
            adminName: adminName || existing.adminName,
            services: services || existing.services,
            totalAmount: parseFloat(totalAmount) || 0,
            amountInWords: calculatedWords,
            notes: notes || null,
            bookingId: bookingId ? parseInt(bookingId) : existing.bookingId
          },
          include: { branch: true }
        });
        return res.json({ success: true, receipt: updated, isUpdate: true });
      }
    }

    let finalReceiptNumber = receiptNumber;
    if (!finalReceiptNumber) {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const count = await prisma.receipt.count();
      finalReceiptNumber = `KV-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
    }

    const receipt = await prisma.receipt.create({
      data: {
        companyId: req.user.companyId || 1,
        branchId: targetBranchId,
        receiptNumber: finalReceiptNumber,
        companyName: companyName || entityInfo.companyName,
        companyAddress: companyAddress || entityInfo.address,
        companyPhone: companyPhone || entityInfo.phone,
        guestName: guestName || 'Hurmatli Mehmon',
        passportNumber: passportNumber || null,
        roomNumber: roomNumber ? String(roomNumber) : null,
        checkInDate: checkInDate ? new Date(checkInDate) : null,
        checkOutDate: checkOutDate ? new Date(checkOutDate) : null,
        receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
        adminName: adminName || (req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Administrator'),
        services: services || [
          { name: 'Mehmonxona xizmati', quantity: 1, price: totalAmount || 0, total: totalAmount || 0 }
        ],
        totalAmount: parseFloat(totalAmount) || 0,
        amountInWords: calculatedWords,
        notes: notes || null,
        bookingId: bookingId ? parseInt(bookingId) : null
      },
      include: {
        branch: true
      }
    });

    res.status(201).json({ success: true, receipt, isUpdate: false });
  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// 6. DELETE RECEIPT
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.receipt.delete({ where: { id } });
    res.json({ success: true, message: 'Kvitansiya o‘chirildi' });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
