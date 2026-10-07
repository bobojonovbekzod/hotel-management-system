const { NodeSSH } = require('node-ssh');

async function applyChanges() {
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
        // 1. Remove "авонс" / "Avans" expense category if exists
        const avansCats = await prisma.expenseCategory.findMany({
          where: {
            OR: [
              { name: { contains: 'авонс' } },
              { name: { contains: 'avans' } }
            ]
          }
        });
        for (const cat of avansCats) {
          console.log('Deleting expense category:', cat);
          // Check if any expenses are using it
          await prisma.expense.updateMany({
            where: { categoryId: cat.id },
            data: { categoryId: 7 } // Default to 'Boshqa xarajatlar'
          });
          await prisma.expenseCategory.delete({ where: { id: cat.id } });
        }

        // 2. Create 20.09.2026 expense for Mirobod
        // Check if already created
        let exp20 = await prisma.expense.findFirst({
          where: {
            branchId: 8,
            amount: 215000,
            expenseDate: {
              gte: new Date('2026-09-20T00:00:00Z'),
              lte: new Date('2026-09-20T23:59:59Z')
            }
          }
        });

        if (!exp20) {
          exp20 = await prisma.expense.create({
            data: {
              companyId: 1,
              branchId: 8,
              adminId: 9, // Xolboyeva Dilfuza
              shiftId: 895, // 20.09 shift
              categoryId: 7, // Boshqa xarajatlar
              amount: 215000,
              description: 'Avans',
              paymentSource: 'cash',
              isCompanyExpense: false,
              expenseDate: new Date('2026-09-20T12:00:00Z'),
              createdAt: new Date('2026-09-20T12:00:00Z')
            }
          });
          console.log('Created 20.09 Expense:', exp20);
        } else {
          console.log('20.09 Expense already exists:', exp20);
        }

        // 3. Create Payroll Transactions for Xolboyeva Dilfuza (User ID 9)
        // 13.09.2026 - 600,000 UZS
        const tx13Exists = await prisma.payrollTransaction.findFirst({
          where: {
            userId: 9,
            amount: 600000,
            type: 'advance',
            date: {
              gte: new Date('2026-09-13T00:00:00Z'),
              lte: new Date('2026-09-13T23:59:59Z')
            }
          }
        });

        if (!tx13Exists) {
          const tx13 = await prisma.payrollTransaction.create({
            data: {
              companyId: 1,
              branchId: 8,
              userId: 9,
              adminId: 9,
              type: 'advance',
              amount: 600000,
              description: 'Avans (13.09.2026 kassadan)',
              date: new Date('2026-09-13T12:00:00Z')
            }
          });
          console.log('Created 13.09 Payroll Transaction:', tx13);
        } else {
          console.log('13.09 Payroll Transaction already exists:', tx13Exists);
        }

        // 20.09.2026 - 215,000 UZS
        const tx20Exists = await prisma.payrollTransaction.findFirst({
          where: {
            userId: 9,
            amount: 215000,
            type: 'advance',
            date: {
              gte: new Date('2026-09-20T00:00:00Z'),
              lte: new Date('2026-09-20T23:59:59Z')
            }
          }
        });

        if (!tx20Exists) {
          const tx20 = await prisma.payrollTransaction.create({
            data: {
              companyId: 1,
              branchId: 8,
              userId: 9,
              adminId: 9,
              type: 'advance',
              amount: 215000,
              description: 'Avans (20.09.2026 kassadan)',
              date: new Date('2026-09-20T12:00:00Z')
            }
          });
          console.log('Created 20.09 Payroll Transaction:', tx20);
        } else {
          console.log('20.09 Payroll Transaction already exists:', tx20Exists);
        }

        // 4. Verification
        console.log('=== VERIFICATION: EXPENSE CATEGORIES ===');
        const allCats = await prisma.expenseCategory.findMany({ where: { companyId: 1 } });
        console.log(allCats.map(c => c.name));

        console.log('=== VERIFICATION: MIROBOD EXPENSES IN SEPT ===');
        const mirobodExps = await prisma.expense.findMany({
          where: {
            branchId: 8,
            createdAt: { gte: new Date('2026-09-01T00:00:00Z') }
          },
          include: { category: true }
        });
        console.log(mirobodExps.map(e => ({ id: e.id, amount: e.amount, cat: e.category.name, desc: e.description, date: e.expenseDate })));

        console.log('=== VERIFICATION: DILFUZA PAYROLL TX ===');
        const dilfuzaTxs = await prisma.payrollTransaction.findMany({
          where: { userId: 9 }
        });
        console.log(dilfuzaTxs);
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_apply_dilfuza_avans.js';
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

applyChanges();
