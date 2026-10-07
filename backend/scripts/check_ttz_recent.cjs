const { NodeSSH } = require('node-ssh');

async function checkTTZRecent() {
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
        const expenses = await prisma.expense.findMany({
          where: {
            branchId: 4,
            createdAt: { gte: new Date('2026-09-12T00:00:00Z') }
          },
          include: { category: true, admin: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        });

        console.log('=== TTZ EXPENSES 12-22 SEPT ===');
        expenses.forEach(e => {
          console.log('ID:', e.id, '| Amount:', e.amount, '| Cat:', e.category?.name, '| Desc:', e.description, '| Date:', e.expenseDate, '| Created:', e.createdAt, '| Admin:', e.admin?.name);
        });
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_ttz_recent.js';
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

checkTTZRecent();
