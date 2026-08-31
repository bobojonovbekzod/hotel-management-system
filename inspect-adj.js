const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectDbAdjustments() {
  try {
    await ssh.connect({
      host: '138.249.7.136',
      username: 'root',
      password: 'U4NIKO7rcFmf$qpt',
      readyTimeout: 15000
    });

    const script = `
const { PrismaClient } = require('/root/hotel-management-system/backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== 1. SAMARQAND 26.08.2026 OZODJON XASANOV ===");
  const samarqand = await prisma.branch.findFirst({ where: { name: { contains: 'Samarqand', mode: 'insensitive' } } });
  
  const b1 = await prisma.booking.findMany({
    where: {
      branchId: samarqand.id,
      primaryGuest: {
        OR: [
          { firstName: { contains: 'Ozodjon', mode: 'insensitive' } },
          { lastName: { contains: 'Xasanov', mode: 'insensitive' } }
        ]
      }
    },
    include: { primaryGuest: true, room: true, payments: true }
  });
  console.log("Bookings 1 (Ozodjon):", JSON.stringify(b1, null, 2));

  console.log("\n=== 2. PARKENTSKIY 17.08.2026 (BEKZOD & ROOM 9) ===");
  const parkent = await prisma.branch.findFirst({ where: { name: { contains: 'Parkent', mode: 'insensitive' } } });
  const room9 = await prisma.room.findFirst({ where: { branchId: parkent.id, roomNumber: '9' } });
  console.log("Parkent Room 9:", room9);

  const bekzodUser = await prisma.user.findFirst({
    where: { name: { contains: 'Bekzod', mode: 'insensitive' } }
  });
  console.log("Bekzod User:", bekzodUser?.id, bekzodUser?.name);

  const parkentShift = await prisma.shift.findMany({
    where: {
      branchId: parkent.id,
      startTime: {
        gte: new Date('2026-08-16T00:00:00Z'),
        lte: new Date('2026-08-18T23:59:59Z')
      }
    },
    include: { user: true }
  });
  console.log("Parkent Shifts 16-18 Aug:", parkentShift.map(s => ({ id: s.id, user: s.user?.name, start: s.startTime, end: s.endTime })));

  console.log("\n=== 3. YUNUSOBOD 27.08.2026 SARVARBEK MURODOV ===");
  const yunusobod = await prisma.branch.findFirst({ where: { name: { contains: 'Yunusobod', mode: 'insensitive' } } });
  
  const b3 = await prisma.booking.findMany({
    where: {
      branchId: yunusobod.id,
      primaryGuest: {
        OR: [
          { firstName: { contains: 'Sarvarbek', mode: 'insensitive' } },
          { lastName: { contains: 'Murodov', mode: 'insensitive' } }
        ]
      }
    },
    include: { primaryGuest: true, room: true, payments: true }
  });
  console.log("Bookings 3 (Sarvarbek):", JSON.stringify(b3, null, 2));

  await prisma.$disconnect();
}

main().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
`;
    await ssh.execCommand(`cat << 'EOF' > /tmp/inspect_adj.js\n${script}\nEOF`);
    const res = await ssh.execCommand('node /tmp/inspect_adj.js', { cwd: '/root/hotel-management-system/backend' });
    console.log("=== STDOUT ===");
    console.log(res.stdout);
    console.log("=== STDERR ===");
    console.log(res.stderr);

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}

inspectDbAdjustments();
