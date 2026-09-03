const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/investor/dashboard - Read-only financial dashboard metrics for investor
router.get('/dashboard', authenticate, authorize('investor', 'owner', 'director', 'superadmin'), async (req, res) => {
  try {
    const { branchId, month } = req.query;

    // Parse investor's allowed branches
    let allowedBranchIds = [];
    if (req.user.role === 'investor') {
      if (req.user.investorBranchIds) {
        try {
          allowedBranchIds = JSON.parse(req.user.investorBranchIds);
        } catch (e) {
          allowedBranchIds = [];
        }
      }
      if (allowedBranchIds.length === 0 && req.user.branchId) {
        allowedBranchIds = [req.user.branchId];
      }
    }

    // Fetch branches for selection
    const allBranches = await prisma.branch.findMany({
      where: {
        companyId: req.user.companyId || 1,
        ...(allowedBranchIds.length > 0 ? { id: { in: allowedBranchIds } } : {})
      },
      select: { id: true, name: true }
    });

    let selectedBranchId = null;
    if (branchId && branchId !== 'all') {
      const parsed = parseInt(branchId);
      if (allowedBranchIds.length === 0 || allowedBranchIds.includes(parsed)) {
        selectedBranchId = parsed;
      }
    }

    const branchWhere = selectedBranchId 
      ? { branchId: selectedBranchId } 
      : (allowedBranchIds.length > 0 ? { branchId: { in: allowedBranchIds } } : {});

    // Target month filter
    const now = new Date();
    const targetMonthStr = month ? month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, mStr] = targetMonthStr.split('-').map(Number);

    const startDate = new Date(year, mStr - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, mStr, 0, 23, 59, 59, 999);

    // 1. Total Revenue (Tushum - Payments in target month)
    const payments = await prisma.payment.findMany({
      where: {
        booking: {
          companyId: req.user.companyId || 1,
          ...branchWhere
        },
        createdAt: { gte: startDate, lte: endDate }
      },
      select: { amount: true, method: true }
    });

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const revenueByMethod = {
      cash: payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0),
      card: payments.filter(p => p.method === 'card' || p.method === 'terminal').reduce((sum, p) => sum + (p.amount || 0), 0),
      qrcode: payments.filter(p => p.method === 'qrcode' || p.method === 'qr').reduce((sum, p) => sum + (p.amount || 0), 0),
      transfer: payments.filter(p => p.method === 'transfer').reduce((sum, p) => sum + (p.amount || 0), 0)
    };

    // 2. Total Expenses (Xarajatlar in target month)
    const expenses = await prisma.expense.findMany({
      where: {
        companyId: req.user.companyId || 1,
        ...branchWhere,
        createdAt: { gte: startDate, lte: endDate }
      },
      select: {
        amount: true,
        description: true,
        createdAt: true,
        category: { select: { name: true } }
      }
    });

    const formattedExpenses = expenses.map(e => ({
      amount: e.amount,
      title: e.description || "Operatsion xarajat",
      category: e.category?.name || "General",
      createdAt: e.createdAt
    }));

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 3. Net Profit (Sof Foyda)
    const netProfit = totalRevenue - totalExpenses;

    // 4. Investor Share calculation
    const sharePercentage = req.user.investorSharePercentage || 0;
    const investorShareAmount = netProfit > 0 ? (netProfit * (sharePercentage / 100)) : 0;

    // 5. Occupancy rate calculation (Total rooms vs Occupied bookings)
    const totalRooms = await prisma.room.count({
      where: {
        companyId: req.user.companyId || 1,
        ...branchWhere
      }
    });

    const activeBookings = await prisma.booking.count({
      where: {
        companyId: req.user.companyId || 1,
        ...branchWhere,
        status: 'active'
      }
    });

    const occupancyRate = totalRooms > 0 ? Math.round((activeBookings / totalRooms) * 100) : 0;

    res.json({
      success: true,
      data: {
        month: targetMonthStr,
        branches: allBranches,
        selectedBranchId,
        metrics: {
          totalRevenue,
          revenueByMethod,
          totalExpenses,
          netProfit,
          sharePercentage,
          investorShareAmount,
          totalRooms,
          activeBookings,
          occupancyRate
        },
        expenses: formattedExpenses.slice(0, 10) // Recent 10 expenses for transparency
      }
    });
  } catch (error) {
    console.error('Error in GET /api/investor/dashboard:', error);
    res.status(500).json({ success: false, message: 'Server xatosi', detail: error.message, stack: error.stack });
  }
});

module.exports = router;
