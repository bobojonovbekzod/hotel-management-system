const { NodeSSH } = require('node-ssh');

async function checkAttendanceHistory() {
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
        console.log('=== ALL ATTENDANCE FOR USER 69 ===');
        const atts = await prisma.attendance.findMany({
          where: { userId: 69 },
          orderBy: { id: 'desc' }
        });
        console.log(atts);

        console.log('=== ATTENDANCES WITH PHOTO attendance_web_checkin_69_1790044736443.jpg ===');
        const matchPhoto = await prisma.attendance.findMany({
          where: {
            checkInPhoto: { contains: '1790044736443' }
          }
        });
        console.log('Match photo in DB:', matchPhoto);

        console.log('=== ALL ATTENDANCE IDS AROUND 514-526 ===');
        const rangeAtts = await prisma.attendance.findMany({
          where: { id: { gte: 510, lte: 530 } }
        });
        console.log(rangeAtts);
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_check_nigora_history.js';
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

checkAttendanceHistory();
