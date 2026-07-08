const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/dashboard/summary - Umumiy ma'lumotlar
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { branchId, month, year, start, end } = req.query;
    
    let startDate, endDate;
    if (start && end) {
      startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
      const targetYear = year ? parseInt(year) : now.getFullYear();

      startDate = new Date(targetYear, targetMonth - 1, 1);
      endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    }

    const branchFilter = { companyId: req.user.companyId };
    if (req.user.role === 'admin' || req.user.role === 'director') {
      branchFilter.branchId = req.user.branchId;
    } else if (branchId) {
      branchFilter.branchId = parseInt(branchId);
    }

    // Oylik tushum
    const monthlyBookings = await prisma.booking.findMany({
      where: {
        ...branchFilter,
        status: { in: ['active', 'checked_out'] },
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const totalIncome = monthlyBookings.reduce((sum, b) => sum + b.paidAmount, 0);

    // Oylik xarajatlar
    const monthlyExpenses = await prisma.expense.aggregate({
      where: {
        ...branchFilter,
        expenseDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const totalExpenses = monthlyExpenses._sum.amount || 0;

    // Joriy band xonalar
    const occupiedRooms = await prisma.room.count({
      where: { ...branchFilter, status: 'occupied' },
    });

    const totalRooms = await prisma.room.count({ where: branchFilter });

    // Bugungi bronlar
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayBookings = await prisma.booking.count({
      where: {
        ...branchFilter,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });

    const todayCheckouts = await prisma.booking.count({
      where: {
        ...branchFilter,
        checkOutActual: { gte: todayStart, lte: todayEnd },
      },
    });

    // Oylik smenalar hisoboti (faqat admin uchun)
    const monthlyShifts = await prisma.shift.findMany({
      where: {
        ...branchFilter,
        createdAt: { gte: startDate, lte: endDate },
        status: 'closed',
      },
      include: {
        admin: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Xonalar bandlik foizi bo'yicha
    const roomOccupancyByType = await prisma.room.groupBy({
      by: ['roomType', 'status'],
      where: branchFilter,
      _count: true,
    });

    // Oylik kunlik tushum (grafik uchun)
    const dailyIncome = await prisma.booking.groupBy({
      by: ['checkIn'],
      where: {
        ...branchFilter,
        checkIn: { gte: startDate, lte: endDate },
      },
      _sum: { paidAmount: true },
    });

    // To'lov turlari bo'yicha tushum
    const paymentMethods = await prisma.booking.groupBy({
      by: ['paymentMethod'],
      where: {
        ...branchFilter,
        status: { in: ['active', 'checked_out'] },
        createdAt: { gte: startDate, lte: endDate },
        paymentMethod: { not: null }
      },
      _sum: { paidAmount: true },
    });

    // Xarajatlar toifasi bo'yicha
    const expensesByCategoryRaw = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        ...branchFilter,
        expenseDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const expenseCategoryIds = expensesByCategoryRaw.map(e => e.categoryId);
    const expenseCategories = await prisma.expenseCategory.findMany({
      where: { id: { in: expenseCategoryIds } }
    });

    const expensesByCategory = expensesByCategoryRaw.map(e => ({
      category: expenseCategories.find(c => c.id === e.categoryId)?.name || 'Boshqa',
      _sum: e._sum
    }));

    // Top 5 Adminlar
    let topAdmins = [];
    let shiftReports = [];
    if (['owner', 'supervisor', 'director'].includes(req.user.role)) {
      const adminIncome = await prisma.shift.groupBy({
        by: ['adminId'],
        where: {
          ...branchFilter,
          createdAt: { gte: startDate, lte: endDate },
          status: 'closed'
        },
        _sum: { totalIncome: true },
        _count: { id: true },
        orderBy: { _sum: { totalIncome: 'desc' } },
        take: 5,
      });

      const adminIds = adminIncome.map(a => a.adminId);
      const admins = await prisma.user.findMany({
        where: { id: { in: adminIds } },
        include: { branch: { select: { name: true } } }
      });

      topAdmins = adminIncome.map(a => {
        const user = admins.find(u => u.id === a.adminId);
        return {
          admin: user,
          totalIncome: a._sum.totalIncome || 0,
          shiftCount: a._count.id,
        };
      });

      // Smenalar kassa hisoboti
      const shiftReportsRaw = await prisma.shift.findMany({
        where: {
          ...branchFilter,
          status: { in: ['closed', 'active'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          admin: { select: { name: true } },
          branch: { select: { name: true } },
          bookings: {
            where: { paymentMethod: { in: ['terminal', 'qrcode'] } },
            select: { paidAmount: true, paymentMethod: true }
          },
          expenses: {
            select: { amount: true }
          }
        },
        orderBy: { startTime: 'desc' }
      });

      shiftReports = shiftReportsRaw.map(shift => {
        const terminal = shift.bookings.filter(b => b.paymentMethod === 'terminal').reduce((sum, b) => sum + b.paidAmount, 0);
        const qrcode = shift.bookings.filter(b => b.paymentMethod === 'qrcode').reduce((sum, b) => sum + b.paidAmount, 0);
        const chiqim = shift.expenses.reduce((sum, e) => sum + e.amount, 0);
        const qoldiq = shift.totalIncome - terminal - qrcode - chiqim;

        return {
          id: shift.id,
          date: shift.startTime,
          status: shift.status,
          shiftType: shift.shiftType,
          adminName: shift.admin.name,
          branchName: shift.branch.name,
          totalIncome: shift.totalIncome,
          terminal,
          qrcode,
          chiqim,
          qoldiq
        };
      });
    }

    // To'lov turlari bo'yicha aniq hisobot (Payment table orqali)
    const paymentMethodStats = await prisma.payment.groupBy({
      by: ['method'],
      where: {
        booking: { companyId: req.user.companyId, ...(branchId ? { branchId: parseInt(branchId) } : {}) },
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    });
    
    const paymentStats = [
      { name: 'Naqd', value: paymentMethodStats.find(p => p.method === 'cash')?._sum.amount || 0 },
      { name: 'Terminal', value: paymentMethodStats.find(p => p.method === 'terminal')?._sum.amount || 0 },
      { name: 'QrCode', value: paymentMethodStats.find(p => p.method === 'qrcode')?._sum.amount || 0 },
    ];

    // Barcha filiallar statistikasi (owner, supervisor, director uchun)
    let branchStats = null;
    if (['owner', 'supervisor', 'director'].includes(req.user.role)) {
      const branchQuery = (req.user.role === 'director') 
        ? { id: req.user.branchId } 
        : { isActive: true, companyId: req.user.companyId };
      const branches = await prisma.branch.findMany({ where: branchQuery });
      branchStats = await Promise.all(
        branches.map(async (branch) => {
          const payments = await prisma.payment.findMany({
            where: {
              booking: { branchId: branch.id },
              createdAt: { gte: startDate, lte: endDate }
            }
          });

          const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
          const terminal = payments.filter(p => p.method === 'terminal').reduce((sum, p) => sum + p.amount, 0);
          const qrcode = payments.filter(p => p.method === 'qrcode').reduce((sum, p) => sum + p.amount, 0);
          const cash = payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
          const additionalServices = payments.filter(p => p.type !== 'room' && p.type !== 'advance').reduce((sum, p) => sum + p.amount, 0);

          const expenses = await prisma.expense.aggregate({
            where: { branchId: branch.id, expenseDate: { gte: startDate, lte: endDate } },
            _sum: { amount: true }
          });
          const totalExpenses = expenses._sum.amount || 0;
          const balance = cash - totalExpenses;

          const occupied = await prisma.room.count({ where: { branchId: branch.id, status: 'occupied' } });
          const total = await prisma.room.count({ where: { branchId: branch.id } });

          return {
            branch,
            totalIncome,
            terminal,
            qrcode,
            cash,
            additionalServices,
            totalExpenses,
            balance,
            occupiedRooms: occupied,
            totalRooms: total,
          };
        })
      );
    }

    // Xonalar bandligi dinamikasi (kunlik, joriy oy yoki oraliq uchun)
    const occupancyStats = [];
    const endDay = (endDate < new Date()) ? endDate.getDate() : Math.min(new Date().getDate(), endDate.getDate());
    
    // Oydagi barcha bronlarni olish
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        ...branchFilter,
        status: { in: ['active', 'checked_out'] },
        checkIn: { lte: endDate },
        OR: [
          { checkOutActual: { gte: startDate } },
          { checkOutExpected: { gte: startDate }, status: 'active' }
        ]
      },
      select: { checkIn: true, checkOutActual: true, checkOutExpected: true, status: true }
    });

    for (let day = 1; day <= endDay; day++) {
      const currentDay = new Date(startDate.getFullYear(), startDate.getMonth(), day);
      currentDay.setHours(12, 0, 0, 0);

      let occupiedCount = 0;
      for (const b of overlappingBookings) {
        const checkIn = new Date(b.checkIn);
        const checkOut = b.status === 'checked_out' && b.checkOutActual ? new Date(b.checkOutActual) : new Date(b.checkOutExpected);
        
        const checkInDay = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
        const checkOutDay = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());

        if (currentDay >= checkInDay && currentDay <= checkOutDay) {
          occupiedCount++;
        }
      }

      occupancyStats.push({
        date: currentDay.getDate().toString().padStart(2, '0') + '-' + (currentDay.getMonth() + 1).toString().padStart(2, '0'),
        band: occupiedCount
      });
    }

    const terminalTotal = paymentStats[1].value;
    const qrcodeTotal = paymentStats[2].value;
    const cashTotal = paymentStats[0].value;
    const cashBalance = cashTotal - totalExpenses;

    res.json({
      success: true,
      data: {
        overview: {
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          cashBalance,
          occupiedRooms,
          totalRooms,
          occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0,
          todayBookings,
          todayCheckouts,
        },
        monthlyShifts,
        roomOccupancyByType,
        dailyIncome,
        paymentMethods,
        expensesByCategory,
        topAdmins,
        shiftReports,
        branchStats,
        paymentStats,
        occupancyStats
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// GET /api/dashboard/admin - Admin shaxsiy statistikasi (faqat admin uchun)
router.get('/admin', authenticate, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const shifts = await prisma.shift.count({
      where: {
        adminId: req.user.id,
        createdAt: { gte: startDate, lte: endDate }
      }
    });

    const penalties = await prisma.payrollTransaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'penalty',
        date: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    });

    const bonuses = await prisma.payrollTransaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'bonus',
        date: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    });

    const advances = await prisma.payrollTransaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'advance',
        date: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    });

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { salary: true, salaryType: true }
    });

    let calculatedSalary = 0;
    if (adminUser.salaryType === 'static') {
      calculatedSalary = adminUser.salary;
    } else if (adminUser.salaryType === 'per_shift') {
      calculatedSalary = adminUser.salary * shifts;
    }

    const netSalary = calculatedSalary + (bonuses._sum.amount || 0) - (penalties._sum.amount || 0) - (advances._sum.amount || 0);

    res.json({
      success: true,
      data: {
        shifts,
        penalties: penalties._sum.amount || 0,
        bonuses: bonuses._sum.amount || 0,
        advances: advances._sum.amount || 0,
        baseSalary: calculatedSalary,
        netSalary
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
