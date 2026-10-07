const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- FINDING ADMIN AND SHIFT (Task 1) ---");
  const branch = await prisma.branch.findFirst({ where: { name: { contains: 'TTZ', mode: 'insensitive' } } });
  console.log("Branch:", branch?.id, branch?.name);

  const admin = await prisma.user.findFirst({ where: { name: { contains: 'Azizbek', mode: 'insensitive' } } });
  console.log("Admin:", admin?.id, admin?.name);

  if (branch && admin) {
    const shifts = await prisma.shift.findMany({
      where: {
        branchId: branch.id,
        adminId: admin.id,
        startTime: {
          gte: new Date('2026-09-09T00:00:00Z'),
          lt: new Date('2026-09-10T00:00:00Z')
        }
      }
    });
    console.log("Shifts on 09.09:", shifts);
  }

  const category = await prisma.expenseCategory.findFirst({ where: { name: { contains: 'Remont', mode: 'insensitive' } } });
  console.log("Remont category:", category?.id, category?.name);

  if (!category) {
    const anyCat = await prisma.expenseCategory.findFirst();
    console.log("Any category:", anyCat?.id, anyCat?.name);
  }

  console.log("\n--- FINDING BOOKING AND PAYMENT (Task 2) ---");
  const guest = await prisma.guest.findFirst({ where: { firstName: { contains: 'Qaxramon', mode: 'insensitive' }, lastName: { contains: 'Sattarov', mode: 'insensitive' } } });
  console.log("Guest:", guest?.id, guest?.firstName, guest?.lastName);

  if (guest && branch) {
    const bookings = await prisma.booking.findMany({
      where: {
        primaryGuestId: guest.id,
        branchId: branch.id,
      },
      include: {
        room: true,
        payments: true
      }
    });
    console.log("Bookings for Guest:", JSON.stringify(bookings, null, 2));
  }

  const openShift = await prisma.shift.findFirst({
    where: {
      branchId: branch.id,
      status: 'active'
    }
  });
  console.log("Active shift:", openShift?.id);

}

main().catch(console.error).finally(() => prisma.$disconnect());
