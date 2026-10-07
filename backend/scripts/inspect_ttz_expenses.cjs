const { NodeSSH } = require('node-ssh');

async function inspectTTZ() {
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
        const branchId = 4; // TTZ

        console.log('=== ALL EXPENSE CATEGORIES ===');
        const categories = await prisma.expenseCategory.findMany({ where: { companyId: 1 } });
        console.log(categories);

        console.log('=== TTZ EXPENSES IN SEPTEMBER 2026 ===');
        const expenses = await prisma.expense.findMany({
          where: {
            branchId: 4,
            createdAt: { gte: new Date('2026-09-01T00:00:00Z') }
          },
          include: { category: true, admin: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        });
        console.log(JSON.stringify(expenses, null, 2));

        console.log('=== TTZ CLEANERS / STAFF ===');
        const staff = await prisma.user.findMany({
          where: { branchId: 4 }
        });
        console.log(staff.map(s => ({ id: s.id, name: s.name, role: s.role, salary: s.salary, salaryType: s.salaryType })));
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_inspect_ttz_expenses.js';
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

inspectTTZ();
