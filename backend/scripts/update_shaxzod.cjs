const { NodeSSH } = require('node-ssh');

async function updateShaxzodBooking() {
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
        const updated = await prisma.booking.update({
          where: { id: 4541 },
          data: {
            checkOutExpected: new Date('2026-10-22T12:00:00.000Z'),
            totalPrice: 2000000
          },
          include: { primaryGuest: true, room: true }
        });

        console.log('Updated Booking 4541:', updated);
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_update_shaxzod.js';
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

updateShaxzodBooking();
