const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECTING MIROBOD BRANCH SHIFTS & PAYMENTS ===");
  
  // Find Mirobod branch
  const branches = await prisma.branch.findMany({
    where: { name: { contains: 'Mirobod', mode: 'insensitive' } }
  });
  console.log("Branches found:", branches);

  if (branches.length === 0) {
    const allBranches = await prisma.branch.findMany();
    console.log("All branches:", allBranches);
    return;
  }

  const branchId = branches[0].id;
  console.log("Mirobod Branch ID:", branchId);

  // Check shifts for 27.08.2026 and 28.08.2026
  const start27 = new Date('2026-08-27T00:00:00.000Z');
  const end28 = new Date('2026-08-28T23:59:59.999Z');

  const shifts = await prisma.shift.findMany({
    where: {
      branchId: branchId,
      startTime: { gte: start27, lte: end28 }
    },
    include: {
      admin: true,
      payments: {
        include: { booking: { include: { room: true } } }
      },
      expenses: {
        include: { category: true }
      }
    },
    orderBy: { startTime: 'asc' }
  });

  console.log(`Found ${shifts.length} shifts between 27.08 and 28.08:`);
  shifts.forEach(s => {
    console.log(`\nShift #${s.id} | Start: ${s.startTime.toISOString()} | End: ${s.endTime?.toISOString() || 'OPEN'} | Admin: ${s.admin?.name} | Status: ${s.status}`);
    console.log(`  Expected Cash: ${s.expectedCash} | Actual Cash: ${s.actualCash} | Handed Cash: ${s.handedOverCash} | Difference: ${s.cashDifference}`);
    console.log(`  Payments (${s.payments.length}):`);
    s.payments.forEach(p => {
      console.log(`    Payment #${p.id} | Room: ${p.booking?.room?.roomNumber} | Amount: ${p.amount} | Method: ${p.method} | Date: ${p.createdAt.toISOString()}`);
    });
    console.log(`  Expenses (${s.expenses.length}):`);
    s.expenses.forEach(e => {
      console.log(`    Expense #${e.id} | Category: ${e.category?.name} | Amount: ${e.amount} | Date: ${e.createdAt.toISOString()}`);
    });
  });

  // Also check rooms in Mirobod branch
  const rooms = await prisma.room.findMany({
    where: { branchId: branchId },
    orderBy: { roomNumber: 'asc' }
  });
  console.log("\nMirobod Rooms:", rooms.map(r => ({ id: r.id, number: r.roomNumber })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
