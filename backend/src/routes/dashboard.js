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
      const [startYear, startMonth, startDay] = start.split('-').map(Number);
      const [endYear, endMonth, endDay] = end.split('-').map(Number);
      startDate = new Date(startYear, startMonth - 1, startDay, 8, 0, 0);
      endDate = new Date(endYear, endMonth - 1, endDay + 1, 7, 59, 59, 999);
    } else {
      const now = new Date();
      // Biznes kuni (Sutka) ertalab 08:00 dan boshlanadi.
      // Agar hozirgi vaqt tungi 00:00 dan 07:59 gacha bo'lsa, u kechagi kunga tegishli!
      const businessNow = new Date(now);
      if (businessNow.getHours() < 8) {
        businessNow.setDate(businessNow.getDate() - 1);
      }

      const targetMonth = month ? parseInt(month) : businessNow.getMonth() + 1;
      const targetYear = year ? parseInt(year) : businessNow.getFullYear();

      // Oy boshi: 1-sana soat 08:00
      startDate = new Date(targetYear, targetMonth - 1, 1, 8, 0, 0);
      // Oy oxiri: Keyingi oyning 1-sanasi soat 07:59:59
      endDate = new Date(targetYear, targetMonth, 1, 7, 59, 59, 999);
    }

    const branchFilter = { companyId: req.user.companyId };
    let targetBranchId = null;
    if (req.user.role === 'admin' || req.user.role === 'director') {
      branchFilter.branchId = req.user.branchId;
      targetBranchId = req.user.branchId;
    } else if (branchId) {
      branchFilter.branchId = parseInt(branchId);
      targetBranchId = parseInt(branchId);
    }

    const paymentWhere = {
      booking: {
        companyId: req.user.companyId,
        ...(targetBranchId ? { branchId: targetBranchId } : {})
      },
      createdAt: { gte: startDate, lte: endDate }
    };

    // To'lov turlari bo'yicha aniq hisobot (Payment table orqali)
    const paymentMethodStats = await prisma.payment.groupBy({
      by: ['method'],
      where: paymentWhere,
      _sum: { amount: true }
    });
    
    const cashTotal = paymentMethodStats.find(p => p.method === 'cash')?._sum.amount || 0;
    const terminalTotal = paymentMethodStats.find(p => p.method === 'terminal')?._sum.amount || 0;
    const qrcodeTotal = paymentMethodStats.find(p => p.method === 'qrcode')?._sum.amount || 0;
    const transferTotal = paymentMethodStats.find(p => p.method === 'transfer')?._sum.amount || 0;
    const otherPayments = paymentMethodStats
      .filter(p => !['cash', 'terminal', 'qrcode', 'transfer'].includes(p.method))
      .reduce((sum, p) => sum + (p._sum.amount || 0), 0);

    const totalIncome = cashTotal + terminalTotal + qrcodeTotal + transferTotal + otherPayments;

    const paymentStats = [
      { name: 'Naqd', value: cashTotal },
      { name: 'Terminal', value: terminalTotal },
      { name: 'QrCode', value: qrcodeTotal },
      { name: 'Karta/Karta', value: transferTotal },
    ];

    // Oylik xarajatlar (Smena biznes kunlari chegarasida)
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

    // Bugungi bronlar (Biznes kun: bugun 08:00 dan ertaga 07:59 gacha)
    const nowForToday = new Date();
    const businessToday = new Date(nowForToday);
    if (businessToday.getHours() < 8) {
      businessToday.setDate(businessToday.getDate() - 1);
    }
    
    const todayStart = new Date(businessToday);
    todayStart.setHours(8, 0, 0, 0);
    const todayEnd = new Date(businessToday);
    todayEnd.setDate(todayEnd.getDate() + 1);
    todayEnd.setHours(7, 59, 59, 999);

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
        startTime: { gte: startDate, lte: endDate },
        status: 'closed',
      },
      include: {
        admin: { select: { name: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    // Xonalar bandlik foizi bo'yicha
    const roomOccupancyByType = await prisma.room.groupBy({
      by: ['roomType', 'status'],
      where: branchFilter,
      _count: true,
    });

    // Oylik kunlik tushum (grafik uchun - Payment jadvalidan)
    const dailyPayments = await prisma.payment.findMany({
      where: paymentWhere,
      select: { amount: true, createdAt: true }
    });

    const dailyIncomeMap = {};
    for (const p of dailyPayments) {
      const pDate = new Date(p.createdAt);
      if (pDate.getHours() < 8) {
        pDate.setDate(pDate.getDate() - 1);
      }
      const dateStr = pDate.toISOString().split('T')[0];
      dailyIncomeMap[dateStr] = (dailyIncomeMap[dateStr] || 0) + p.amount;
    }

    const dailyIncome = Object.entries(dailyIncomeMap).map(([checkIn, sum]) => ({
      checkIn: new Date(checkIn),
      _sum: { paidAmount: sum }
    }));

    // To'lov turlari bo'yicha tushum (moslik uchun)
    const paymentMethods = paymentMethodStats.map(p => ({
      paymentMethod: p.method,
      _sum: { paidAmount: p._sum.amount || 0 }
    }));

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
          startTime: { gte: startDate, lte: endDate },
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
          startTime: { gte: startDate, lte: endDate },
        },
        include: {
          admin: { select: { name: true } },
          branch: { select: { name: true } },
          payments: {
            where: { method: { in: ['terminal', 'qrcode', 'transfer'] } },
            select: { amount: true, method: true }
          },
          expenses: {
            select: { amount: true }
          }
        },
        orderBy: { startTime: 'desc' }
      });

      shiftReports = shiftReportsRaw.map(shift => {
        const terminal = shift.payments.filter(p => p.method === 'terminal').reduce((sum, p) => sum + p.amount, 0);
        const qrcode = shift.payments.filter(p => p.method === 'qrcode').reduce((sum, p) => sum + p.amount, 0);
        const transfer = shift.payments.filter(p => p.method === 'transfer').reduce((sum, p) => sum + p.amount, 0);
        const chiqim = shift.expenses.reduce((sum, e) => sum + e.amount, 0);
        const qoldiq = shift.totalIncome - terminal - qrcode - transfer - chiqim;

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
          transfer,
          chiqim,
          qoldiq
        };
      });
    }

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
          const transfer = payments.filter(p => p.method === 'transfer').reduce((sum, p) => sum + p.amount, 0);
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
            transfer,
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

    // Xonalar bandligi dinamikasi (kunlik)
    const occupancyStats = [];
    
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
      select: { roomId: true, checkIn: true, checkOutActual: true, checkOutExpected: true, status: true }
    });

    let loopDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0);
    let finalLoopDate;
    const nowMoment = new Date();

    if (start && end) {
      const [endYear, endMonth, endDay] = end.split('-').map(Number);
      finalLoopDate = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);
    } else {
      const daysInTargetMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
      finalLoopDate = new Date(startDate.getFullYear(), startDate.getMonth(), daysInTargetMonth, 12, 0, 0);
    }

    while (loopDate <= finalLoopDate) {
      const curDayStart = new Date(loopDate.getFullYear(), loopDate.getMonth(), loopDate.getDate(), 0, 0, 0);
      const curDayEnd = new Date(loopDate.getFullYear(), loopDate.getMonth(), loopDate.getDate(), 23, 59, 59, 999);

      let bandVal = null;
      if (curDayStart <= nowMoment) {
        const occupiedRooms = new Set();
        for (const b of overlappingBookings) {
          const checkIn = new Date(b.checkIn);
          const checkOut = b.status === 'checked_out' && b.checkOutActual ? new Date(b.checkOutActual) : new Date(b.checkOutExpected);

          if (checkIn <= curDayEnd && checkOut >= curDayStart) {
            occupiedRooms.add(b.roomId);
          }
        }
        bandVal = occupiedRooms.size;
      }

      occupancyStats.push({
        date: loopDate.getDate().toString().padStart(2, '0') + '-' + (loopDate.getMonth() + 1).toString().padStart(2, '0'),
        band: bandVal
      });

      loopDate.setDate(loopDate.getDate() + 1);
    }

    // Bank (qrcode + terminal) va Transfer xarajatlarini ayiramiz
    const companyBankExpenses = await prisma.expense.aggregate({
      where: {
        ...branchFilter,
        isCompanyExpense: true,
        paymentSource: 'bank',
        expenseDate: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    });
    const bankExpensesSum = companyBankExpenses._sum.amount || 0;
    const bankBalance = (qrcodeTotal + terminalTotal) - bankExpensesSum;

    const companyTransferExpenses = await prisma.expense.aggregate({
      where: {
        ...branchFilter,
        isCompanyExpense: true,
        paymentSource: 'transfer',
        expenseDate: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    });
    const transferExpensesSum = companyTransferExpenses._sum.amount || 0;
    const transferBalance = transferTotal - transferExpensesSum;

    const cashBalance = cashTotal - (totalExpenses - bankExpensesSum - transferExpensesSum);

    res.json({
      success: true,
      data: {
        overview: {
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          cashBalance,
          bankBalance,
          transferBalance,
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
    const businessNow = new Date(now);
    if (businessNow.getHours() < 8) {
      businessNow.setDate(businessNow.getDate() - 1);
    }
    
    const startDate = new Date(businessNow.getFullYear(), businessNow.getMonth(), 1, 8, 0, 0);
    const endDate = new Date(businessNow.getFullYear(), businessNow.getMonth() + 1, 1, 7, 59, 59, 999);

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
