const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const branchRoutes = require('./routes/branches');
const roomRoutes = require('./routes/rooms');
const bookingRoutes = require('./routes/bookings');
const dashboardRoutes = require('./routes/dashboard');
const devicesRoutes = require('./routes/devices');
const guestRoutes = require('./routes/guests');
const shiftRoutes = require('./routes/shifts');
const expenseRoutes = require('./routes/expenses');
const expenseCategoriesRoutes = require('./routes/expenseCategories');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const companiesRoutes = require('./routes/companies');
const payrollRoutes = require('./routes/payroll');
const profileRoutes = require('./routes/profile');
const { setupBot } = require('./bot/telegramBot');
const { setupJobBot } = require('./bot/jobBot');
const initAutoCheckout = require('./cron/autoCheckout');
const cleanOldImages = require('./cron/cleanImages');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Agentlar uchun alohida namespace
const agentNamespace = io.of('/agent');
const connectedAgents = new Map(); // branchId -> socketId

agentNamespace.on('connection', (socket) => {
  const { branchId, token } = socket.handshake.auth;
  
  // Oddiy xavfsizlik tekshiruvi (haqiqiy loyihada bazadan tekshiriladi)
  if (token !== process.env.AGENT_TOKEN && token !== 'hotelbase_maxfiy_agent_123') {
    console.log(`[Agent] Noto'g'ri token bilan ulanishga urinish: ${socket.id}`);
    return socket.disconnect();
  }

  if (branchId) {
    connectedAgents.set(branchId.toString(), socket.id);
    console.log(`[Agent] Ulandi: Filial ${branchId} (Socket: ${socket.id})`);
  }

  socket.on('disconnect', () => {
    if (branchId) {
      connectedAgents.delete(branchId.toString());
      console.log(`[Agent] Uzildi: Filial ${branchId}`);
    }
  });
});

