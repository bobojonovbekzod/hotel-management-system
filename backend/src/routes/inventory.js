const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// --- KATEGORIYALAR ---

router.get('/categories', async (req, res) => {
  try {
    const { companyId } = req.user;
    const categories = await prisma.inventoryCategory.findMany({
      where: { companyId },
      include: { _count: { select: { products: true } } }
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { companyId } = req.user;
    const { name } = req.body;
    
    if (!name) return res.status(400).json({ success: false, message: 'Nom kiritish majburiy' });
    
    const category = await prisma.inventoryCategory.create({
      data: { companyId, name }
    });
    res.json({ success: true, data: category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});


// --- MAHSULOTLAR (PRODUCTS) ---

router.get('/products', async (req, res) => {
  try {
    const { companyId } = req.user;
    const products = await prisma.inventoryProduct.findMany({
      where: { companyId },
      include: { category: true }
    });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { companyId } = req.user;
    const { categoryId, name, measurementUnit, hasLifespan, lifespanDays } = req.body;
    
    if (!name || !categoryId) return res.status(400).json({ success: false, message: "Ma'lumotlar to'liq emas" });

    const product = await prisma.inventoryProduct.create({
      data: {
        companyId,
        categoryId: parseInt(categoryId),
        name,
        measurementUnit: measurementUnit || 'dona',
        hasLifespan: hasLifespan || false,
        lifespanDays: lifespanDays ? parseInt(lifespanDays) : null
      }
    });
    res.json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});


// --- BOSH OMBOR VA FILIAL QOLDIQLARI (BATCHES) ---

router.get('/stock', async (req, res) => {
  try {
    const { companyId, role, branchId: userBranchId } = req.user;
    const { branchId } = req.query; // Agar kelsa filialniki, kelmasa Bosh omborniki
    
    let targetBranchId = branchId ? parseInt(branchId) : null;

    // Director faqat o'z filialini ko'ra oladi (Bosh omborni ko'rmaydi, yoki faqat filial qoldig'ini ko'radi)
    if (role === 'director' || role === 'admin') {
      targetBranchId = userBranchId;
    }

    // Agar owner targetBranchId=null yuborsa Bosh Ombor chiqadi.
    const batches = await prisma.inventoryBatch.findMany({
      where: { 
        companyId, 
        branchId: targetBranchId,
        status: { in: ['active', 'expired'] },
        quantity: { gt: 0 }
      },
      include: {
        product: {
          include: { category: true }
        }
      },
      orderBy: { purchaseDate: 'desc' }
    });

    const today = new Date();
    
    const processedBatches = batches.map(b => {
      let isExpired = false;
      if (b.expirationDate && new Date(b.expirationDate) < today) {
        isExpired = true;
      }
      return { ...b, isExpired };
    });

    res.json({ success: true, data: processedBatches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});


// --- BOSH OMBORGA KIRIM QILISH (KIRIM) ---

router.post('/stock/kirim', async (req, res) => {
  try {
    const { companyId, id: adminId, role } = req.user;
    if (role !== 'owner' && role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Faqat owner kirim qila oladi' });
    }

    const { productId, quantity, purchasePrice } = req.body;
    
    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Ma'lumotlar noto'g'ri" });
    }

    const product = await prisma.inventoryProduct.findUnique({ where: { id: parseInt(productId) } });
    if (!product) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });

    let expirationDate = null;
    if (product.hasLifespan && product.lifespanDays) {
      expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + product.lifespanDays);
    }

    const result = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.inventoryBatch.create({
        data: {
          companyId,
          branchId: null, // Bosh ombor
          productId: product.id,
          quantity: parseFloat(quantity),
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
          expirationDate
        }
      });

      await tx.inventoryTransaction.create({
        data: {
          companyId,
          branchId: null,
          productId: product.id,
          type: 'IN',
          quantity: parseFloat(quantity),
          adminId,
          notes: 'Bosh omborga kirim qilingan'
        }
      });

      return newBatch;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});


// --- TARIX (TRANSACTIONS) ---

router.get('/transactions', async (req, res) => {
  try {
    const { companyId, role, branchId: userBranchId } = req.user;
    const { branchId } = req.query;

    let whereClause = { companyId };
    
    if (role === 'owner' || role === 'superadmin') {
      if (branchId) {
        whereClause.branchId = parseInt(branchId);
      }
    } else {
      // Director va boshqalar faqat o'z filialining tarixini ko'radi
      whereClause.branchId = userBranchId;
    }

    const txs = await prisma.inventoryTransaction.findMany({
      where: whereClause,
      include: {
        product: true,
        branch: { select: { name: true } },
        admin: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({ success: true, data: txs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
