const { NodeSSH } = require('node-ssh');

async function checkAzizaExpense() {
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
        const exps = await prisma.expense.findMany({
          where: {
            OR: [
              { description: { contains: 'Aziza' } },
              { description: { contains: 'Murodova' } },
              { branchId: 3, createdAt: { gte: new Date('2026-09-12T00:00:00Z'), lte: new Date('2026-09-14T23:59:59Z') } }
            ]
          },
          include: { category: true }
        });
        console.log('Matching Expenses for Aziza / 13 Sept:', exps);
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_check_aziza.js';
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

checkAzizaExpense();
