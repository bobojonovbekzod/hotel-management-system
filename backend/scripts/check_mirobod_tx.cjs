const { NodeSSH } = require('node-ssh');

async function checkPayrollTx() {
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
        const txs = await prisma.payrollTransaction.findMany({
          where: {
            branchId: 8,
            date: {
              gte: new Date('2026-09-01T00:00:00Z'),
              lte: new Date('2026-09-30T23:59:59Z')
            }
          },
          include: { user: { select: { id: true, name: true } } }
        });
        console.log('Mirobod Sept 2026 Payroll Transactions:', txs);
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_inspect_mirobod_tx.js';
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

checkPayrollTx();
