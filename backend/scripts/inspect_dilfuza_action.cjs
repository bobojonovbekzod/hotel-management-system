const { NodeSSH } = require('node-ssh');

async function inspectAndExecute() {
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
        // 1. Find user Dilfuza
        const dilfuza = await prisma.user.findFirst({
          where: {
            name: { contains: 'Dilfuza' },
            branchId: 8
          }
        });
        console.log('Dilfuza User:', dilfuza ? { id: dilfuza.id, name: dilfuza.name, branchId: dilfuza.branchId, companyId: dilfuza.companyId } : 'NOT FOUND');

        if (!dilfuza) {
          const allMirobodUsers = await prisma.user.findMany({ where: { branchId: 8 } });
          console.log('All Mirobod Users:', allMirobodUsers.map(u => ({ id: u.id, name: u.name, role: u.role })));
        }

        // 2. Find shifts on 20.09.2026 for Mirobod
        const shifts20 = await prisma.shift.findMany({
          where: {
            branchId: 8,
            startTime: {
              gte: new Date('2026-09-19T00:00:00Z'),
              lte: new Date('2026-09-22T23:59:59Z')
            }
          },
          include: {
            expenses: { include: { category: true } }
          }
        });
        console.log('Shifts around 20 Sept:', shifts20.map(s => ({
          id: s.id,
          adminId: s.adminId,
          startTime: s.startTime,
          endTime: s.endTime,
          status: s.status,
          expenses: s.expenses
        })));

        // 3. Check Expense Categories
        const categories = await prisma.expenseCategory.findMany({
          where: { companyId: dilfuza ? dilfuza.companyId : 1 }
        });
        console.log('Expense Categories:', categories.map(c => ({ id: c.id, name: c.name })));

        // 4. Check existing 13.09 expense
        const exp13 = await prisma.expense.findFirst({
          where: {
            branchId: 8,
            amount: 600000,
            createdAt: {
              gte: new Date('2026-09-12T00:00:00Z'),
              lte: new Date('2026-09-14T23:59:59Z')
            }
          }
        });
        console.log('13.09 Expense:', exp13);
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_check_dilfuza.js';
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

inspectAndExecute();
