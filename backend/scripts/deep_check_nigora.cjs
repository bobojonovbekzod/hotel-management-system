const { NodeSSH } = require('node-ssh');

async function deepInspectNigora() {
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
        console.log('=== ALL ATTENDANCE FOR USER IDS 10, 68, 69 (ALL DATES) ===');
        const allAtt = await prisma.attendance.findMany({
          where: {
            userId: { in: [10, 68, 69] }
          },
          include: { branch: true },
          orderBy: { createdAt: 'desc' }
        });
        console.log('Nigora All Attendance:', JSON.stringify(allAtt, null, 2));

        console.log('=== ALL ATTENDANCES CREATED TODAY (2026-09-22) ACROSS ALL BRANCHES ===');
        const todayAll = await prisma.attendance.findMany({
          where: {
            createdAt: {
              gte: new Date('2026-09-21T18:00:00Z') // from last night till now
            }
          },
          include: { user: { select: { id: true, name: true, role: true } }, branch: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        });
        console.log('Today All Attendances:', JSON.stringify(todayAll, null, 2));

        console.log('=== ALL SHIFTS CREATED TODAY (2026-09-22) ACROSS ALL BRANCHES ===');
        const todayShifts = await prisma.shift.findMany({
          where: {
            createdAt: {
              gte: new Date('2026-09-21T18:00:00Z')
            }
          },
          include: { admin: { select: { id: true, name: true, role: true } }, branch: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        });
        console.log('Today All Shifts:', JSON.stringify(todayShifts, null, 2));
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_deep_check_nigora.js';
    await ssh.execCommand(`cat << 'EOF' > ${remotePath}\n${localCode}\nEOF`);
    const res = await ssh.execCommand(`node ${remotePath}`, {
      cwd: '/root/hotel-management-system/backend'
    });
    console.log(res.stdout || res.stderr);

    console.log('=== FILES IN /root/hotel-management-system/backend/uploads/attendance (LAST 30 FILES) ===');
    const filesRes = await ssh.execCommand('ls -lt /root/hotel-management-system/backend/uploads/attendance | head -n 30');
    console.log(filesRes.stdout);

    console.log('=== FILES IN /root/hotel-management-system/backend/uploads/shifts (LAST 30 FILES) ===');
    const shiftFilesRes = await ssh.execCommand('ls -lt /root/hotel-management-system/backend/uploads/shifts | head -n 30');
    console.log(shiftFilesRes.stdout);

    ssh.dispose();
  } catch (e) {
    console.error(e);
  }
}

deepInspectNigora();
