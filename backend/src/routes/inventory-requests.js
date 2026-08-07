const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// --- SO'ROVLARNI OLISH (GET REQUESTS) ---
router.get('/', async (req, res) => {
  try {
    const { companyId, role, branchId: userBranchId } = req.user;
    
    let whereClause = { companyId };
    
    // Direktor faqat o'z filialining so'rovlarini ko'radi
    if (role === 'director' || role === 'admin') {
      whereClause.branchId = userBranchId;
    }

    const requests = await prisma.inventoryRequest.findMany({
      where: whereClause,
      include: {
        product: { include: { category: true } },
        branch: { select: { name: true } },
        requestedBy: { select: { name: true, role: true } },
        approvedBy: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});


// --- YANGI SO'ROV YARATISH (DIRECTOR -> OWNER) ---
router.post('/', async (req, res) => {
  try {
    const { companyId, id: userId, branchId } = req.user;
    const { productId, requestedQuantity, notes } = req.body;

    if (!branchId) return res.status(400).json({ success: false, message: 'Filialga biriktirilmagansiz' });
    if (!productId || !requestedQuantity || requestedQuantity <= 0) {
      return res.status(400).json({ success: false, message: "Ma'lumotlar noto'g'ri" });
    }

    const request = await prisma.inventoryRequest.create({
      data: {
        companyId,
        branchId,
        productId: parseInt(productId),
        requestedQuantity: parseFloat(requestedQuantity),
        requestedById: userId,
        notes
      },
      include: {
        branch: { select: { name: true } },
        product: { select: { name: true } }
      }
    });

    // Ownerlarga Notification yuborish
    const owners = await prisma.user.findMany({
      where: { companyId, role: 'owner' }
    });

    if (owners.length > 0) {
      const notificationData = owners.map(owner => ({
        userId: owner.id,
        title: "Yangi Omborxona So'rovi",
        message: `${request.branch.name} filiali ${request.requestedQuantity} ta ${request.product.name} so'ramoqda.`
      }));

      await prisma.notification.createMany({ data: notificationData });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});


// --- SO'ROVNI TASDIQLASH (APPROVE) ---
router.put('/:id/approve', async (req, res) => {
  try {
    const { companyId, id: adminId, role } = req.user;
    const requestId = parseInt(req.params.id);

    if (role !== 'owner' && role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Ruxsat etilmagan' });
    }

    const request = await prisma.inventoryRequest.findUnique({
      where: { id: requestId },
      include: { product: true }
    });

    if (!request || request.companyId !== companyId) {
      return res.status(404).json({ success: false, message: "So'rov topilmadi" });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: "Bu so'rov allaqachon ko'rib chiqilgan" });
    }

    // Bosh omborda yetarli qoldiq borligini tekshiramiz
    const mainBatches = await prisma.inventoryBatch.findMany({
      where: {
        companyId,
        branchId: null,
        productId: request.productId,
        quantity: { gt: 0 },
        status: { in: ['active'] }
      },
      orderBy: { purchaseDate: 'asc' } // Eski kelgan partiyadan boshlab minus qilamiz (FIFO)
    });

    let totalAvailable = mainBatches.reduce((sum, b) => sum + b.quantity, 0);

    if (totalAvailable < request.requestedQuantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Bosh omborda yetarli qoldiq yo'q. So'ralgan: ${request.requestedQuantity}, Mavjud: ${totalAvailable}` 
      });
    }

    // Tranzaksiya orqali (Main dan minus, Branch ga plus)
    const result = await prisma.$transaction(async (tx) => {
      let quantityToDeduct = request.requestedQuantity;
      let newBranchExpirationDate = null; // Filialga eng so'nggi uzatilgan partiyaning yaroqliligi
      
      for (const batch of mainBatches) {
        if (quantityToDeduct <= 0) break;

        const deductAmount = Math.min(batch.quantity, quantityToDeduct);
        
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: { quantity: batch.quantity - deductAmount }
        });

        quantityToDeduct -= deductAmount;
        newBranchExpirationDate = batch.expirationDate;
      }

      // Filialga yangi batch (qoldiq) qo'shish
      await tx.inventoryBatch.create({
        data: {
          companyId,
          branchId: request.branchId,
          productId: request.productId,
          quantity: request.requestedQuantity,
          expirationDate: newBranchExpirationDate // Main ombordagi yaroqlilik o'tadi
        }
      });

      // So'rovni approve qilish
      const updatedReq = await tx.inventoryRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          approvedById: adminId
        }
      });

      // Tarixga yozish
      await tx.inventoryTransaction.create({
        data: {
          companyId,
          branchId: request.branchId,
          productId: request.productId,
          type: 'TRANSFER',
          quantity: request.requestedQuantity,
          adminId,
          notes: "Filial so'rovi tasdiqlandi"
        }
      });

      // Filial direktoriga Notification yuborish
      await tx.notification.create({
        data: {
          userId: request.requestedById,
          title: "So'rov tasdiqlandi",
          message: `Sizning ${request.requestedQuantity} ta ${request.product.name} bo'yicha so'rovingiz tasdiqlandi va omboringizga tushdi.`
        }
      });

      return updatedReq;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});


// --- SO'ROVNI RAD ETISH (REJECT) ---
router.put('/:id/reject', async (req, res) => {
  try {
    const { companyId, id: adminId, role } = req.user;
    const requestId = parseInt(req.params.id);
    const { notes } = req.body;

    if (role !== 'owner' && role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Ruxsat etilmagan' });
    }

    const request = await prisma.inventoryRequest.findUnique({
      where: { id: requestId },
      include: { product: true }
    });

    if (!request || request.companyId !== companyId) {
      return res.status(404).json({ success: false, message: "So'rov topilmadi" });
    }

    const updatedReq = await prisma.inventoryRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        approvedById: adminId,
        notes: notes || request.notes
      }
    });

    // Filial direktoriga Notification
    await prisma.notification.create({
      data: {
        userId: request.requestedById,
        title: "So'rov rad etildi",
        message: `Sizning ${request.requestedQuantity} ta ${request.product.name} bo'yicha so'rovingiz rad etildi.`
      }
    });

    res.json({ success: true, data: updatedReq });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
