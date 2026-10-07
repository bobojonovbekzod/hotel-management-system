const { NodeSSH } = require('node-ssh');

async function checkDashboardStats() {
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
        // Group expenses for Sept 2026 for TTZ (branch 4)
        const ttzStats = await prisma.expense.groupBy({
          by: ['categoryId'],
          where: {
            branchId: 4,
            createdAt: { gte: new Date('2026-09-01T00:00:00Z') }
          },
          _sum: { amount: true }
        });

        const categories = await prisma.expenseCategory.findMany();
        const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

        console.log('=== TTZ SEPTEMBER EXPENSES BY CATEGORY ===');
        ttzStats.forEach(s => {
          console.log(catMap[s.categoryId] || 'Unknown', ':', s._sum.amount?.toLocaleString(), 'so\\'m');
        });

        // Company-wide stats
        const companyStats = await prisma.expense.groupBy({
          by: ['categoryId'],
          where: {
            companyId: 1,
            createdAt: { gte: new Date('2026-09-01T00:00:00Z') }
          },
          _sum: { amount: true }
        });

        console.log('=== ALL BRANCHES (OWNER DASHBOARD) EXPENSES BY CATEGORY ===');
        companyStats.forEach(s => {
          console.log(catMap[s.categoryId] || 'Unknown', ':', s._sum.amount?.toLocaleString(), 'so\\'m');
        });
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_check_dash_stats.js';
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

checkDashboardStats();
