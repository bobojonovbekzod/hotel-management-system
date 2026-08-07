const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/tasks/my-pending-count - O'ziga biriktirilgan va bajarilmagan (TODO) vazifalar soni
router.get('/my-pending-count', authenticate, async (req, res) => {
  try {
    const count = await prisma.task.count({
      where: {
        assigneeId: req.user.id,
        status: 'TODO'
      }
    });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// GET /api/tasks - Vazifalar ro'yxatini olish
router.get('/', authenticate, authorize('owner', 'director', 'admin', 'supervisor'), async (req, res) => {
  try {
    const { branchId } = req.query;
    
    const where = { companyId: req.user.companyId };
    
    if (req.user.role === 'owner') {
      if (branchId) {
        where.branchId = parseInt(branchId);
      }
    } else {
      where.branchId = req.user.branchId;
      // Direktorlar va adminlar o'zlariga tegishli yoki o'z filialidagi vazifalarni ko'radi
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, role: true } },
        assignee: { select: { id: true, name: true, role: true } },
        branch: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/tasks - Yangi vazifa yaratish (Faqat owner)
router.post('/', authenticate, authorize('owner'), async (req, res) => {
  try {
    const { branchId, title, description, priority, dueDate, assigneeId } = req.body;

    if (!branchId || !title || !assigneeId) {
      return res.status(400).json({ success: false, message: "Majburiy maydonlarni to'ldiring." });
    }

    const task = await prisma.task.create({
      data: {
        companyId: req.user.companyId,
        branchId: parseInt(branchId),
        title,
        description,
        priority: priority || 'MEDIUM',
        status: 'TODO',
        dueDate: dueDate ? new Date(dueDate) : null,
        creatorId: req.user.id,
        assigneeId: parseInt(assigneeId)
      },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        assignee: { select: { id: true, name: true, role: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ success: true, data: task, message: "Vazifa yaratildi." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/tasks/:id - Vazifa holatini yoki o'zini o'zgartirish
router.put('/:id', authenticate, authorize('owner', 'director', 'admin', 'supervisor'), async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { title, description, priority, status, dueDate, assigneeId } = req.body;

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Vazifa topilmadi.' });
    }

    if (existingTask.companyId !== req.user.companyId) {
      return res.status(403).json({ success: false, message: 'Ruxsat yoq.' });
    }

    // Agar owner bo'lmasa, faqat o'ziga tegishli vazifaning statusini o'zgartira oladi
    if (req.user.role !== 'owner') {
      if (existingTask.assigneeId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Faqat o`zingizga biriktirilgan vazifa holatini o`zgartira olasiz.' });
      }
      
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: { status }, // faqat statusni o'zgartirish ruxsat etiladi
        include: {
          creator: { select: { id: true, name: true, role: true } },
          assignee: { select: { id: true, name: true, role: true } },
          branch: { select: { id: true, name: true } }
        }
      });
      return res.json({ success: true, data: updatedTask, message: "Holat o'zgartirildi." });
    }

    // Owner hamma narsani o'zgartira oladi
    const dataToUpdate = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (priority !== undefined) dataToUpdate.priority = priority;
    if (status !== undefined) dataToUpdate.status = status;
    if (dueDate !== undefined) dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) dataToUpdate.assigneeId = parseInt(assigneeId);

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: dataToUpdate,
      include: {
        creator: { select: { id: true, name: true, role: true } },
        assignee: { select: { id: true, name: true, role: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    res.json({ success: true, data: updatedTask, message: "Vazifa yangilandi." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// DELETE /api/tasks/:id - Vazifani o'chirish (Faqat owner)
router.delete('/:id', authenticate, authorize('owner'), async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    
    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Vazifa topilmadi.' });
    }
    
    if (existingTask.companyId !== req.user.companyId) {
      return res.status(403).json({ success: false, message: 'Ruxsat yoq.' });
    }

    await prisma.task.delete({ where: { id: taskId } });

    res.json({ success: true, message: 'Vazifa o`chirildi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
