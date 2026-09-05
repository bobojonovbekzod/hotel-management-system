const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Fqat owner, director, supervisor uchun
const canManagePayroll = (role) => ['owner', 'director', 'supervisor'].includes(role);

// GET /api/payroll - Filial bo'yicha barcha xodimlarning maosh hisobotini olish
router.get('/', authenticate, authorize('owner', 'director'), async (req, res) => {
  try {
    const { branchId, month } = req.query; // month formati: 'YYYY-MM'
    
    let targetBranchId = branchId ? parseInt(branchId) : null;
    if (req.user.role === 'director') targetBranchId = req.user.branchId;

    const whereUser = { 
      companyId: req.user.companyId, 
      role: { not: 'owner' }
    };

    const allUsers = await prisma.user.findMany({
      where: whereUser,
      include: { branch: { select: { id: true, name: true, adminKpiTiers: true } } }
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

    const userIds = allUsers.map(u => u.id);

    const targetMonthStr = month ? month : `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;

    // Fetch month-specific salary history records for targetMonth
    const salaryHistories = await prisma.userSalaryHistory.findMany({
      where: {
        userId: { in: userIds },
        month: targetMonthStr
      }
    });

    const monthSalaryMap = {};
    salaryHistories.forEach(sh => {
      monthSalaryMap[sh.userId] = { salary: sh.salary, salaryType: sh.salaryType };
    });

    // 1. Smenalarni (shifts) guruhlab tortish
    const shiftsStats = await prisma.shift.groupBy({
      by: ['adminId', 'shiftType'],
      where: {
        adminId: { in: userIds },
        branchId: targetBranchId ? targetBranchId : undefined,
        status: 'closed',
        createdAt: { gte: startDate, lte: endDate }
      },
      _count: { id: true },
      _sum: { totalIncome: true }
    });

    const branchIncomeStats = await prisma.shift.groupBy({
      by: ['branchId'],
      where: {
        branchId: targetBranchId ? targetBranchId : undefined,
        status: 'closed',
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { totalIncome: true }
    });

    const branchIncomeMap = {};
    for (const b of branchIncomeStats) {
      branchIncomeMap[b.branchId] = b._sum.totalIncome || 0;
    }

    // 2. Davomatlarni tortish (bir kunda bir necha yozuv bo'lsa ham faqat 1 kun deb hisoblash)
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: { in: userIds },
        branchId: targetBranchId ? targetBranchId : undefined,
        workDate: { gte: startDate, lte: endDate }
      },
      select: { userId: true, workDate: true }
    });

    const attMap = {};
    const userAttendanceDays = {};
    for (const a of attendanceRecords) {
      if (!userAttendanceDays[a.userId]) userAttendanceDays[a.userId] = new Set();
      const dayKey = new Date(a.workDate).toISOString().slice(0, 10);
      userAttendanceDays[a.userId].add(dayKey);
    }
    for (const uid of Object.keys(userAttendanceDays)) {
      attMap[uid] = userAttendanceDays[uid].size;
    }

    // 3. Tozalangan xonalar sonini tortish (Farroshlar uchun ishbay)
    const cleaningStats = await prisma.cleaningTask.groupBy({
      by: ['cleanerId'],
      where: {
        cleanerId: { in: userIds },
        branchId: targetBranchId ? targetBranchId : undefined,
        createdAt: { gte: startDate, lte: endDate },
        status: 'completed'
      },
      _count: { id: true }
    });

    // 4. Tranzaksiyalarni (avans, jarimalar) guruhlab tortish
    const transactionStats = await prisma.payrollTransaction.groupBy({
      by: ['userId', 'type'],
      where: {
        userId: { in: userIds },
        branchId: targetBranchId ? targetBranchId : undefined,
        date: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    });

    // Olingan ma'lumotlarni JavaScript yordamida tezkor obyektlarga (Map) joylash
    const shiftMap = {};
    for (const s of shiftsStats) {
      if (!shiftMap[s.adminId]) shiftMap[s.adminId] = { morning: 0, night: 0, daily: 0, totalIncome: 0 };
      if (s.shiftType === 'morning') shiftMap[s.adminId].morning += s._count.id;
      if (s.shiftType === 'night') shiftMap[s.adminId].night += s._count.id;
      if (s.shiftType === 'daily') shiftMap[s.adminId].daily += s._count.id;
      shiftMap[s.adminId].totalIncome += (s._sum.totalIncome || 0);
    }

    const cleaningMap = {};
    for (const c of cleaningStats) {
      cleaningMap[c.cleanerId] = c._count.id;
    }

    const txMap = {};
    for (const t of transactionStats) {
      if (!txMap[t.userId]) txMap[t.userId] = { advance: 0, penalty: 0, bonus: 0, salary_payment: 0 };
      if (t.type === 'advance') txMap[t.userId].advance += (t._sum.amount || 0);
      if (t.type === 'penalty') txMap[t.userId].penalty += (t._sum.amount || 0);
      if (t.type === 'bonus') txMap[t.userId].bonus += (t._sum.amount || 0);
      if (t.type === 'salary_payment') txMap[t.userId].salary_payment += (t._sum.amount || 0);
    }

    const allTransactions = await prisma.payrollTransaction.findMany({
      where: {
        userId: { in: userIds },
        branchId: targetBranchId ? targetBranchId : undefined,
        date: { gte: startDate, lte: endDate }
      },
      select: { userId: true, type: true, date: true },
      orderBy: { date: 'asc' }
    });

    const txDatesMap = {};
    for (const t of allTransactions) {
      if (!txDatesMap[t.userId]) txDatesMap[t.userId] = { advanceDates: [], salaryPaymentDates: [] };
      const formattedDate = new Date(t.date).toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        timeZone: 'Asia/Tashkent'
      });
      if (t.type === 'advance' && !txDatesMap[t.userId].advanceDates.includes(formattedDate)) {
        txDatesMap[t.userId].advanceDates.push(formattedDate);
      }
      if (t.type === 'salary_payment' && !txDatesMap[t.userId].salaryPaymentDates.includes(formattedDate)) {
        txDatesMap[t.userId].salaryPaymentDates.push(formattedDate);
      }
    }

    for (const user of allUsers) {
      const dayShifts = shiftMap[user.id]?.morning || 0;
      const nightShifts = shiftMap[user.id]?.night || 0;
      const dailyShifts = shiftMap[user.id]?.daily || 0;
      const totalShiftIncome = shiftMap[user.id]?.totalIncome || 0;
      const attendances = attMap[user.id] || 0;

      let shiftEarnings = 0;
      let kpiEarnings = 0;

      const effectiveSalary = monthSalaryMap[user.id]?.salary !== undefined ? monthSalaryMap[user.id].salary : (user.salary || 0);
      const effectiveSalaryType = monthSalaryMap[user.id]?.salaryType || user.salaryType;

      if (effectiveSalaryType === 'per_shift') {
        if (['admin', 'owner', 'supervisor', 'director'].includes(user.role)) {
          shiftEarnings = (dayShifts + nightShifts + dailyShifts) * effectiveSalary;
        } else {
          shiftEarnings = attendances * effectiveSalary;
        }
      } else if (effectiveSalaryType === 'per_room') {
        const cleanedRoomsCount = cleaningMap[user.id] || 0;
        shiftEarnings = cleanedRoomsCount * effectiveSalary;
      }

      let effectiveKpiPercentage = user.kpiPercentage || 0;
      let appliedKpiThreshold = null;
      let branchTotalIncomeForKpi = 0;
      let appliedFixedSalary = null;

      if (user.role === 'admin' && user.branch && user.branch.adminKpiTiers) {
        let tiers = [];
        try {
          tiers = typeof user.branch.adminKpiTiers === 'string' ? JSON.parse(user.branch.adminKpiTiers) : user.branch.adminKpiTiers;
        } catch (e) {}
        
        if (Array.isArray(tiers) && tiers.length > 0) {
          const branchTotal = branchIncomeMap[user.branchId] || 0;
          branchTotalIncomeForKpi = branchTotal;
          tiers.sort((a, b) => b.threshold - a.threshold);
          
          let tierMet = false;
          for (const tier of tiers) {
            if (branchTotal >= tier.threshold) {
              effectiveKpiPercentage = tier.percentage !== undefined && tier.percentage !== '' ? Number(tier.percentage) : 0;
              appliedKpiThreshold = tier.threshold;
              appliedFixedSalary = tier.fixedSalary !== undefined && tier.fixedSalary !== '' ? Number(tier.fixedSalary) : null;
              tierMet = true;
              break;
            }
          }
          if (!tierMet) {
            effectiveKpiPercentage = 0;
          }
        }
      }

      if (effectiveKpiPercentage > 0) {
        kpiEarnings = totalShiftIncome * (effectiveKpiPercentage / 100);
      }

      const baseSalary = appliedFixedSalary !== null ? appliedFixedSalary : (effectiveSalaryType === 'static' ? effectiveSalary : shiftEarnings);

      const userTx = txMap[user.id] || { advance: 0, penalty: 0, bonus: 0, salary_payment: 0 };
      const totalAdvances = userTx.advance;
      const totalPenalties = userTx.penalty;
      const totalBonuses = userTx.bonus;
      const totalPaid = userTx.salary_payment;

      const totalPayable = baseSalary + kpiEarnings + totalBonuses - totalAdvances - totalPenalties - totalPaid;

      const hasWorkInBranch = dayShifts > 0 || nightShifts > 0 || attendances > 0 || (cleaningMap[user.id] || 0) > 0 || (totalAdvances+totalPenalties+totalBonuses+totalPaid) > 0;

      // Agar xodim tanlangan oydan keyin ro'yxatdan o'tgan (ishga kirgan) bo'lsa va bu oyda hech qanday faoliyati bo'lmasa, hisobotda ko'rsatmaslik
      if (user.createdAt && new Date(user.createdAt) > endDate && !hasWorkInBranch) {
        continue;
      }

      // Agar xodim nofaol (ishdan bo'shatilgan) bo'lsa va ushbu tanlangan oyda hech qanday faoliyati bo'lmasa, hisobotda ko'rsatmaslik
      if (!user.isActive && !hasWorkInBranch) {
        continue;
      }

      if (targetBranchId && user.branchId !== targetBranchId && !hasWorkInBranch) {
        continue;
      }

      report.push({
        user: { 
          id: user.id, 
          name: user.name, 
          role: user.role, 
          branchName: user.branch?.name, 
          salaryType: user.salaryType, 
          salary: user.salary, 
          kpiPercentage: effectiveKpiPercentage,
          originalKpiPercentage: user.kpiPercentage,
          appliedKpiThreshold,
          branchTotalIncomeForKpi,
          appliedFixedSalary
        },
        stats: {
          dayShifts,
          nightShifts,
          dailyShifts,
          attendances,
          totalShiftIncome,
          shiftEarnings,
          kpiEarnings,
          baseSalary,
          totalAdvances,
          totalPenalties,
          totalBonuses,
          totalPaid,
          totalPayable,
          advanceDates: txDatesMap[user.id]?.advanceDates || [],
          salaryPaymentDates: txDatesMap[user.id]?.salaryPaymentDates || []
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

    const { userId, type, amount, description, month, date } = req.body; // type: 'advance', 'penalty', 'bonus', 'salary_payment'

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user || user.companyId !== req.user.companyId) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi.' });
    }

    // DIRECTOR PERMISSION CHECK
    if (req.user.role === 'director') {
      if (['owner', 'director'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Siz faqat o\'zingizga biriktirilgan xodimlarga moliyaviy operatsiya bajara olasiz.' });
      }
      if (user.branchId !== req.user.branchId) {
        return res.status(403).json({ success: false, message: 'Siz faqat o\'z filialingizdagi xodimlarga operatsiya bajara olasiz.' });
      }
    }

    let effectiveDate = new Date();
    if (date) {
      effectiveDate = new Date(date);
    } else if (month && typeof month === 'string' && month.includes('-')) {
      const [y, m] = month.split('-').map(Number);
      effectiveDate = new Date(y, m - 1, 28, 12, 0, 0);
    }

    const tx = await prisma.payrollTransaction.create({
      data: {
        companyId: user.companyId,
        branchId: user.branchId || req.user.branchId || 1, // fallback
        userId: user.id,
        adminId: req.user.id,
        type,
        amount: parseFloat(amount),
        description,
        date: effectiveDate
      }
    });

    // Agar bu oylik to'lovi (salary_payment) yoki avans bo'lsa, xarajat (Expense) sifatida ham yozib qo'yamiz
    if (type === 'salary_payment' || type === 'advance') {
      let category = await prisma.expenseCategory.findFirst({
        where: { companyId: user.companyId, name: 'Xodimlar maoshi' }
      });
      
      if (!category) {
        category = await prisma.expenseCategory.create({
          data: {
            companyId: user.companyId,
            name: 'Xodimlar maoshi'
          }
        });
      }

      await prisma.expense.create({
        data: {
          companyId: user.companyId,
          branchId: user.branchId || req.user.branchId || 1,
          adminId: req.user.id,
          categoryId: category.id,
          amount: parseFloat(amount),
          description: `${type === 'advance' ? 'Avans' : 'Oylik to\'lovi'} - ${user.name} ${description ? `(${description})` : ''}`,
          expenseDate: effectiveDate
        }
      });
    }


    res.json({ success: true, data: tx, message: 'Operatsiya muvaffaqiyatli saqlandi' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// Tranzaksiyani o'chirish
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!canManagePayroll(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Faqat rahbarlar moliyaviy operatsiya qila oladi.' });
    }

    const txId = parseInt(req.params.id);
    const tx = await prisma.payrollTransaction.findUnique({
      where: { id: txId },
      include: { user: true }
    });

    if (!tx || tx.companyId !== req.user.companyId) {
      return res.status(404).json({ success: false, message: 'Tranzaksiya topilmadi' });
    }

    // Tranzaksiya o'chirilayotganda, agar u xarajat bo'lsa, xarajatlardan ham o'chiramiz
    if (tx.type === 'salary_payment' || tx.type === 'advance') {
      const descPrefix = `${tx.type === 'advance' ? 'Avans' : 'Oylik to\'lovi'} - ${tx.user.name}`;
      
      const relatedExpense = await prisma.expense.findFirst({
        where: {
          companyId: tx.companyId,
          amount: tx.amount,
          description: { startsWith: descPrefix },
          createdAt: {
            gte: new Date(tx.date.getTime() - 60000), // 1 daqiqa farq bilan qidirish
            lte: new Date(tx.date.getTime() + 60000)
          }
        }
      });

      if (relatedExpense) {
        await prisma.expense.delete({ where: { id: relatedExpense.id } });
      }
    }

    await prisma.payrollTransaction.delete({ where: { id: txId } });

    res.json({ success: true, message: 'Amaliyot muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
