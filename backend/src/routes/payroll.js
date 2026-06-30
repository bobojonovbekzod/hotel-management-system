const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Fqat owner, director, supervisor uchun
const canManagePayroll = (role) => ['owner', 'director', 'supervisor'].includes(role);

// GET /api/payroll - Filial bo'yicha barcha xodimlarning maosh hisobotini olish
router.get('/', authenticate, authorize('owner', 'director', 'supervisor'), async (req, res) => {
  try {
    const { branchId, month } = req.query; // month formati: 'YYYY-MM'
    
    let targetBranchId = branchId ? parseInt(branchId) : null;
    if (req.user.role === 'director') targetBranchId = req.user.branchId;

    const whereUser = { companyId: req.user.companyId, isActive: true };
    if (targetBranchId) whereUser.branchId = targetBranchId;

    const users = await prisma.user.findMany({
      where: whereUser,
      include: { branch: { select: { name: true } } }
    });

    let startDate, endDate;
    if (month) {
      const [year, m] = month.split('-');
      startDate = new Date(year, parseInt(m) - 1, 1);
      endDate = new Date(year, parseInt(m), 0, 23, 59, 59, 999);
    } else {
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);
    }

    const report = [];

    for (const user of users) {
      // Smenalarni topish (oy oralig'ida)
      const shifts = await prisma.shift.findMany({
        where: {
          adminId: user.id,
          status: 'closed',
          createdAt: { gte: startDate, lte: endDate }
        }
      });

      const dayShifts = shifts.filter(s => s.shiftType === 'morning').length;
      const nightShifts = shifts.filter(s => s.shiftType === 'night').length;
      const totalShiftIncome = shifts.reduce((sum, s) => sum + (s.totalIncome || 0), 0);

      // Davomatlarni topish (cleanerlar uchun)
      const attendances = await prisma.attendance.count({
        where: {
          userId: user.id,
          checkIn: { not: null },
          workDate: { gte: startDate, lte: endDate }
        }
      });

      let shiftEarnings = 0;
      let kpiEarnings = 0;

      if (user.salaryType === 'per_shift') {
        if (['admin', 'owner', 'supervisor', 'director'].includes(user.role)) {
          shiftEarnings = (dayShifts + nightShifts) * (user.salary || 0);
        } else {
          shiftEarnings = attendances * (user.salary || 0);
        }
      }

      if (user.kpiPercentage && user.kpiPercentage > 0) {
        kpiEarnings = totalShiftIncome * (user.kpiPercentage / 100);
      }

      const baseSalary = user.salaryType === 'static' ? (user.salary || 0) : shiftEarnings;

      // Tranzaksiyalar
      const transactions = await prisma.payrollTransaction.findMany({
        where: {
          userId: user.id,
          date: { gte: startDate, lte: endDate }
        }
      });

      let totalAdvances = 0;
      let totalPenalties = 0;
      let totalBonuses = 0;
      let totalPaid = 0;

      transactions.forEach(t => {
        if (t.type === 'advance') totalAdvances += t.amount;
        if (t.type === 'penalty') totalPenalties += t.amount;
        if (t.type === 'bonus') totalBonuses += t.amount;
        if (t.type === 'salary_payment') totalPaid += t.amount;
      });

      const totalPayable = baseSalary + kpiEarnings + totalBonuses - totalAdvances - totalPenalties - totalPaid;

      report.push({
        user: { id: user.id, name: user.name, role: user.role, branchName: user.branch?.name, salaryType: user.salaryType, salary: user.salary, kpiPercentage: user.kpiPercentage },
        stats: {
          dayShifts,
          nightShifts,
          attendances,
          totalShiftIncome,
          shiftEarnings,
          kpiEarnings,
          baseSalary,
          totalAdvances,
          totalPenalties,
          totalBonuses,
          totalPaid,
          totalPayable
        }
      });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// Xodimning joriy oylik holatini va tarixini olish
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || user.companyId !== req.user.companyId) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi.' });
    }

    // Tarix
    const transactions = await prisma.payrollTransaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        admin: { select: { name: true, role: true } }
      }
    });

    // Hisob kitob qilish uchun joriy oyni boshlanishini olamiz
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Xodimning ishlagan smenalari (agar per_shift bo'lsa)
    let shiftEarnings = 0;
    if (user.salaryType === 'per_shift') {
      if (user.role === 'admin' || user.role === 'owner' || user.role === 'supervisor') {
        const shiftsThisMonth = await prisma.shift.count({
          where: {
            adminId: userId,
            createdAt: { gte: startOfMonth },
            status: 'closed'
          }
        });
        shiftEarnings = shiftsThisMonth * user.salary;
      } else {
        const attendanceThisMonth = await prisma.attendance.count({
          where: {
            userId: userId,
            workDate: { gte: startOfMonth },
            checkIn: { not: null }
          }
        });
        shiftEarnings = attendanceThisMonth * user.salary;
      }
    }

    // Yozilgan bonus va jarimalarni hisoblash
    const currentMonthTx = transactions.filter(t => new Date(t.date) >= startOfMonth);
    
    let totalAdvances = 0;
    let totalPenalties = 0;
    let totalBonuses = 0;
    let totalPaid = 0; // shu oyda qancha salary_payment berildi

    currentMonthTx.forEach(t => {
      if (t.type === 'advance') totalAdvances += t.amount;
      if (t.type === 'penalty') totalPenalties += t.amount;
      if (t.type === 'bonus') totalBonuses += t.amount;
      if (t.type === 'salary_payment') totalPaid += t.amount;
    });

    const baseSalary = user.salaryType === 'static' ? user.salary : shiftEarnings;
    const currentBalance = baseSalary + totalBonuses - totalAdvances - totalPenalties - totalPaid;

    res.json({
      success: true,
      data: {
        user: { name: user.name, role: user.role, salaryType: user.salaryType, salary: user.salary },
        stats: {
          baseSalary,
          totalAdvances,
          totalPenalties,
          totalBonuses,
          totalPaid,
          currentBalance
        },
        transactions
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// Xodimga jarima, bonus, avans yozish
router.post('/', authenticate, async (req, res) => {
  try {
    if (!canManagePayroll(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Faqat rahbarlar moliyaviy operatsiya qila oladi.' });
    }

    const { userId, type, amount, description } = req.body; // type: 'advance', 'penalty', 'bonus', 'salary_payment'

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user || user.companyId !== req.user.companyId) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi.' });
    }

    const tx = await prisma.payrollTransaction.create({
      data: {
        companyId: user.companyId,
        branchId: user.branchId || req.user.branchId || 1, // fallback
        userId: user.id,
        adminId: req.user.id,
        type,
        amount: parseFloat(amount),
        description
      }
    });

    // Agar bu oylik to'lovi (salary_payment) bo'lsa, xarajat (Expense) sifatida ham yozib qo'yamiz
    if (type === 'salary_payment' || type === 'advance') {
      await prisma.expense.create({
        data: {
          companyId: user.companyId,
          branchId: user.branchId || req.user.branchId || 1,
          adminId: req.user.id,
          category: 'salary',
          amount: parseFloat(amount),
          description: `${type === 'advance' ? 'Avans' : 'Oylik to\'lovi'} - ${user.name} (${description || ''})`
        }
      });
    }

    res.json({ success: true, data: tx, message: 'Operatsiya muvaffaqiyatli saqlandi' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
