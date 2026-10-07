const { NodeSSH } = require('node-ssh');

async function inspectShaxzod() {
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
        console.log('=== SEARCH BOOKINGS FOR SHAXZOD / ROOM 205 IN PARKENTSKIY (BRANCH 5) ===');
        const bookings = await prisma.booking.findMany({
          where: {
            branchId: 5,
            OR: [
              { guestName: { contains: 'Shaxzod' } },
              { guestName: { contains: 'To\\'xtaboyev' } },
              { guestName: { contains: 'Tuxtaboyev' } },
              { room: { roomNumber: '205' } }
            ]
          },
          include: {
            room: true,
            payments: true
          },
          orderBy: { id: 'desc' }
        });

        console.log('Bookings:', JSON.stringify(bookings, null, 2));

        console.log('=== PAYMENTS AROUND 15.09.2026 IN PARKENTSKIY ===');
        const payments15 = await prisma.payment.findMany({
          where: {
            branchId: 5,
            createdAt: {
              gte: new Date('2026-09-14T18:00:00Z'),
              lte: new Date('2026-09-15T06:00:00Z')
            }
          },
          include: { booking: { include: { room: true } } }
        });
        console.log('Payments on 14-15 Sept:', JSON.stringify(payments15, null, 2));
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_inspect_shaxzod.js';
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

inspectShaxzod();
