const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/bookings - Bronlar ro'yxati
router.get('/', authenticate, async (req, res) => {
  try {
    const { branchId, status, date, bookingType, overdue } = req.query;
    
    const where = { companyId: req.user.companyId };
    if (req.user.role === 'admin' || req.user.role === 'director') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = parseInt(branchId);
    }
    if (status) where.status = status;
    if (bookingType) where.bookingType = bookingType;
    if (overdue === 'true') {
      where.checkOutExpected = { lt: new Date() };
    }
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
      primaryGuest, additionalGuests, payments, bookingType, monthlyFee, rentEntireRoom
    } = req.body;

    if (req.user.role === 'admin' && !shiftId) {
      return res.status(403).json({ success: false, message: 'Avval smena boshlang!' });
    }

    // Xonani tekshirish
    const room = await prisma.room.findUnique({ where: { id: parseInt(roomId) } });
    if (!room) return res.status(404).json({ success: false, message: 'Xona topilmadi.' });

    // Active bronlar sonini tekshirish
    const activeCount = await prisma.booking.count({
      where: { roomId: parseInt(roomId), status: 'active' }
    });

    const isHostelBooking = bookingType === 'hostel';

    if (isHostelBooking) {
      if (room.status === 'maintenance') {
        return res.status(400).json({ success: false, message: 'Bu xona ta\'mirlashda.' });
      }
      if (activeCount >= room.capacity) {
        return res.status(400).json({ success: false, message: 'Bu xonada boshqa bo\'sh o\'rin yo\'q.' });
      }
    } else {
      if (room.status === 'occupied' || room.status === 'cleaning' || room.status === 'maintenance') {
        return res.status(400).json({ success: false, message: 'Bu xona band yoki tozalashda.' });
      }
    }

    // Telefon yoki pasport bo'yicha mehmonning hozirda faol broni borligini tekshirish
    const phoneClean = (primaryGuest?.phone || '').trim();
    const passportClean = (primaryGuest?.passportNumber || '').trim();

    const guestFilter = [];
    const phoneDigits = phoneClean.replace(/\D/g, '');
    if (phoneDigits.length >= 7) {
      const searchPart = phoneDigits.slice(-7);
      guestFilter.push({ phone: { contains: searchPart } });
    }
    if (passportClean.length >= 4) {
      guestFilter.push({ passportNumber: { equals: passportClean, mode: 'insensitive' } });
    }

    if (guestFilter.length > 0 && !req.body.forceDuplicate) {
      const activeBooking = await prisma.booking.findFirst({
        where: {
          companyId: req.user.companyId,
          status: 'active',
          primaryGuest: { OR: guestFilter }
        },
        include: {
          room: true,
          branch: true,
          primaryGuest: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (activeBooking) {
        const debt = activeBooking.totalPrice - activeBooking.paidAmount;
        return res.status(400).json({
          success: false,
          hasActiveBooking: true,
          activeBookingId: activeBooking.id,
          activeRoomNumber: activeBooking.room?.roomNumber,
          message: `Diqqat! Ushbu mehmon (${activeBooking.primaryGuest.firstName} ${activeBooking.primaryGuest.lastName}) hozirda ${activeBooking.room?.roomNumber}-xonada joylashgan (Status: Faol${debt > 0 ? `, Qarz: ${debt.toLocaleString()} so'm` : ''}). Agar to'lov yoki qarzni yopish bo'lsa, yangi xonaga bron ochmang — mavjud ${activeBooking.room?.roomNumber}-xona broniga "To'lov qo'shish" qiling!`
        });
      }
    }

    // Mehmonni topish yoki yaratish
    let createdGuest = null;
    if (guestFilter.length > 0) {
      createdGuest = await prisma.guest.findFirst({
        where: {
          companyId: req.user.companyId,
          OR: guestFilter
        }
      });
    }

    if (!createdGuest) {
      createdGuest = await prisma.guest.create({
        data: {
          companyId: req.user.companyId,
          firstName: primaryGuest.firstName,
          lastName: primaryGuest.lastName,
          phone: primaryGuest.phone || null,
          passportNumber: primaryGuest.passportNumber || null,
          nationality: primaryGuest.nationality || 'UZ',
        },
      });
    } else {
      createdGuest = await prisma.guest.update({
        where: { id: createdGuest.id },
        data: {
          firstName: primaryGuest.firstName || createdGuest.firstName,
          lastName: primaryGuest.lastName || createdGuest.lastName,
          phone: primaryGuest.phone || createdGuest.phone,
          passportNumber: primaryGuest.passportNumber || createdGuest.passportNumber,
          nationality: primaryGuest.nationality || createdGuest.nationality,
        }
      });
    }

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
        monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null,
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
            method: p.method,
            shiftId: shiftId ? parseInt(shiftId) : null,
            periodStart: p.periodStart ? new Date(p.periodStart) : null,
            periodEnd: p.periodEnd ? new Date(p.periodEnd) : null,
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
          data: { 
            bookingId: booking.id, 
            guestId: addGuest.id,
            relation: guestData.relation || null
          },
        });
      }
    }


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

    // Xona holatini yangilash (Hybrid mantiq)
    const isNowOccupied = rentEntireRoom || (activeCount + 1 >= room.capacity);
    const newRoomStatus = isNowOccupied ? 'occupied' : 'available';

    if (newRoomStatus !== room.status) {
      await prisma.room.update({
        where: { id: parseInt(roomId) },
        data: { status: newRoomStatus }
      });
    }

    // Real vaqtda yangilash
    const branchId = req.user.branchId || room.branchId;
    req.io.to(`branch-${branchId}`).emit('booking-created', { roomId: parseInt(roomId), booking });
    req.io.to(`branch-${branchId}`).emit('room-status-changed', { roomId: parseInt(roomId), status: newRoomStatus });

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

