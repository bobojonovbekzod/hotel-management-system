const { NodeSSH } = require('node-ssh');

async function addAzizaExpense() {
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
        // 1. Check category ID for 'Xodimlar maoshi'
        const category = await prisma.expenseCategory.findFirst({
          where: { companyId: 1, name: 'Xodimlar maoshi' }
        });
        console.log('Category:', category);

        // 2. Check if expense already exists for Aziza 13.09
        const existing = await prisma.expense.findFirst({
          where: {
            branchId: 3,
            amount: 1000000,
            description: { contains: 'Murodova Aziza' },
            expenseDate: {
              gte: new Date('2026-09-13T00:00:00Z'),
              lte: new Date('2026-09-13T23:59:59Z')
            }
          }
        });

        if (!existing) {
          const newExp = await prisma.expense.create({
            data: {
              companyId: 1,
              branchId: 3, // Buxoro
              adminId: 22, // Xandamov Shaxzod
              categoryId: category.id,
              amount: 1000000,
              description: 'Avans - Murodova Aziza (Аванс)',
              paymentSource: 'cash',
              isCompanyExpense: false,
              expenseDate: new Date('2026-09-13T00:00:00.000Z'),
              createdAt: new Date('2026-09-13T10:00:00.000Z')
            }
          });
          console.log('Created Aziza Expense:', newExp);
        } else {
          console.log('Expense already exists:', existing);
        }

        // 3. Verify Buxoro 'Xodimlar maoshi' total in September 2026
        const salaryExpenses = await prisma.expense.findMany({
          where: {
            branchId: 3,
            categoryId: category.id,
            expenseDate: {
              gte: new Date('2026-09-01T00:00:00Z'),
              lte: new Date('2026-09-30T23:59:59Z')
            }
          },
          include: { category: true }
        });

        console.log('=== BUXORO SEPTEMBER SALARY EXPENSES ===');
        let total = 0;
        salaryExpenses.forEach(e => {
          total += e.amount;
          console.log('ID:', e.id, '| Amount:', e.amount?.toLocaleString(), '| Desc:', e.description, '| Date:', e.expenseDate);
        });
        console.log('TOTAL XODIMLAR MAOSHI IN EXPENSES:', total.toLocaleString(), "so'm");

        // 4. Verify Buxoro Payroll Transactions in September 2026
        const payrollTxs = await prisma.payrollTransaction.findMany({
          where: {
            branchId: 3,
            type: 'advance',
            date: {
              gte: new Date('2026-09-01T00:00:00Z'),
              lte: new Date('2026-09-30T23:59:59Z')
            }
          },
          include: { user: { select: { name: true } } }
        });
        console.log('=== BUXORO SEPTEMBER PAYROLL ADVANCES ===');
        let payrollTotal = 0;
        payrollTxs.forEach(t => {
          payrollTotal += t.amount;
          console.log('ID:', t.id, '| User:', t.user?.name, '| Amount:', t.amount?.toLocaleString(), '| Date:', t.date);
        });
        console.log('TOTAL PAYROLL ADVANCES:', payrollTotal.toLocaleString(), "so'm");
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_add_aziza_expense.js';
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

addAzizaExpense();
