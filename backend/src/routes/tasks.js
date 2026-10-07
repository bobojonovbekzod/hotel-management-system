const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');

// Multer storage for task attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/tasks');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// Helper to save base64 data to file
const saveBase64Image = (base64Str, prefix = 'task') => {
  if (!base64Str || typeof base64Str !== 'string') return null;
  if (!base64Str.startsWith('data:image/')) {
    if (base64Str.startsWith('/') || base64Str.startsWith('http')) return base64Str;
    return null;
  }
  const match = base64Str.match(/^data:image\/(\w+);base64,/);
  const ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'jpg';
  const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
  const uploadDir = path.join(__dirname, '../../uploads/tasks');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  fs.writeFileSync(path.join(uploadDir, fileName), buffer);
  return `/uploads/tasks/${fileName}`;
};

// POST /api/tasks/upload-image - Fayl yuklash (multipart/form-data)
router.post('/upload-image', authenticate, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Rasm tanlanmadi' });
    }
    const imageUrl = `/uploads/tasks/${req.file.filename}`;
    res.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error('Task image upload error:', error);
    res.status(500).json({ success: false, message: 'Rasm yuklashda xatolik' });
  }
});

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
router.get('/', authenticate, async (req, res) => {
  try {
    const { branchId } = req.query;
    
    const where = { companyId: req.user.companyId };
    
    if (req.user.role === 'owner') {
      if (branchId) {
        where.branchId = parseInt(branchId);
      }
    } else if (req.user.role === 'investor') {
      let allowedIds = [];
      if (req.user.investorBranchIds) {
        try { allowedIds = JSON.parse(req.user.investorBranchIds); } catch(e){}
      }
      if (allowedIds.length > 0) {
        where.branchId = { in: allowedIds };
      } else if (req.user.branchId) {
        where.branchId = req.user.branchId;
      }
    } else {
      if (req.user.branchId) {
        where.branchId = req.user.branchId;
      }
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

// POST /api/tasks - Yangi vazifa yaratish (Faqat owner, director, supervisor)
router.post('/', authenticate, authorize('owner', 'director', 'supervisor', 'admin'), async (req, res) => {
  try {
    const { branchId, title, description, priority, dueDate, assigneeId, taskImage, taskImageUrl, isPhotoRequired } = req.body;

    if (!branchId || !title || !assigneeId) {
      return res.status(400).json({ success: false, message: "Majburiy maydonlarni to'ldiring." });
    }

    let finalTaskImageUrl = taskImageUrl || null;
    if (taskImage) {
      finalTaskImageUrl = saveBase64Image(taskImage, 'task_req');
    }

    const task = await prisma.task.create({
      data: {
        companyId: req.user.companyId,
        branchId: parseInt(branchId),
        title,
        description,
        taskImageUrl: finalTaskImageUrl,
        priority: priority || 'MEDIUM',
        isPhotoRequired: isPhotoRequired === true || isPhotoRequired === 'true',
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

    if (req.io) {
      req.io.emit('new_task', task);
      req.io.emit('task_created', task);
    }

    res.status(201).json({ success: true, data: task, message: "Vazifa yaratildi." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/tasks/:id - Vazifa holatini yoki ma'lumotlarini o'zgartirish
router.put('/:id', authenticate, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { 
      title, description, priority, status, dueDate, assigneeId, 
      taskImage, taskImageUrl, resultImage, resultImageUrl, resultComment, isPhotoRequired 
    } = req.body;

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Vazifa topilmadi.' });
    }

    if (existingTask.companyId !== req.user.companyId) {
      return res.status(403).json({ success: false, message: 'Ruxsat yo`q.' });
    }

    // Process images
    let processedTaskImageUrl = undefined;
    if (taskImage !== undefined) {
      processedTaskImageUrl = saveBase64Image(taskImage, 'task_req') || taskImageUrl || null;
    } else if (taskImageUrl !== undefined) {
      processedTaskImageUrl = taskImageUrl;
    }

    let processedResultImageUrl = undefined;
    if (resultImage !== undefined) {
      processedResultImageUrl = saveBase64Image(resultImage, 'task_res') || resultImageUrl || null;
    } else if (resultImageUrl !== undefined) {
      processedResultImageUrl = resultImageUrl;
    }

    // Enforce photo requirement when attempting to transition to DONE
    if (status === 'DONE' && existingTask.isPhotoRequired) {
      const hasImage = !!(processedResultImageUrl || existingTask.resultImageUrl);
      if (!hasImage) {
        return res.status(400).json({ 
          success: false, 
          message: "Ushbu vazifani bajarish uchun natija rasmini (bajarilganlik tasdig'i) yuklash majburiy!" 
        });
      }
    }

    // Check permissions for non-owner users
    if (req.user.role !== 'owner') {
      const isDirectorOrSupervisorOfBranch = ['director', 'supervisor', 'admin'].includes(req.user.role) && existingTask.branchId === req.user.branchId;
      const isAssigneeOrCreator = existingTask.assigneeId === req.user.id || existingTask.creatorId === req.user.id;

      if (!isDirectorOrSupervisorOfBranch && !isAssigneeOrCreator) {
        return res.status(403).json({ success: false, message: 'Vazifa holatini o\'zgartirishga ruxsat yo\'q.' });
      }
      
      const updateData = {};
      if (status !== undefined) updateData.status = status;
      if (processedResultImageUrl !== undefined) updateData.resultImageUrl = processedResultImageUrl;
      if (resultComment !== undefined) updateData.resultComment = resultComment;

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          creator: { select: { id: true, name: true, role: true } },
          assignee: { select: { id: true, name: true, role: true } },
          branch: { select: { id: true, name: true } }
        }
      });

      if (req.io) {
        req.io.emit('task_updated', updatedTask);
      }

      return res.json({ success: true, data: updatedTask, message: "Vazifa yangilandi." });
    }

    // Owner can update all fields
    const dataToUpdate = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (priority !== undefined) dataToUpdate.priority = priority;
    if (status !== undefined) dataToUpdate.status = status;
    if (isPhotoRequired !== undefined) dataToUpdate.isPhotoRequired = Boolean(isPhotoRequired);
    if (dueDate !== undefined) dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) dataToUpdate.assigneeId = parseInt(assigneeId);
    if (processedTaskImageUrl !== undefined) dataToUpdate.taskImageUrl = processedTaskImageUrl;
    if (processedResultImageUrl !== undefined) dataToUpdate.resultImageUrl = processedResultImageUrl;
    if (resultComment !== undefined) dataToUpdate.resultComment = resultComment;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: dataToUpdate,
      include: {
        creator: { select: { id: true, name: true, role: true } },
        assignee: { select: { id: true, name: true, role: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    if (req.io) {
      req.io.emit('task_updated', updatedTask);
    }

    res.json({ success: true, data: updatedTask, message: "Vazifa yangilandi." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// DELETE /api/tasks/:id - Vazifani o'chirish (Owner va Director)
router.delete('/:id', authenticate, authorize('owner', 'director'), async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    
    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Vazifa topilmadi.' });
    }
    
    if (existingTask.companyId !== req.user.companyId) {
      return res.status(403).json({ success: false, message: 'Ruxsat yo`q.' });
    }

    await prisma.task.delete({ where: { id: taskId } });

    if (req.io) {
      req.io.emit('task_deleted', { id: taskId });
    }

    res.json({ success: true, message: 'Vazifa o`chirildi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
