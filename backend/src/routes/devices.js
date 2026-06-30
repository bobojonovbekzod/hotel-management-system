const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/devices
router.get('/', authenticate, authorize('owner', 'supervisor'), async (req, res) => {
  try {
    const where = { companyId: req.user.companyId };
    if (req.user.role === 'director') {
      where.branchId = req.user.branchId;
    }

    const devices = await prisma.device.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// POST /api/devices
router.post('/', authenticate, authorize('owner', 'supervisor'), async (req, res) => {
  try {
    const { branchId, name, ipAddress, port, username, password } = req.body;
    const targetBranchId = req.user.role === 'director' ? req.user.branchId : parseInt(branchId);

    const device = await prisma.device.create({
      data: {
        companyId: req.user.companyId,
        branchId: targetBranchId,
        name,
        ipAddress,
        port: parseInt(port) || 80,
        username,
        password,
      }
    });

    res.status(201).json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// DELETE /api/devices/:id
router.delete('/:id', authenticate, authorize('owner', 'supervisor'), async (req, res) => {
  try {
    await prisma.device.delete({
      where: { id: parseInt(req.params.id), companyId: req.user.companyId }
    });
    res.json({ success: true, message: 'Qurilma o\'chirildi' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
