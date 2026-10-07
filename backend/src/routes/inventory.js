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

    let itemsToProcess = [];
    if (Array.isArray(req.body.items) && req.body.items.length > 0) {
      itemsToProcess = req.body.items.map(i => ({
        productId: parseInt(i.productId),
        quantity: parseFloat(i.quantity),
        purchasePrice: i.purchasePrice ? parseFloat(i.purchasePrice) : null
      })).filter(i => i.productId && i.quantity > 0);
    } else if (req.body.productId && req.body.quantity) {
      itemsToProcess.push({
        productId: parseInt(req.body.productId),
        quantity: parseFloat(req.body.quantity),
        purchasePrice: req.body.purchasePrice ? parseFloat(req.body.purchasePrice) : null
      });
    }

    if (itemsToProcess.length === 0) {
      return res.status(400).json({ success: false, message: "Ma'lumotlar noto'g'ri yoki mahsulot tanlanmagan" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdBatches = [];

      for (const item of itemsToProcess) {
        const product = await tx.inventoryProduct.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        let expirationDate = null;
        if (product.hasLifespan && product.lifespanDays) {
          expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + product.lifespanDays);
        }

        const newBatch = await tx.inventoryBatch.create({
          data: {
            companyId,
            branchId: null, // Bosh ombor
            productId: product.id,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
            expirationDate
          }
        });

        await tx.inventoryTransaction.create({
          data: {
            companyId,
            branchId: null,
            productId: product.id,
            type: 'IN',
            quantity: item.quantity,
            adminId,
            notes: req.body.notes || 'Bosh omborga kirim qilingan'
          }
        });

        createdBatches.push(newBatch);
      }

      return createdBatches;
    });

    res.json({ success: true, data: result, message: `${itemsToProcess.length} ta mahsulot Bosh omborga kirim qilindi` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});


// --- BOSH OMBORDAN FILIALGA TO'G'RIDAN-TO'G'RI O'TKAZISH (TRANSFER) ---

router.post('/stock/transfer', async (req, res) => {
  try {
    const { companyId, id: adminId, role } = req.user;
    if (role !== 'owner' && role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Faqat owner filialga o\'tkaza oladi' });
    }

    const { branchId, notes } = req.body;
    let itemsToProcess = [];

    if (Array.isArray(req.body.items) && req.body.items.length > 0) {
      itemsToProcess = req.body.items.map(item => ({
        productId: parseInt(item.productId),
        quantity: parseFloat(item.quantity)
      })).filter(i => i.productId && i.quantity > 0);
    } else if (req.body.productId && req.body.quantity) {
      itemsToProcess.push({
        productId: parseInt(req.body.productId),
        quantity: parseFloat(req.body.quantity)
      });
    }

    if (!branchId || itemsToProcess.length === 0) {
      return res.status(400).json({ success: false, message: "Filial tanlanmagan yoki mahsulotlar kiritilmagan" });
    }

    // Har bir mahsulot uchun bosh omborda yetarli qoldiq borligini oldindan tekshirish
    for (const item of itemsToProcess) {
      const mainBatches = await prisma.inventoryBatch.findMany({
        where: {
          companyId,
          branchId: null,
          productId: item.productId,
          quantity: { gt: 0 },
          status: { in: ['active'] }
        }
      });
      const totalAvailable = mainBatches.reduce((sum, b) => sum + b.quantity, 0);
      if (totalAvailable < item.quantity) {
        const prod = await prisma.inventoryProduct.findUnique({ where: { id: item.productId } });
        return res.status(400).json({ 
          success: false, 
          message: `"${prod?.name || 'Mahsulot'}" uchun Bosh omborda yetarli qoldiq yo'q. Mavjud: ${totalAvailable}, So'ralgan: ${item.quantity}` 
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdBatches = [];

      for (const item of itemsToProcess) {
        const mainBatches = await tx.inventoryBatch.findMany({
          where: {
            companyId,
            branchId: null,
            productId: item.productId,
            quantity: { gt: 0 },
            status: { in: ['active'] }
          },
          orderBy: { purchaseDate: 'asc' }
        });

        let quantityToDeduct = item.quantity;
        let lastExpDate = null;

        for (const batch of mainBatches) {
          if (quantityToDeduct <= 0) break;
          const deductAmount = Math.min(batch.quantity, quantityToDeduct);
          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: { quantity: batch.quantity - deductAmount }
          });
          quantityToDeduct -= deductAmount;
          lastExpDate = batch.expirationDate;
        }

        const newBatch = await tx.inventoryBatch.create({
          data: {
            companyId,
            branchId: parseInt(branchId),
            productId: item.productId,
            quantity: item.quantity,
            expirationDate: lastExpDate
          }
        });

        await tx.inventoryTransaction.create({
          data: {
            companyId,
            branchId: parseInt(branchId),
            productId: item.productId,
            type: 'TRANSFER',
            quantity: item.quantity,
            adminId,
            notes: notes || "Filialga berildi"
          }
        });

        createdBatches.push(newBatch);
      }

      return createdBatches;
    });

    res.json({ success: true, data: result, message: `${itemsToProcess.length} ta mahsulot filialga muvaffaqiyatli o'tkazildi` });
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
