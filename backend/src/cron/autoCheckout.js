const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function initCron(io) {
  // Har daqiqada ishlaydigan cron job
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Vaqti tugagan va faol bo'lgan bronlarni topish
      const expiredBookings = await prisma.booking.findMany({
        where: {
          status: 'active',
          checkOutExpected: { lte: now },
        },
        include: { room: true },
      });

      if (expiredBookings.length > 0) {
        // Filter out monthly bookings and bookings with debt
        const bookingsToCheckout = expiredBookings.filter(b => {
          const expectedAmount = Number(b.totalPrice || 0);
          const paid = Number(b.paidAmount || 0);
          const hasDebt = expectedAmount > paid;
          return b.bookingType !== 'monthly' && !hasDebt;
        });

        if (bookingsToCheckout.length > 0) {
          console.log(`[AutoCheckout] ${bookingsToCheckout.length} ta muddati o'tgan (qarzsiz) bron topildi. Check-out qilinmoqda...`);

          for (const booking of bookingsToCheckout) {
          // 1. Bron holatini checked_out qilish
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: 'checked_out',
              checkOutActual: now,
            },
          });

          // 2. Xonani cleaning holatiga o'tkazish
          await prisma.room.update({
            where: { id: booking.roomId },
            data: { status: 'cleaning' },
          });

          // 3. Real vaqtda yangilash (frontend ga xabar yuborish)
          if (io) {
            io.to(`branch-${booking.branchId}`).emit('booking-checked-out', { bookingId: booking.id, roomId: booking.roomId });
            io.to(`branch-${booking.branchId}`).emit('room-status-changed', { roomId: booking.roomId, status: 'cleaning' });
          }

          console.log(`[AutoCheckout] Booking ID ${booking.id} muvaffaqiyatli check-out qilindi. (Xona: ${booking.room?.roomNumber})`);
        }
      }
      }
    } catch (error) {
      console.error('[AutoCheckout Error] Avtomatik check-out paytida xatolik yuz berdi:', error);
    }
  });

  console.log('⏰ Auto Checkout cron job ishga tushirildi');
}

module.exports = initCron;
