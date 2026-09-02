const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkBuxoroExpenseDetails() {
  try {
    await ssh.connect({
      host: '138.249.7.136',
      username: 'root',
      password: 'U4NIKO7rcFmf$qpt',
      readyTimeout: 15000
    });

    const scriptCode = `
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      async function main() {
        console.log("=== DETAILED EXPENSE AUDIT FOR BUXORO (branchId: 3) ===");
        
        const expense = await prisma.expense.findUnique({
          where: { id: 364 },
          include: {
            shift: true,
            admin: { select: { name: true } },
            category: { select: { name: true } }
          }
        });

        console.log("Expense 364 Details:", JSON.stringify(expense, null, 2));

        console.log("\n=== ALL RECENT BUXORO EXPENSES (AUGUST & SEPTEMBER) ===");
        const allRecent = await prisma.expense.findMany({
          where: { branchId: 3 },
          include: {
            shift: { select: { id: true, startTime: true, endTime: true, status: true } },
            admin: { select: { name: true } },
            category: { select: { name: true } }
          },
          orderBy: { id: 'desc' },
          take: 10
        });

        console.log(JSON.stringify(allRecent, null, 2));

        await prisma.$disconnect();
      }

      main().catch(console.error);
    `;

    await ssh.execCommand(`cat << 'EOF' > /root/hotel-management-system/backend/check_details.js\n${scriptCode}\nEOF`);
    const res = await ssh.execCommand('node check_details.js', { cwd: '/root/hotel-management-system/backend' });
    console.log(res.stdout);

    await ssh.execCommand('rm -f /root/hotel-management-system/backend/check_details.js');
    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}

checkBuxoroExpenseDetails();
