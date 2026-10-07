const { NodeSSH } = require('node-ssh');

async function checkNigora() {
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
        console.log('=== SEARCH USER NIGORA / YULLIBOYEVA ===');
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: 'Nigora' } },
              { name: { contains: 'Yulliboyeva' } },
              { name: { contains: 'Yulli' } }
            ]
          },
          include: { branch: true }
        });
        console.log('Matching Users:', JSON.stringify(users, null, 2));

        console.log('=== SAMARQAND-2 (BRANCH 10) ALL USERS ===');
        const sam2Users = await prisma.user.findMany({
          where: { branchId: 10 }
        });
        console.log('Samarqand-2 Users:', sam2Users.map(u => ({ id: u.id, name: u.name, role: u.role, isActive: u.isActive, faceEnrolled: !!u.faceData })));

        console.log('=== TODAY ATTENDANCE FOR SAMARQAND-2 (2026-09-22) ===');
        const todayAtt = await prisma.attendance.findMany({
          where: {
            branchId: 10,
            workDate: {
              gte: new Date('2026-09-21T00:00:00Z'),
              lte: new Date('2026-09-23T23:59:59Z')
            }
          },
          include: { user: { select: { id: true, name: true, role: true } } }
        });
        console.log('Attendance:', JSON.stringify(todayAtt, null, 2));

        console.log('=== TODAY SHIFTS FOR SAMARQAND-2 ===');
        const shifts = await prisma.shift.findMany({
          where: {
            branchId: 10,
            startTime: {
              gte: new Date('2026-09-21T00:00:00Z'),
              lte: new Date('2026-09-23T23:59:59Z')
            }
          },
          include: { admin: { select: { id: true, name: true, role: true } } }
        });
        console.log('Shifts:', JSON.stringify(shifts, null, 2));
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_check_nigora.js';
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

checkNigora();
