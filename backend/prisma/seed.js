const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Database seeding boshlanmoqda...');

  // Filiallar yaratish - ID ni avval bilib olamiz
  const branch1 = await prisma.branch.upsert({
    where: { id: 1 },
    update: { name: 'Filial #1 - Chilonzor' },
    create: { name: 'Filial #1 - Chilonzor', address: 'Chilonzor tumani, Toshkent', phone: '+998712001001' },
  });
  const branch2 = await prisma.branch.upsert({
    where: { id: 2 },
    update: { name: 'Filial #2 - Yunusobod' },
    create: { name: 'Filial #2 - Yunusobod', address: 'Yunusobod tumani, Toshkent', phone: '+998712002002' },
  });
  const branch3 = await prisma.branch.upsert({
    where: { id: 3 },
    update: { name: 'Filial #3 - Mirzo Ulugbek' },
    create: { name: 'Filial #3 - Mirzo Ulugbek', address: 'Mirzo Ulugbek tumani, Toshkent', phone: '+998712003003' },
  });
  const branch4 = await prisma.branch.upsert({
    where: { id: 4 },
    update: { name: 'Filial #4 - Shayxontohur' },
    create: { name: 'Filial #4 - Shayxontohur', address: 'Shayxontohur tumani, Toshkent', phone: '+998712004004' },
  });
  const branch5 = await prisma.branch.upsert({
    where: { id: 5 },
    update: { name: 'Filial #5 - Sergeli' },
    create: { name: 'Filial #5 - Sergeli', address: 'Sergeli tumani, Toshkent', phone: '+998712005005' },
  });

  const branches = [branch1, branch2, branch3, branch4, branch5];
  console.log(`✅ ${branches.length} ta filial yaratildi`);

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Biznes egasi
  await prisma.user.upsert({
    where: { username: 'owner' },
    update: { name: 'Aziz Tursunov' },
    create: {
      name: 'Aziz Tursunov',
      username: 'owner',
      password: hashedPassword,
      role: 'owner',
      phone: '+998901234567',
    },
  });

  // Direktorlar
  await prisma.user.upsert({
    where: { username: 'director1' },
    update: {},
    create: {
      branchId: branch1.id,
      name: 'Bobur Yusupov',
      username: 'director1',
      password: hashedPassword,
      role: 'director',
      phone: '+998901234568',
      salary: 3500000,
    },
  });

  await prisma.user.upsert({
    where: { username: 'director2' },
    update: {},
    create: {
      branchId: branch2.id,
      name: 'Sardor Toshmatov',
      username: 'director2',
      password: hashedPassword,
      role: 'director',
      phone: '+998901234569',
      salary: 3500000,
    },
  });

  // Adminlar
  await prisma.user.upsert({
    where: { username: 'admin1' },
    update: {},
    create: {
      branchId: branch1.id,
      name: 'Malika Rahimova',
      username: 'admin1',
      password: hashedPassword,
      role: 'admin',
      phone: '+998901234570',
      salary: 2000000,
    },
  });

  await prisma.user.upsert({
    where: { username: 'admin2' },
    update: {},
    create: {
      branchId: branch1.id,
      name: 'Nilufar Hasanova',
      username: 'admin2',
      password: hashedPassword,
      role: 'admin',
      phone: '+998901234571',
      salary: 2000000,
    },
  });

  await prisma.user.upsert({
    where: { username: 'admin3' },
    update: {},
    create: {
      branchId: branch2.id,
      name: 'Kamola Mirzayeva',
      username: 'admin3',
      password: hashedPassword,
      role: 'admin',
      phone: '+998901234572',
      salary: 2000000,
    },
  });

  console.log('✅ Foydalanuvchilar yaratildi');

  // Xonalar yaratish — filial ID larini dinamik ishlatamiz
  const roomsData = [
    // Filial 1
    { branchId: branch1.id, roomNumber: '101', roomType: 'standard', floor: 1, capacity: 2, pricePerNight: 150000 },
    { branchId: branch1.id, roomNumber: '102', roomType: 'standard', floor: 1, capacity: 2, pricePerNight: 150000 },
    { branchId: branch1.id, roomNumber: '103', roomType: 'deluxe', floor: 1, capacity: 3, pricePerNight: 250000 },
    { branchId: branch1.id, roomNumber: '201', roomType: 'standard', floor: 2, capacity: 2, pricePerNight: 160000 },
    { branchId: branch1.id, roomNumber: '202', roomType: 'deluxe', floor: 2, capacity: 4, pricePerNight: 280000 },
    { branchId: branch1.id, roomNumber: '203', roomType: 'standard', floor: 2, capacity: 2, pricePerNight: 155000 },
    { branchId: branch1.id, roomNumber: '301', roomType: 'suite', floor: 3, capacity: 4, pricePerNight: 500000 },
    { branchId: branch1.id, roomNumber: '302', roomType: 'deluxe', floor: 3, capacity: 3, pricePerNight: 270000 },
    // Filial 2
    { branchId: branch2.id, roomNumber: '101', roomType: 'standard', floor: 1, capacity: 2, pricePerNight: 140000 },
    { branchId: branch2.id, roomNumber: '102', roomType: 'standard', floor: 1, capacity: 2, pricePerNight: 140000 },
    { branchId: branch2.id, roomNumber: '103', roomType: 'deluxe', floor: 1, capacity: 3, pricePerNight: 230000 },
    { branchId: branch2.id, roomNumber: '201', roomType: 'deluxe', floor: 2, capacity: 3, pricePerNight: 240000 },
    { branchId: branch2.id, roomNumber: '301', roomType: 'suite', floor: 3, capacity: 4, pricePerNight: 450000 },
    // Filial 3
    { branchId: branch3.id, roomNumber: '101', roomType: 'standard', floor: 1, capacity: 2, pricePerNight: 130000 },
    { branchId: branch3.id, roomNumber: '102', roomType: 'standard', floor: 1, capacity: 2, pricePerNight: 130000 },
    { branchId: branch3.id, roomNumber: '201', roomType: 'deluxe', floor: 2, capacity: 3, pricePerNight: 220000 },
    { branchId: branch3.id, roomNumber: '301', roomType: 'suite', floor: 3, capacity: 4, pricePerNight: 400000 },
  ];

  for (const room of roomsData) {
    await prisma.room.upsert({
      where: { branchId_roomNumber: { branchId: room.branchId, roomNumber: room.roomNumber } },
      update: {},
      create: room,
    });
  }

  console.log(`✅ ${roomsData.length} ta xona yaratildi`);

  // --- FAKE DATA SEEDING ---
  console.log('⏳ Fake ma\'lumotlar yozilmoqda...');

  // Find users
  const admins = await prisma.user.findMany({ where: { role: 'admin' } });
  const guests = [];

  // Create 10 fake guests
  for (let i = 1; i <= 10; i++) {
    const g = await prisma.guest.create({
      data: {
        firstName: `Mehmon ${i}`,
        lastName: `Familiyasi ${i}`,
        phone: `+99890111223${i % 10}`,
        passportNumber: `AA${1000000 + i}`,
      }
    });
    guests.push(g);
  }

  // Categories and Payment methods
  const paymentMethods = ['cash', 'terminal', 'qrcode'];
  const expenseCategories = ['food', 'cleaning', 'repair', 'utilities', 'other'];

  const now = new Date();

  // For each admin, create a closed shift and some bookings + expenses
  for (const admin of admins) {
    const shiftStart = new Date(now);
    shiftStart.setDate(now.getDate() - 2);
    shiftStart.setHours(8, 0, 0, 0);

    const shiftEnd = new Date(now);
    shiftEnd.setDate(now.getDate() - 2);
    shiftEnd.setHours(20, 0, 0, 0);

    const shift = await prisma.shift.create({
      data: {
        branchId: admin.branchId,
        adminId: admin.id,
        shiftType: 'morning',
        startTime: shiftStart,
        endTime: shiftEnd,
        status: 'closed',
        totalIncome: 0,
        totalBookings: 0,
      }
    });

    let shiftIncome = 0;
    let shiftBookings = 0;

    // Create 3 fake bookings for this shift
    const adminRooms = await prisma.room.findMany({ where: { branchId: admin.branchId }, take: 3 });
    for (let i = 0; i < adminRooms.length; i++) {
      const room = adminRooms[i];
      const guest = guests[Math.floor(Math.random() * guests.length)];
      const price = room.pricePerNight * (Math.floor(Math.random() * 3) + 1);
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      const bIn = new Date(shiftStart);
      bIn.setHours(bIn.getHours() + i + 1);
      const bOut = new Date(bIn);
      bOut.setDate(bOut.getDate() + 1);

      await prisma.booking.create({
        data: {
          branchId: admin.branchId,
          roomId: room.id,
          primaryGuestId: guest.id,
          adminId: admin.id,
          shiftId: shift.id,
          checkIn: bIn,
          checkOutExpected: bOut,
          checkOutActual: bOut,
          totalPrice: price,
          paidAmount: price,
          paymentMethod: paymentMethod,
          status: 'checked_out',
          shiftType: 'morning',
        }
      });

      shiftIncome += price;
      shiftBookings++;
    }

    // Update shift totals
    await prisma.shift.update({
      where: { id: shift.id },
      data: { totalIncome: shiftIncome, totalBookings: shiftBookings }
    });

    // Create 2 fake expenses
    for (let i = 0; i < 2; i++) {
      await prisma.expense.create({
        data: {
          branchId: admin.branchId,
          adminId: admin.id,
          shiftId: shift.id,
          category: expenseCategories[Math.floor(Math.random() * expenseCategories.length)],
          amount: (Math.floor(Math.random() * 5) + 1) * 5000, // 5,000 dan 25,000 gacha arzimagan xarajat
          description: `Fake xarajat ${i + 1}`,
          expenseDate: new Date(shiftStart.getTime() + (i * 3600000)),
        }
      });
    }
  }

  console.log(`✅ Fake data (mehmonlar, smenalar, bronlar, xarajatlar) yaratildi`);

  console.log('\n🎉 Seeding muvaffaqiyatli yakunlandi!');
  console.log('\n📋 Login ma\'lumotlari (barcha parol: admin123):');
  console.log('  👑 Biznes egasi: owner');
  console.log('  🏢 Direktor 1:   director1  (Filial #1 - Chilonzor)');
  console.log('  🏢 Direktor 2:   director2  (Filial #2 - Yunusobod)');
  console.log('  👩‍💼 Admin 1:      admin1     (Filial #1)');
  console.log('  👩‍💼 Admin 2:      admin2     (Filial #1)');
  console.log('  👩‍💼 Admin 3:      admin3     (Filial #2)');
}

main()
  .catch((e) => {
    console.error('❌ Seed xatosi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
