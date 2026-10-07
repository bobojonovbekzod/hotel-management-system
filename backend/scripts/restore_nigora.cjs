const { NodeSSH } = require('node-ssh');

async function restoreNigoraCheckin() {
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
        // Find existing attendance for Nigora (ID 69) for today (2026-09-22)
        const today = new Date('2026-09-22T12:00:00.000Z');
        
        const photoUrl = '/uploads/attendance/attendance_web_checkin_69_1790044736443.jpg';
        const checkInTime = new Date('2026-09-22T02:38:56.000Z'); // 07:38 Tashkent time

        const updated = await prisma.attendance.updateMany({
          where: {
            userId: 69,
            workDate: today
          },
          data: {
            checkIn: checkInTime,
            checkInPhoto: photoUrl,
            notes: null
          }
        });

        console.log('Restored Attendance Record:', updated);

        const current = await prisma.attendance.findFirst({
          where: { userId: 69, workDate: today },
          include: { user: true }
        });
        console.log('Current DB State for Nigora:', current);
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_restore_nigora.js';
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

restoreNigoraCheckin();
