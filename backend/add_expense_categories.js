const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get first company id
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log("No company found.");
    return;
  }
  const companyId = company.id;

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
      console.log(`Created: ${name}`);
    } else {
      console.log(`Already exists: ${name}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
