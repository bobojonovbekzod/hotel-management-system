const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
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
const setupBot = require('./bot/telegramBot');
const initAutoCheckout = require('./cron/autoCheckout');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Start Telegram Bot
setupBot();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Socket.io ni req ga ulash
app.use((req, res, next) => {
  req.io = io;
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
app.use('/api/expenses', expenseRoutes);
app.use('/api/expense-categories', expenseCategoriesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Hotel Management API ishlayapti!', timestamp: new Date() });
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
});
