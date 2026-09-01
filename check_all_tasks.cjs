const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAllTasks() {
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
        console.log("=== LISTING ALL TASKS IN DATABASE ===");
        const tasks = await prisma.task.findMany({
          include: {
            creator: { select: { id: true, name: true, role: true } },
            assignee: { select: { id: true, name: true, role: true } },
            branch: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        console.log("Total tasks count:", tasks.length);
        console.log(JSON.stringify(tasks, null, 2));

        await prisma.$disconnect();
      }

      main().catch(console.error);
    `;

    await ssh.execCommand(`cat << 'EOF' > /root/hotel-management-system/backend/check_t.js\n${scriptCode}\nEOF`);
    const res = await ssh.execCommand('node check_t.js', { cwd: '/root/hotel-management-system/backend' });
    console.log(res.stdout);

    await ssh.execCommand('rm -f /root/hotel-management-system/backend/check_t.js');
    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}

checkAllTasks();
