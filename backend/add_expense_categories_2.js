const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companyId = 2; // User's test company

  const categories = [
    'Oziq ovqat',
    'Tozalik vositalari',
    'Telekommunikatsiya',
    'Remont',
    "Kommunal to'lovlar",
    'Boshqa xarajatlar'
  ];

  for (const name of categories) {
    // Check if exists
    const exists = await prisma.expenseCategory.findFirst({
      where: { name, companyId }
    });
    
    if (!exists) {
      await prisma.expenseCategory.create({
        data: { name, companyId }
      });
      console.log(`Created for company 2: ${name}`);
    } else {
      console.log(`Already exists for company 2: ${name}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
