const { NodeSSH } = require('node-ssh');

async function inspectBuxoro() {
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
        const branchId = 3; // Buxoro

        console.log('=== BUXORO USERS ===');
        const users = await prisma.user.findMany({
          where: { branchId }
        });
        console.log(users.map(u => ({ id: u.id, name: u.name, role: u.role })));

        console.log('=== BUXORO PAYROLL TRANSACTIONS (SEPTEMBER 2026) ===');
        const payrollTxs = await prisma.payrollTransaction.findMany({
          where: {
            branchId,
            date: {
              gte: new Date('2026-09-01T00:00:00Z'),
              lte: new Date('2026-09-30T23:59:59Z')
            }
          },
          include: { user: { select: { id: true, name: true, role: true } }, admin: { select: { name: true } } },
          orderBy: { date: 'asc' }
        });
        console.log('Payroll Transactions Count:', payrollTxs.length);
        payrollTxs.forEach(t => {
          console.log('ID:', t.id, '| User:', t.user?.name, '| Type:', t.type, '| Amount:', t.amount, '| Date:', t.date, '| Desc:', t.description, '| CreatedBy:', t.admin?.name);
        });

        console.log('=== BUXORO ALL PAYROLL TRANSACTIONS (ALL TIME) ===');
        const allPayrollTxs = await prisma.payrollTransaction.findMany({
          where: { branchId },
          include: { user: { select: { id: true, name: true } } }
        });
        allPayrollTxs.forEach(t => {
          console.log('ID:', t.id, '| User:', t.user?.name, '| Type:', t.type, '| Amount:', t.amount, '| Date:', t.date, '| Desc:', t.description);
        });

        console.log('=== BUXORO EXPENSES UNDER "Xodimlar maoshi" (SEPTEMBER 2026) ===');
        const salaryExpenses = await prisma.expense.findMany({
          where: {
            branchId,
            category: { name: 'Xodimlar maoshi' },
            expenseDate: {
              gte: new Date('2026-09-01T00:00:00Z'),
              lte: new Date('2026-09-30T23:59:59Z')
            }
          },
          include: { category: true, admin: { select: { name: true } } },
          orderBy: { expenseDate: 'asc' }
        });
        console.log('Salary Expenses Count:', salaryExpenses.length);
        salaryExpenses.forEach(e => {
          console.log('ID:', e.id, '| Amount:', e.amount, '| Desc:', e.description, '| ExpenseDate:', e.expenseDate, '| CreatedAt:', e.createdAt, '| Admin:', e.admin?.name);
        });

        console.log('=== BUXORO ALL EXPENSES (SEPTEMBER 2026) ===');
        const allExps = await prisma.expense.findMany({
          where: {
            branchId,
            expenseDate: {
              gte: new Date('2026-09-01T00:00:00Z'),
              lte: new Date('2026-09-30T23:59:59Z')
            }
          },
          include: { category: true }
        });
        allExps.forEach(e => {
          if (e.amount >= 500000 || e.description?.toLowerCase().includes('avans') || e.description?.toLowerCase().includes('oylik')) {
            console.log('EXP ID:', e.id, '| Cat:', e.category?.name, '| Amount:', e.amount, '| Desc:', e.description, '| Date:', e.expenseDate);
          }
        });
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_inspect_buxoro.js';
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

inspectBuxoro();
