const { NodeSSH } = require('node-ssh');

async function createKunlikIshchilar() {
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
        // 1. Create or find 'Kunlik ishchilar' category for companyId: 1
        let category = await prisma.expenseCategory.findFirst({
          where: {
            companyId: 1,
            name: { equals: 'Kunlik ishchilar' }
          }
        });

        if (!category) {
          category = await prisma.expenseCategory.create({
            data: {
              companyId: 1,
              name: 'Kunlik ishchilar',
              isActive: true
            }
          });
          console.log('Created new Expense Category:', category);
        } else {
          console.log('Category already exists:', category);
        }

        // 2. Update the 4 expenses in TTZ (IDs 543, 556, 579, 597)
        const targetIds = [543, 556, 579, 597];
        const updateRes = await prisma.expense.updateMany({
          where: { id: { in: targetIds } },
          data: {
            categoryId: category.id,
            description: 'Kunlik tozalik xodimi'
          }
        });
        console.log('Updated Expenses Count:', updateRes.count);

        // 3. Verification
        const updatedExpenses = await prisma.expense.findMany({
          where: { id: { in: targetIds } },
          include: { category: true }
        });
        console.log('Updated TTZ Expenses:');
        updatedExpenses.forEach(e => {
          console.log('ID:', e.id, '| Amount:', e.amount, '| Category:', e.category.name, '| Desc:', e.description, '| Date:', e.expenseDate);
        });

        // 4. List all active categories for the company
        const allCats = await prisma.expenseCategory.findMany({
          where: { companyId: 1, isActive: true },
          orderBy: { id: 'asc' }
        });
        console.log('All Active Expense Categories (Available to all branches):');
        console.log(allCats.map(c => ({ id: c.id, name: c.name })));
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_create_kunlik_category.js';
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

createKunlikIshchilar();