// POST /api/bookings/reserve - Oldindan bron qilish
router.post('/reserve', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const { roomId, firstName, lastName, phone, passportNumber, checkIn, checkOutExpected, totalPrice, advanceAmount, paymentMethod, shiftId } = req.body;
    
    // Telefon yoki pasport bo'yicha mehmonning hozirda faol broni borligini tekshirish
    const phoneClean = (phone || '').trim();
    const passportClean = (passportNumber || '').trim();

    const guestFilter = [];
    const phoneDigits = phoneClean.replace(/\D/g, '');
    if (phoneDigits.length >= 7) {
      const searchPart = phoneDigits.slice(-7);
      guestFilter.push({ phone: { contains: searchPart } });
    }
    if (passportClean.length >= 4) {
      guestFilter.push({ passportNumber: { equals: passportClean, mode: 'insensitive' } });
    }

    if (guestFilter.length > 0 && !req.body.forceDuplicate) {
      const activeBooking = await prisma.booking.findFirst({
        where: {
          companyId: req.user.companyId,
          status: 'active',
          primaryGuest: { OR: guestFilter }
        },
        include: { room: true, primaryGuest: true }
      });

      if (activeBooking) {
        const debt = activeBooking.totalPrice - activeBooking.paidAmount;
        return res.status(400).json({
          success: false,
          hasActiveBooking: true,
          activeBookingId: activeBooking.id,
          activeRoomNumber: activeBooking.room?.roomNumber,
          message: `Diqqat! Ushbu mehmon (${activeBooking.primaryGuest.firstName} ${activeBooking.primaryGuest.lastName}) hozirda ${activeBooking.room?.roomNumber}-xonada joylashgan (Status: Faol${debt > 0 ? `, Qarz: ${debt.toLocaleString()} so'm` : ''}). Agar to'lov bo'lsa, yangi bron ochmang — mavjud ${activeBooking.room?.roomNumber}-xona broniga "To'lov qo'shish" qiling!`
        });
      }
    }

    let guest = null;
    if (guestFilter.length > 0) {
      guest = await prisma.guest.findFirst({
        where: { companyId: req.user.companyId, OR: guestFilter }
      });
    }

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          companyId: req.user.companyId,
          firstName,
          lastName,
          phone: phone || null,
          passportNumber: passportNumber || null
        }
      });
    }

    const room = await prisma.room.findUnique({ where: { id: parseInt(roomId) } });
    
    const booking = await prisma.booking.create({
      data: {
        companyId: req.user.companyId,
        branchId: req.user.branchId || room.branchId,
        roomId: parseInt(roomId),
        primaryGuestId: guest.id,
        adminId: req.user.id,
        shiftId: shiftId ? parseInt(shiftId) : null,
        checkIn: new Date(checkIn),
        checkOutExpected: new Date(checkOutExpected),
        totalPrice: parseFloat(totalPrice),
        paidAmount: parseFloat(advanceAmount),
        status: 'reserved',
        bookingType: 'daily',
        paymentMethod: parseFloat(advanceAmount) > 0 ? paymentMethod : null
      }
    });

    if (parseFloat(advanceAmount) > 0) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: parseFloat(advanceAmount),
          method: paymentMethod,
          shiftId: shiftId ? parseInt(shiftId) : (currentShiftId || null),
          type: 'advance'
        }
      });

      if (shiftId || currentShiftId) {
        await prisma.shift.update({
          where: { id: parseInt(shiftId || currentShiftId) },
          data: { totalIncome: { increment: parseFloat(advanceAmount) } }
        });
      }
    }

    res.status(201).json({ success: true, data: booking, message: 'Xona muvaffaqiyatli bron qilindi!' });
  } catch (error) {
    console.error('Reserve error:', error);
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/bookings/:id/payments - Add extra payments
router.post('/:id/payments', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { amount, method, periodStart, periodEnd } = req.body;
    
    let currentShiftId = null;
    const activeShift = await prisma.shift.findFirst({ where: { adminId: req.user.id, status: 'active' } });
    if (activeShift) currentShiftId = activeShift.id;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ success: false, message: 'Bron topilmadi' });

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount: parseFloat(amount),
        method,
        shiftId: currentShiftId,
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
      }
    });

    const updateData = {
      paidAmount: { increment: parseFloat(amount) },
      paymentMethod: booking.paidAmount > 0 && booking.paymentMethod !== method ? 'mixed' : method
    };

    if (periodEnd && booking.bookingType === 'monthly') {
      // Agar oylik ijara bo'lsa va to'lov qilingan davr oxiri bo'lsa, checkOutExpected ni suramiz
      // Avvalroq to'langan davrdan uzoqroq bo'lsa almashtiramiz
      const newEndDate = new Date(periodEnd);
      if (!booking.checkOutExpected || newEndDate > booking.checkOutExpected) {
        updateData.checkOutExpected = newEndDate;
        
        // Agar muddat uzaytirilayotgan bo'lsa, totalPrice ni oylik to'lov summasiga (yoki to'langan summaga) ko'paytiramiz
        // Bu ijarachini qarzini to'g'ri hisoblash uchun kerak.
        // Aslida ijarachi qancha to'lashidan qat'iy nazar oylik tarif qo'shilishi kerak, lekin hozircha amount ni qo'shamiz
        // Yoki eng yaxshisi booking.monthlyFee ni qo'shishdir. Agar admin shunchaki qarzini to'layotgan bo'lsa periodEnd jo'natmasligi kerak.
        // Hozirgi dizaynda agar periodEnd jo'natilsa, yangi oyga to'lov qilyapti deb hisoblanib totalPrice oshadi
        if (booking.monthlyFee) {
           updateData.totalPrice = { increment: booking.monthlyFee };
        } else {
           updateData.totalPrice = { increment: parseFloat(amount) };
        }
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData
    });

    // Update shift income
    if (currentShiftId) {
      await prisma.shift.update({
        where: { id: currentShiftId },
        data: { totalIncome: { increment: parseFloat(amount) } },
      });
    }

    res.json({ success: true, data: { payment, booking: updatedBooking }, message: "To'lov qabul qilindi" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/bookings/:id/penalty - Add penalty charge
router.post('/:id/penalty', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { amount, method, description } = req.body;
    
    let currentShiftId = null;
    const activeShift = await prisma.shift.findFirst({ where: { adminId: req.user.id, status: 'active' } });
    if (activeShift) currentShiftId = activeShift.id;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ success: false, message: 'Bron topilmadi' });

    // Jarima narxini umumiy narxga qo'shamiz va payment qilamiz
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount: parseFloat(amount),
        method,
        shiftId: currentShiftId,
        type: 'penalty',
        description
      }
    });

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        totalPrice: { increment: parseFloat(amount) },
        paidAmount: { increment: parseFloat(amount) }
      }
    });

    // Update shift penalty income
    if (currentShiftId) {
      await prisma.shift.update({
        where: { id: currentShiftId },
        data: { 
          totalIncome: { increment: parseFloat(amount) },
          totalPenalties: { increment: parseFloat(amount) }
        },
      });
    }

    res.json({ success: true, data: updatedBooking, message: "Jarima qabul qilindi" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// POST /api/bookings/:id/extend - Muddatni uzaytirish
router.post('/:id/extend', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { newCheckOutDate, additionalPrice, paymentAmount, paymentMethod } = req.body;
    
    let currentShiftId = null;
    const activeShift = await prisma.shift.findFirst({ where: { adminId: req.user.id, status: 'active' } });
    if (activeShift) currentShiftId = activeShift.id;

    if (req.user.role === 'admin' && !currentShiftId) {
      return res.status(403).json({ success: false, message: 'Avval smena boshlang!' });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ success: false, message: 'Bron topilmadi' });

    // Payment if any
    let addedPaid = 0;
    if (paymentAmount && parseFloat(paymentAmount) > 0) {
      addedPaid = parseFloat(paymentAmount);
      await prisma.payment.create({
        data: { bookingId, amount: addedPaid, method: paymentMethod || 'cash', shiftId: currentShiftId }
      });
      
      if (currentShiftId) {
        await prisma.shift.update({
          where: { id: currentShiftId },
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

// DELETE /api/bookings/:id/guests/:guestId - Remove companion
router.delete('/:id/guests/:guestId', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const guestId = parseInt(req.params.guestId);

    await prisma.bookingGuest.deleteMany({
      where: {
        bookingId: bookingId,
        guestId: guestId
      }
    });

    res.json({ success: true, message: "Hamroh o'chirildi" });
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
      where: { id: bookingId, companyId: req.user.companyId },
      include: { additionalGuests: true }
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

    // Yangi xonadagi mehmonlar va o'rinlar sonini aniqlash
    const currentGuestsCount = 1 + (booking.additionalGuests ? booking.additionalGuests.length : 0);
    const activeBookingsInNewRoom = await prisma.booking.findMany({
      where: { roomId: parseInt(newRoomId), status: 'active', id: { not: bookingId } },
      include: { additionalGuests: true }
    });

    const existingGuestsCount = activeBookingsInNewRoom.reduce((sum, b) => sum + 1 + (b.additionalGuests ? b.additionalGuests.length : 0), 0);
    const totalGuestsInNewRoom = existingGuestsCount + currentGuestsCount;

    // Agar kunlik bron bo'lsa yoki barcha o'rinlar to'lsa — occupied qilamiz
    const isNowOccupied = booking.bookingType !== 'hostel' || (totalGuestsInNewRoom >= newRoom.capacity);
    const newRoomStatus = isNowOccupied ? 'occupied' : 'available';

    // Yangi xonani holatini yangilash
    await prisma.room.update({
      where: { id: parseInt(newRoomId) },
      data: { status: newRoomStatus }
    });

    const extraAmount = parseFloat(additionalPrice || 0);

    // Booking ni yangilash
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        roomId: parseInt(newRoomId),
        totalPrice: { increment: extraAmount },
        paidAmount: { increment: extraAmount }
      }
    });

    if (extraAmount > 0) {
      let activeShiftId = req.body.shiftId ? parseInt(req.body.shiftId) : null;
      if (!activeShiftId) {
        const activeShift = await prisma.shift.findFirst({
          where: { branchId: booking.branchId, status: 'active' }
        });
        activeShiftId = activeShift ? activeShift.id : booking.shiftId;
      }

      await prisma.payment.create({
        data: {
          bookingId,
          amount: extraAmount,
          method: req.body.paymentMethod || 'cash',
          shiftId: activeShiftId || null,
          description: "Xona almashtirish qo'shimcha to'lovi"
        }
      });

      if (activeShiftId) {
        await prisma.shift.update({
          where: { id: activeShiftId },
          data: { totalIncome: { increment: extraAmount } }
        });
      }
    }

    req.io.to(`branch-${booking.branchId}`).emit('room-status-changed', { roomId: booking.roomId, status: 'cleaning' });
    req.io.to(`branch-${booking.branchId}`).emit('room-status-changed', { roomId: parseInt(newRoomId), status: newRoomStatus });

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

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) return res.status(404).json({ success: false, message: 'Bron topilmadi.' });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' }
    });

    if (booking.status === 'active') {
      const remainingCount = await prisma.booking.count({
        where: { roomId: booking.roomId, status: 'active', id: { not: bookingId } }
      });

      const room = await prisma.room.findUnique({ where: { id: booking.roomId } });
      let newStatus = 'available';
      if (remainingCount > 0 && remainingCount < room.capacity) {
        newStatus = 'available'; // If partially occupied but not full, it's available
      } else if (remainingCount >= room.capacity) {
        newStatus = 'occupied';
      }

      await prisma.room.update({
        where: { id: booking.roomId },
        data: { status: newStatus }
      });
      const branchId = req.user.branchId || booking.branchId;
      req.io.to(`branch-${branchId}`).emit('booking-checked-out', { roomId: booking.roomId });
      req.io.to(`branch-${branchId}`).emit('room-status-changed', { roomId: booking.roomId, status: newStatus });
    }

    res.json({ success: true, message: "Bron bekor qilindi" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi.' });
  }
});

