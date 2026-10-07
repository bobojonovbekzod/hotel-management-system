const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

async function fixHabibullo() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: '138.249.7.136',
      username: 'root',
      password: 'U4NIKO7rcFmf$qpt',
      readyTimeout: 20000
    });

    const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const targetBookingId = 6279;
  const targetPaymentId = 6685;
  const targetShiftId = 947;

  console.log('--- BEFORE FIX ---');
  const bBefore = await prisma.booking.findUnique({ where: { id: targetBookingId } });
  console.log('Booking before:', { id: bBefore.id, totalPrice: bBefore.totalPrice, paidAmount: bBefore.paidAmount });

  const pBefore = await prisma.payment.findUnique({ where: { id: targetPaymentId } });
  console.log('Payment before:', pBefore);

  const sBefore = await prisma.shift.findUnique({ where: { id: targetShiftId } });
  console.log('Shift before:', { id: sBefore.id, totalIncome: sBefore.totalIncome, totalPenalties: sBefore.totalPenalties });

  // Fix in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Update booking
    await tx.booking.update({
      where: { id: targetBookingId },
      data: {
        totalPrice: 300000,
        paidAmount: 300000
      }
    });

    // 2. Update payment type to room
    await tx.payment.update({
      where: { id: targetPaymentId },
      data: {
        type: 'room',
        description: 'Xonaning qoldiq tolov'
      }
    });

    // 3. Update shift penalties count
    await tx.shift.update({
      where: { id: targetShiftId },
      data: {
        totalPenalties: { decrement: 110000 }
      }
    });
  });

  console.log('--- AFTER FIX ---');
  const bAfter = await prisma.booking.findUnique({ where: { id: targetBookingId } });
  console.log('Booking after:', { id: bAfter.id, totalPrice: bAfter.totalPrice, paidAmount: bAfter.paidAmount });

  const pAfter = await prisma.payment.findUnique({ where: { id: targetPaymentId } });
  console.log('Payment after:', pAfter);

  const sAfter = await prisma.shift.findUnique({ where: { id: targetShiftId } });
  console.log('Shift after:', { id: sAfter.id, totalIncome: sAfter.totalIncome, totalPenalties: sAfter.totalPenalties });
}

run().catch(console.error).finally(() => prisma.$disconnect());
`;

    const tempLocal = path.join(__dirname, 'temp_habibullo.js');
    fs.writeFileSync(tempLocal, scriptContent);

    await ssh.putFile(tempLocal, '/root/hotel-management-system/backend/temp_habibullo.js');
    const res = await ssh.execCommand('node /root/hotel-management-system/backend/temp_habibullo.js');
    console.log('STDOUT:\n', res.stdout);
    console.log('STDERR:\n', res.stderr);

    await ssh.execCommand('rm -f /root/hotel-management-system/backend/temp_habibullo.js');
    if (fs.existsSync(tempLocal)) fs.unlinkSync(tempLocal);

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}

fixHabibullo();
