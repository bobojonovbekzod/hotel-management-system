const { NodeSSH } = require('node-ssh');

async function inspectShaxzodTargeted() {
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
        // Room 205 in Parkentskiy
        const room205 = await prisma.room.findFirst({
          where: { branchId: 5, roomNumber: '205' }
        });
        console.log('Room 205:', room205);

        const bookings = await prisma.booking.findMany({
          where: {
            branchId: 5,
            roomId: room205 ? room205.id : undefined
          },
          include: { payments: true },
          orderBy: { id: 'desc' },
          take: 5
        });

        bookings.forEach(b => {
          console.log('BOOKING ID:', b.id, '| Guest:', b.guestName, '| Phone:', b.guestPhone, '| Type:', b.bookingType, '| Status:', b.status);
          console.log('  CheckIn:', b.checkInDate, '| CheckOutExpected:', b.checkOutExpected, '| CheckOutActual:', b.checkOutActual);
          console.log('  TotalPrice:', b.totalPrice, '| PaidAmount:', b.paidAmount, '| RemainingDebt:', b.remainingDebt);
          console.log('  MonthlyRate:', b.monthlyRate, '| DurationMonths:', b.durationMonths, '| DailyRate:', b.dailyRate);
          console.log('  Payments:', b.payments.map(p => ({ id: p.id, amount: p.amount, method: p.method, date: p.createdAt, notes: p.notes })));
        });

        // Also search for guestName contains 'Shaxzod' or 'Tuxtaboyev' across all branch 5
        const nameBookings = await prisma.booking.findMany({
          where: {
            branchId: 5,
            OR: [
              { guestName: { contains: 'Shaxzod' } },
              { guestName: { contains: 'To' } }
            ]
          },
          include: { room: true, payments: true },
          take: 5
        });
        console.log('=== SEARCH BY NAME IN BRANCH 5 ===');
        nameBookings.forEach(b => {
          console.log('ID:', b.id, '| Room:', b.room?.roomNumber, '| Guest:', b.guestName, '| Status:', b.status, '| Exp:', b.checkOutExpected);
          console.log('  Payments:', b.payments.map(p => ({ id: p.id, amount: p.amount, method: p.method, date: p.createdAt })));
        });
      }

      main().catch(console.error).finally(() => prisma.$disconnect());
    `;

    const remotePath = '/root/hotel-management-system/backend/scratch_inspect_shaxzod2.js';
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

inspectShaxzodTargeted();