// PUT /api/bookings/:id/confirm-reservation
router.put('/:id/confirm-reservation', authenticate, authorize('admin', 'director', 'owner'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking || booking.status !== 'reserved') {
      return res.status(404).json({ success: false, message: 'Kutishdagi bron topilmadi.' });
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'active', checkIn: new Date() } // update check-in to real check-in
    });

    // Xona holatini aniqlash (Hybrid)
    const room = await prisma.room.findUnique({ where: { id: booking.roomId } });
    const activeCount = await prisma.booking.count({
      where: { roomId: booking.roomId, status: 'active' }
    });

    // Check if it should be occupied or available
    // NOTE: Confirm-reservation is for reserved -> active. For now, we just lock the room.
    // If it's a hostel mode reservation, we should ideally check rentEntireRoom, but that's complex for reservations.
    // We'll set it to occupied if capacity is met.
    const newStatus = (activeCount >= room.capacity) ? 'occupied' : 'available';

    await prisma.room.update({
      where: { id: booking.roomId },
      data: { status: newStatus }
    });

    const branchId = req.user.branchId || booking.branchId;
    req.io.to(`branch-${branchId}`).emit('booking-created', { roomId: booking.roomId, booking });
    req.io.to(`branch-${branchId}`).emit('room-status-changed', { roomId: booking.roomId, status: newStatus });

    res.json({ success: true, message: "Mehmon xonaga kiritildi!" });
  } catch (error) {
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
    const { newCheckOutExpected, additionalPrice, additionalPayment, paymentMethod } = req.body;

    let currentShiftId = null;
    const activeShift = await prisma.shift.findFirst({ where: { adminId: req.user.id, status: 'active' } });
    if (activeShift) currentShiftId = activeShift.id;

    if (req.user.role === 'admin' && !currentShiftId) {
      return res.status(403).json({ success: false, message: 'Avval smena boshlang!' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, companyId: req.user.companyId },
      include: { room: true },
    });
    if (!booking) return res.status(404).json({ success: false, message: 'Bron topilmadi.' });
    if (booking.status !== 'active') return res.status(400).json({ success: false, message: 'Faqat faol bronlarni uzaytirish mumkin.' });

    const extraPayment = parseFloat(additionalPayment || 0);
    const extraPrice = parseFloat(additionalPrice || 0);

    if (extraPayment > 0) {
      await prisma.payment.create({
        data: {
          bookingId,
          amount: extraPayment,
          method: paymentMethod || 'cash',
          shiftId: currentShiftId || booking.shiftId,
          description: "Muddatni uzaytirish to'lovi"
        }
      });

      if (currentShiftId || booking.shiftId) {
        await prisma.shift.update({
          where: { id: currentShiftId || booking.shiftId },
          data: { totalIncome: { increment: extraPayment } }
        });
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        checkOutExpected: new Date(newCheckOutExpected),
        totalPrice: { increment: extraPrice },
        paidAmount: { increment: extraPayment }
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
