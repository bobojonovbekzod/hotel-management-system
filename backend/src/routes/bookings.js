const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/bookings - Bronlar ro'yxati
router.get('/', authenticate, async (req, res) => {
  try {
    const { branchId, status, date, bookingType } = req.query;
    
    const where = { companyId: req.user.companyId };
    if (req.user.role === 'admin' || req.user.role === 'director') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = parseInt(branchId);
    }
    if (status) where.status = status;
    if (bookingType) where.bookingType = bookingType;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: true,
        primaryGuest: true,
        admin: { select: { name: true, username: true } },
        branch: { select: { name: true } },
        additionalGuests: { include: { guest: true } },
        shift: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    const formattedBookings = bookings.map(b => ({
      ...b,
      isOverstay: b.status === 'active' && new Date(b.checkOutExpected) < now
    }));

    res.json({ success: true, data: formattedBookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/bookings - Yangi bron (Check-in)
router.post('/', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const {
      roomId, checkIn, checkOutExpected, totalPrice, notes, shiftId,
      primaryGuest, additionalGuests, payments, bookingType // daily or monthly
    } = req.body;

    // Xonani tekshirish
    const room = await prisma.room.findUnique({ where: { id: parseInt(roomId) } });
    if (!room) return res.status(404).json({ success: false, message: 'Xona topilmadi.' });
    if (room.status === 'occupied') return res.status(400).json({ success: false, message: 'Bu xona allaqachon band.' });

    // Asosiy mehmonni yaratish
    const createdGuest = await prisma.guest.create({
      data: {
        companyId: req.user.companyId,
        firstName: primaryGuest.firstName,
        lastName: primaryGuest.lastName,
        phone: primaryGuest.phone || null,
        passportNumber: primaryGuest.passportNumber || null,
        nationality: primaryGuest.nationality || 'UZ',
      },
    });

    // Smena turini aniqlash
    const checkInTime = new Date(checkIn);
    const hour = checkInTime.getHours();
    const shiftType = (hour >= 8 && hour < 19) ? 'morning' : 'night';

    // Calculate total paid amount and determine primary payment method
    let totalPaid = 0;
    let mainPaymentMethod = 'cash';
    if (payments && payments.length > 0) {
      totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      mainPaymentMethod = payments.length > 1 ? 'mixed' : payments[0].method;
    }

    // Bronni yaratish
    const booking = await prisma.booking.create({
      data: {
        companyId: req.user.companyId,
        branchId: req.user.branchId || parseInt(room.branchId),
        roomId: parseInt(roomId),
        primaryGuestId: createdGuest.id,
        adminId: req.user.id,
        shiftId: shiftId ? parseInt(shiftId) : null,
        checkIn: new Date(checkIn),
        checkOutExpected: new Date(checkOutExpected),
        totalPrice: parseFloat(totalPrice),
        paidAmount: totalPaid,
        paymentMethod: mainPaymentMethod,
        shiftType,
        notes,
        bookingType: bookingType || 'daily'
      },
    });

    // Payments yozish
    if (payments && payments.length > 0) {
      for (const p of payments) {
        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: parseFloat(p.amount),
            method: p.method
          }
        });
      }
    }

    // Qo'shimcha mehmonlarni qo'shish
    if (additionalGuests && additionalGuests.length > 0) {
      for (const guestData of additionalGuests) {
        const addGuest = await prisma.guest.create({
          data: {
            companyId: req.user.companyId,
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            phone: guestData.phone || null,
            passportNumber: guestData.passportNumber || null,
          },
        });
        await prisma.bookingGuest.create({
          data: { bookingId: booking.id, guestId: addGuest.id },
        });
      }
    }

    // Xona holatini "occupied" ga o'zgartirish
    await prisma.room.update({
      where: { id: parseInt(roomId) },
      data: { status: 'occupied' },
    });

    // Smenaga tushum qo'shish
    if (shiftId && totalPaid > 0) {
      await prisma.shift.update({
        where: { id: parseInt(shiftId) },
        data: {
          totalIncome: { increment: totalPaid },
          totalBookings: { increment: 1 },
        },
      });
    } else if (shiftId) {
      await prisma.shift.update({
        where: { id: parseInt(shiftId) },
        data: {
          totalBookings: { increment: 1 },
        },
      });
    }

    // Real vaqtda yangilash
    const branchId = req.user.branchId || room.branchId;
    req.io.to(`branch-${branchId}`).emit('booking-created', { roomId: parseInt(roomId), booking });
    req.io.to(`branch-${branchId}`).emit('room-status-changed', { roomId: parseInt(roomId), status: 'occupied' });

    const fullBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { room: true, primaryGuest: true, additionalGuests: { include: { guest: true } }, payments: true },
    });

    res.status(201).json({ success: true, data: fullBooking, message: 'Mehmon muvaffaqiyatli ro\'yxatga olindi!' });
  } catch (error) {
    console.error('Booking create error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/bookings/:id/payments - Add extra payments
router.post('/:id/payments', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { amount, method } = req.body;
    
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ success: false, message: 'Bron topilmadi' });

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount: parseFloat(amount),
        method
      }
    });

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paidAmount: { increment: parseFloat(amount) },
        paymentMethod: booking.paidAmount > 0 && booking.paymentMethod !== method ? 'mixed' : method
      }
    });

    // Update shift income
    if (booking.shiftId) {
      await prisma.shift.update({
        where: { id: booking.shiftId },
        data: { totalIncome: { increment: parseFloat(amount) } },
      });
    }

    res.json({ success: true, data: { payment, booking: updatedBooking }, message: "To'lov qabul qilindi" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/bookings/:id/extend - Muddatni uzaytirish
router.post('/:id/extend', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { newCheckOutDate, additionalPrice, paymentAmount, paymentMethod, shiftId } = req.body;
    
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ success: false, message: 'Bron topilmadi' });

    // Payment if any
    let addedPaid = 0;
    if (paymentAmount && parseFloat(paymentAmount) > 0) {
      addedPaid = parseFloat(paymentAmount);
      await prisma.payment.create({
        data: { bookingId, amount: addedPaid, method: paymentMethod || 'cash' }
      });
      
      if (shiftId) {
        await prisma.shift.update({
          where: { id: parseInt(shiftId) },
          data: { totalIncome: { increment: addedPaid } }
        });
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        checkOutExpected: new Date(newCheckOutDate),
        totalPrice: { increment: parseFloat(additionalPrice) || 0 },
        paidAmount: { increment: addedPaid },
      }
    });

    res.json({ success: true, data: updatedBooking, message: "Muddat uzaytirildi" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/bookings/:id/guests - Add companion
router.post('/:id/guests', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { firstName, lastName, phone, passportNumber } = req.body;

    const guest = await prisma.guest.create({
      data: {
        companyId: req.user.companyId,
        firstName, lastName, phone, passportNumber
      }
    });

    await prisma.bookingGuest.create({
      data: { bookingId, guestId: guest.id }
    });

    res.json({ success: true, message: "Hamroh qo'shildi" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/bookings/:id/transfer - Xonani almashtirish
router.put('/:id/transfer', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { newRoomId, additionalPrice } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, companyId: req.user.companyId }
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Bron topilmadi.' });

    const newRoom = await prisma.room.findUnique({ where: { id: parseInt(newRoomId) } });
    if (!newRoom || newRoom.status === 'occupied') {
      return res.status(400).json({ success: false, message: "Tanlangan xona band yoki mavjud emas." });
    }

    // Eski xonani tozalashga o'tkazish
    await prisma.room.update({
      where: { id: booking.roomId },
      data: { status: 'cleaning' }
    });

    // Yangi xonani band qilish
    await prisma.room.update({
      where: { id: parseInt(newRoomId) },
      data: { status: 'occupied' }
    });

    // Booking ni yangilash
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        roomId: parseInt(newRoomId),
        totalPrice: { increment: parseFloat(additionalPrice || 0) }
      }
    });

    req.io.to(`branch-${booking.branchId}`).emit('room-status-changed', { roomId: booking.roomId, status: 'cleaning' });
    req.io.to(`branch-${booking.branchId}`).emit('room-status-changed', { roomId: parseInt(newRoomId), status: 'occupied' });

    res.json({ success: true, data: updatedBooking, message: "Xona muvaffaqiyatli almashtirildi!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/bookings/:id/checkout - Check-out
router.put('/:id/checkout', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, companyId: req.user.companyId },
      include: { room: true },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Bron topilmadi.' });

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'checked_out',
        checkOutActual: new Date(),
      },
    });

    // Xonani "cleaning" holatiga o'tkazish
    await prisma.room.update({
      where: { id: booking.roomId },
      data: { status: 'cleaning' },
    });

    req.io.to(`branch-${booking.branchId}`).emit('booking-checked-out', { bookingId, roomId: booking.roomId });
    req.io.to(`branch-${booking.branchId}`).emit('room-status-changed', { roomId: booking.roomId, status: 'cleaning' });

    res.json({ success: true, data: updatedBooking, message: 'Mehmon muvaffaqiyatli chiqdi!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// GET /api/bookings/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id), companyId: req.user.companyId },
      include: {
        room: true,
        primaryGuest: true,
        admin: { select: { name: true, username: true } },
        branch: { select: { name: true } },
        additionalGuests: { include: { guest: true } },
        shift: true,
        payments: true
      },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Bron topilmadi.' });
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/bookings/:id/extend - Extend stay
router.put('/:id/extend', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { newCheckOutExpected, additionalPrice } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, companyId: req.user.companyId },
      include: { room: true },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Bron topilmadi.' });
    if (booking.status !== 'active') return res.status(400).json({ success: false, message: 'Faqat faol bronlarni uzaytirish mumkin.' });

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        checkOutExpected: new Date(newCheckOutExpected),
        totalPrice: { increment: parseFloat(additionalPrice || 0) },
      },
    });

    req.io.to(`branch-${booking.branchId}`).emit('booking-extended', { bookingId, updatedBooking });

    res.json({ success: true, data: updatedBooking, message: 'Mehmon vaqti muvaffaqiyatli uzaytirildi!' });
  } catch (error) {
    console.error('Extend booking error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

module.exports = router;
