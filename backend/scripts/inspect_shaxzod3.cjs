const { NodeSSH } = require('node-ssh');

async function inspectBookingDetail() {
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
        const bookings = await prisma.booking.findMany({
          where: {
            id: { in: [4541, 4540, 3807] }
          },
          include: {
            primaryGuest: true,
            room: true,
            payments: true
          }
        });

        console.log(JSON.stringify(bookings, null, 2));
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_inspect_shaxzod3.js';
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

inspectBookingDetail();