// Start Telegram Bots
setupBot();
setupJobBot();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Socket.io ni req ga ulash
app.use((req, res, next) => {
  req.io = io;
  req.agentNamespace = agentNamespace;
  req.connectedAgents = connectedAgents;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/shifts', shiftRoutes);

app.use('/api/room-categories', require('./routes/roomCategory'));
app.use('/api/expenses', expenseRoutes);
app.use('/api/expense-categories', expenseCategoriesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/cleaning-tasks', require('./routes/cleaningTasks'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/inventory/requests', require('./routes/inventory-requests'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/investor', require('./routes/investor'));
app.use('/api/guest', require('./routes/guestPortal'));
app.use('/api/guest-requests', require('./routes/guestPortal'));
app.use('/api/instagram', require('./routes/instagramWebhook'));
app.use('/api/receipts', require('./routes/receipts'));

const RECORDINGS_CACHE_DIR = path.join(__dirname, '../recordings_cache');
if (!fs.existsSync(RECORDINGS_CACHE_DIR)) {
  try { fs.mkdirSync(RECORDINGS_CACHE_DIR, { recursive: true }); } catch (e) {}
}

// Dynamic Audio Streamer from Asterisk PBX Server with Disk Caching
app.get('/api/recordings/fetch', async (req, res) => {
  try {
    const { filename, phone } = req.query;
    const safeFilename = filename ? path.basename(filename) : '';
    const cleanPhone = (phone || '').replace(/\D/g, '');

    // 1. Check local cache first (instant response in 1-2ms)
    if (safeFilename) {
      const cachedPath = path.join(RECORDINGS_CACHE_DIR, safeFilename);
      if (fs.existsSync(cachedPath)) {
        return res.sendFile(cachedPath);
      }
    }

    const { NodeSSH } = require('node-ssh');
    const ssh = new NodeSSH();
    await ssh.connect({
      host: '89.126.208.59',
      username: 'root',
      password: 'Je%K8$Q42R7H%IH',
      readyTimeout: 20000
    });

    let remoteFile = '';
    if (safeFilename) {
      const baseName = safeFilename.split('.')[0];
      const checkExists = await ssh.execCommand(`find /var/spool/asterisk/monitor/ -type f -name "*${baseName}*" | head -n 1`);
      remoteFile = checkExists.stdout.trim();
    }

    if (!remoteFile && cleanPhone && cleanPhone.length >= 7) {
      const lsRes = await ssh.execCommand(`find /var/spool/asterisk/monitor/ -type f -size +5k -name "*${cleanPhone.slice(-7)}*" | head -n 1`);
      remoteFile = lsRes.stdout.trim();
    }

    // If file exists on PBX disk, download to local cache and stream!
    if (remoteFile) {
      const actualFilename = path.basename(remoteFile);
      const localFilePath = path.join(RECORDINGS_CACHE_DIR, actualFilename);

      if (!fs.existsSync(localFilePath)) {
        await ssh.getFile(localFilePath, remoteFile);
      }
      ssh.dispose();

      return res.sendFile(localFilePath);
    }

    ssh.dispose();
    return res.status(404).json({ success: false, message: 'Audio recording not found' });
  } catch (e) {
    console.error('Audio fetch error:', e.message);
    res.status(404).json({ success: false, error: e.message });
  }
});

// GET /api/recordings/list?phone=... - Returns list of all audio recordings for a phone
app.get('/api/recordings/list', async (req, res) => {
  try {
    const { phone } = req.query;
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      return res.json({ success: true, data: [] });
    }

    const { NodeSSH } = require('node-ssh');
    const ssh = new NodeSSH();
    await ssh.connect({
      host: '89.126.208.59',
      username: 'root',
      password: 'Je%K8$Q42R7H%IH',
      readyTimeout: 15000
    });

    const searchPattern = cleanPhone.slice(-7);
    const lsRes = await ssh.execCommand(`ls -lt /var/spool/asterisk/monitor/*${searchPattern}* 2>/dev/null`);
    ssh.dispose();

    const lines = lsRes.stdout.split('\n').filter(Boolean);
    const recordings = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      const filePath = parts[parts.length - 1];
      const filename = path.basename(filePath);
      return {
        filename,
        path: filePath,
        url: `/api/recordings/fetch?filename=${encodeURIComponent(filename)}`
      };
    });

    res.json({ success: true, data: recordings });
  } catch (e) {
    console.error('List recordings error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/recordings/fetch-latest', (req, res) => {
  res.redirect('/api/recordings/fetch');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Hotel Management API ishlayapti!', timestamp: new Date() });
});

// Global Error Handler (Production himoyasi uchun)
app.use((err, req, res, next) => {
  console.error('[Global Xatolik]:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Ichki server xatosi yuz berdi.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`🔌 Foydalanuvchi ulandi: ${socket.id}`);
  
  socket.on('join-branch', (branchId) => {
    socket.join(`branch-${branchId}`);
    console.log(`👤 Socket branch-${branchId} ga qo'shildi`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Foydalanuvchi uzildi: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🏨 Hotel Management Server ${PORT}-portda ishlamoqda`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.io: tayyor\n`);
  
  // Super Admin ni avtomatik yaratish
  const { PrismaClient } = require('@prisma/client');
  const prismaClient = new PrismaClient();
  const bcrypt = require('bcryptjs');
  
  try {
    const superadminExists = await prismaClient.user.findFirst({ where: { role: 'superadmin' } });
    if (!superadminExists) {
      const hashed = await bcrypt.hash('123456', 10);
      await prismaClient.user.create({
        data: {
          name: 'Super Admin',
          username: 'superadmin',
          password: hashed,
          role: 'superadmin',
        }
      });
      console.log('👑 Boshlang\'ich Super Admin yaratildi (superadmin/123456)');
    }
  } catch (err) {
    console.error('Super Admin tekshirishda xato:', err.message);
  }

  // Cron joblarni ishga tushirish
  initAutoCheckout(io);
  cleanOldImages();
});
