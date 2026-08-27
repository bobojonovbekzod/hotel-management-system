const express = require('express');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get cleaning tasks
router.get('/', authenticate, authorize('owner', 'admin', 'director'), async (req, res) => {
  try {
    const { branchId, date } = req.query;

    const whereClause = {
      status: 'completed'
    };

    if (req.user.role === 'owner' && branchId) {
      whereClause.branchId = parseInt(branchId);
    } else if (req.user.role !== 'owner') {
      whereClause.branchId = req.user.branchId;
    } else {
      whereClause.companyId = req.user.companyId;
    }

    // Default to today if no date provided
    let filterDate = new Date();
    if (date) {
      filterDate = new Date(date);
    }
    
    // Set start and end of the day
    const startOfDay = new Date(filterDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(filterDate);
    endOfDay.setHours(23, 59, 59, 999);

    whereClause.updatedAt = {
      gte: startOfDay,
      lte: endOfDay
    };

    const tasks = await prisma.cleaningTask.findMany({
      where: whereClause,
      include: {
        cleaner: {
          select: { name: true }
        },
        room: {
          select: { roomNumber: true }
        },
        branch: {
          select: { name: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ success: true, tasks });
  } catch (error) {
    console.error('Fetch cleaning tasks error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// GET /api/cleaning-tasks/pending - Farrosh uchun tozalanadigan xonalar (Branch bo'yicha)
router.get('/pending', authenticate, authorize('cleaner', 'admin', 'director', 'owner', 'supervisor'), async (req, res) => {
  try {
    const branchId = req.user.branchId || req.query.branchId;
    if (!branchId) return res.status(400).json({ success: false, message: 'Filial tanlanmagan' });

    // Active (pending or in_progress) tasks for rooms in this branch
    const activeTasks = await prisma.cleaningTask.findMany({
      where: { branchId: parseInt(branchId), status: { in: ['pending', 'in_progress'] } },
      include: { 
        room: { select: { roomNumber: true } },
        cleaner: { select: { id: true, name: true } }
      }
    });

    // Rooms in cleaning status
    const dirtyRooms = await prisma.room.findMany({
      where: { branchId: parseInt(branchId), status: 'cleaning' }
    });

    const activeTaskRoomIds = activeTasks.map(t => t.roomId).filter(id => id != null);
    const roomsRequiringTasks = dirtyRooms.filter(r => !activeTaskRoomIds.includes(r.id));

    res.json({
      success: true,
      pendingTasks: activeTasks.filter(t => t.status === 'pending'),
      dirtyRooms: roomsRequiringTasks
    });
  } catch (error) {
    console.error('Pending tasks error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// GET /api/cleaning-tasks/status - Farroshning joriy holati
router.get('/status', authenticate, authorize('cleaner', 'admin', 'director', 'supervisor', 'owner'), async (req, res) => {
  try {
    const activeTask = await prisma.cleaningTask.findFirst({
      where: { cleanerId: req.user.id, status: { in: ['in_progress', 'pending'] } },
      include: { room: { select: { roomNumber: true } } },
      orderBy: { id: 'desc' }
    });
    res.json({ success: true, activeTask });
  } catch (error) {
    console.error('Task status error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// POST /api/cleaning-tasks/start
router.post('/start', authenticate, authorize('cleaner', 'admin', 'director', 'supervisor', 'owner'), express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { taskType, roomId, photoBefore, taskId } = req.body;
    const branchId = req.user.branchId || 1;

    // Check if user already has an active task
    const activeTask = await prisma.cleaningTask.findFirst({
      where: { cleanerId: req.user.id, status: 'in_progress' }
    });
    if (activeTask) return res.status(400).json({ success: false, message: 'Avval boshlangan ishni yakunlang.' });

    let finalPhotoUrl = null;
    if (photoBefore) {
      const base64Data = photoBefore.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `task_before_${req.user.id}_${Date.now()}.jpg`;
      const uploadDir = path.join(__dirname, '../../uploads/cleaning');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, fileName), buffer);
      finalPhotoUrl = `/uploads/cleaning/${fileName}`;
    }

    let task;
    if (taskId) {
      // Claim an existing pending task
      task = await prisma.cleaningTask.update({
        where: { id: parseInt(taskId) },
        data: {
          cleaner: { connect: { id: req.user.id } },
          status: 'in_progress',
          beforeImage: finalPhotoUrl
        },
        include: { room: { select: { roomNumber: true } } }
      });
    } else {
      // Create a new task (e.g. corridor, street, or ad-hoc room)
      task = await prisma.cleaningTask.create({
        data: {
          companyId: req.user.companyId,
          branchId,
          cleanerId: req.user.id,
          roomId: roomId ? parseInt(roomId) : null,
          taskType: taskType || 'room',
          status: 'in_progress',
          beforeImage: finalPhotoUrl
        },
        include: { room: { select: { roomNumber: true } } }
      });
    }

    res.json({ success: true, task });
  } catch (error) {
    console.error('Task start error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// POST /api/cleaning-tasks/finish
router.post('/finish', authenticate, authorize('cleaner', 'admin', 'director', 'supervisor', 'owner'), express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { taskId, photoAfter } = req.body;

    let targetTaskId = taskId ? parseInt(taskId) : null;
    let task = targetTaskId ? await prisma.cleaningTask.findUnique({ where: { id: targetTaskId } }) : null;

    if (!task) {
      // Fallback: find active in_progress task for user
      task = await prisma.cleaningTask.findFirst({
        where: { cleanerId: req.user.id, status: 'in_progress' },
        orderBy: { id: 'desc' }
      });
    }

    if (!task) {
      // Fallback: find pending task for user
      task = await prisma.cleaningTask.findFirst({
        where: { cleanerId: req.user.id, status: 'pending' },
        orderBy: { id: 'desc' }
      });
    }

    if (!task || task.cleanerId !== req.user.id) {
      return res.status(400).json({ success: false, message: 'Jarayonda faol tozalash ishi topilmadi yoki bu ish sizga tegishli emas' });
    }

    let finalPhotoUrl = null;
    if (photoAfter) {
      const base64Data = photoAfter.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `task_after_${req.user.id}_${Date.now()}.jpg`;
      const uploadDir = path.join(__dirname, '../../uploads/cleaning');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, fileName), buffer);
      finalPhotoUrl = `/uploads/cleaning/${fileName}`;
    }

    const updatedTask = await prisma.cleaningTask.update({
      where: { id: task.id },
      data: {
        status: 'completed',
        afterImage: finalPhotoUrl
      }
    });

    if (task.roomId) {
      // If room is still 'cleaning', make it 'available'
      const room = await prisma.room.findUnique({ where: { id: task.roomId } });
      if (room && room.status === 'cleaning') {
        await prisma.room.update({
          where: { id: task.roomId },
          data: { status: 'available' }
        });
        
        if (req.io) {
          req.io.to(`branch-${room.branchId}`).emit('room-status-changed', { roomId: room.id, status: 'available' });
        }
      }
    }

    res.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Task finish error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// POST /api/cleaning-tasks/cancel - Tozalash ishini bekor qilish
router.post('/cancel', authenticate, authorize('cleaner', 'admin', 'director', 'supervisor', 'owner'), async (req, res) => {
  try {
    const { taskId } = req.body;
    let targetTaskId = taskId ? parseInt(taskId) : null;
    let task = targetTaskId ? await prisma.cleaningTask.findUnique({ where: { id: targetTaskId } }) : null;

    if (!task) {
      task = await prisma.cleaningTask.findFirst({
        where: { cleanerId: req.user.id, status: { in: ['pending', 'in_progress'] } },
        orderBy: { id: 'desc' }
      });
    }

    if (!task || (task.cleanerId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'owner')) {
      return res.status(400).json({ success: false, message: 'Bekor qilinadigan tozalash ishi topilmadi' });
    }

    await prisma.cleaningTask.delete({ where: { id: task.id } });
    res.json({ success: true, message: 'Tozalash ishi bekor qilindi' });
  } catch (error) {
    console.error('Task cancel error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// POST /api/cleaning-tasks/bot-start - Telegram Mini App (No JWT token needed)
router.post('/bot-start', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { taskId, userId, photoBefore } = req.body;
    const targetUserId = parseInt(userId);

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return res.status(400).json({ success: false, message: 'Foydalanuvchi topilmadi' });

    let finalPhotoUrl = null;
    if (photoBefore) {
      const base64Data = photoBefore.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `task_before_${user.id}_${Date.now()}.jpg`;
      const uploadDir = path.join(__dirname, '../../uploads/cleaning');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, fileName), buffer);
      finalPhotoUrl = `/uploads/cleaning/${fileName}`;
    }

    const task = await prisma.cleaningTask.update({
      where: { id: parseInt(taskId) },
      data: {
        cleaner: { connect: { id: user.id } },
        status: 'in_progress',
        beforeImage: finalPhotoUrl
      },
      include: { room: { select: { roomNumber: true } } }
    });

    res.json({ success: true, task });
  } catch (error) {
    console.error('Bot task start error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// POST /api/cleaning-tasks/bot-finish - Telegram Mini App (No JWT token needed)
router.post('/bot-finish', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { taskId, userId, photoAfter } = req.body;
    const targetUserId = parseInt(userId);

    const task = await prisma.cleaningTask.findUnique({ where: { id: parseInt(taskId) } });
    if (!task) {
      return res.status(400).json({ success: false, message: 'Ish topilmadi' });
    }

    let finalPhotoUrl = null;
    if (photoAfter) {
      const base64Data = photoAfter.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `task_after_${targetUserId}_${Date.now()}.jpg`;
      const uploadDir = path.join(__dirname, '../../uploads/cleaning');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, fileName), buffer);
      finalPhotoUrl = `/uploads/cleaning/${fileName}`;
    }

    const updatedTask = await prisma.cleaningTask.update({
      where: { id: parseInt(taskId) },
      data: {
        status: 'completed',
        afterImage: finalPhotoUrl
      }
    });

    if (task.roomId) {
      const room = await prisma.room.findUnique({ where: { id: task.roomId } });
      if (room && room.status === 'cleaning') {
        await prisma.room.update({
          where: { id: task.roomId },
          data: { status: 'available' }
        });
      }
    }

    res.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Bot task finish error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
