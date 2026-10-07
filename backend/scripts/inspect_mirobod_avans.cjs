const { NodeSSH } = require('node-ssh');

async function inspectMirobod() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: '138.249.7.136',
      username: 'root',
      password: 'U4NIKO7rcFmf$qpt',
      readyTimeout: 15000
    });

    const localCode = `
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      async function main() {
        const branchId = 8; // Mirobod

        const shifts = await prisma.shift.findMany({
          where: {
            branchId,
            startTime: {
              gte: new Date('2026-09-12T00:00:00Z'),
              lte: new Date('2026-09-14T23:59:59Z')
            }
          },
          include: { 
            admin: { select: { id: true, name: true, role: true } },
            expenses: { include: { category: true } }
          }
        });
        
        console.log('=== SHIFTS ===');
        shifts.forEach(s => {
          console.log('SHIFT ID:', s.id, '| Admin:', s.admin?.name, '| Start:', s.startTime, '| End:', s.endTime, '| Status:', s.status);
          console.log('   ExpectedCash:', s.expectedCash, '| ActualCash:', s.actualCash, '| Difference:', s.difference);
          console.log('   HandoverNote:', s.handoverNote);
          console.log('   Shift Expenses:', s.expenses.map(e => ({ id: e.id, amount: e.amount, cat: e.category?.name, desc: e.description, note: e.note })));
        });

        const allExpenses = await prisma.expense.findMany({
          where: {
            branchId,
            createdAt: {
              gte: new Date('2026-09-12T00:00:00Z'),
              lte: new Date('2026-09-14T23:59:59Z')
            }
          },
          include: { category: true, createdBy: { select: { id: true, name: true } } }
        });

        console.log('=== ALL EXPENSES (12-14 SEPT) ===');
        allExpenses.forEach(e => {
          console.log('EXPENSE ID:', e.id, '| Amount:', e.amount, '| Category:', e.category?.name, '| Description:', e.description, '| Note:', e.note, '| CreatedBy:', e.createdBy?.name, '| CreatedAt:', e.createdAt, '| ShiftId:', e.shiftId);
        });

        // Check if there are any staff advances / salary deductions for Mirobod staff in September
        const staffList = await prisma.user.findMany({
          where: { branchId }
        });
        console.log('=== MIROBOD STAFF ===');
        staffList.forEach(u => console.log('ID:', u.id, '| Name:', u.name, '| Role:', u.role, '| Salary:', u.salary));
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_inspect_mirobod.js';
    await ssh.execCommand(`cat << 'EOF' > ${remotePath}\n${localCode}\nEOF`);
    const res = await ssh.execCommand(`node ${remotePath}`, {
      cwd: '/root/hotel-management-system/backend'
    });
    console.log(res.stdout || res.stderr);

    ssh.dispose();
  } catch (e) {
    console.error(e);
  }
}

inspectMirobod();
