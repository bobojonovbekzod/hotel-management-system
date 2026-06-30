const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`DELETE FROM expenses;`;
  console.log('Expenses deleted');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
