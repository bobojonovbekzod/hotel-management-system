const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  console.log('Companies:', companies.map(c => ({ id: c.id, name: c.name })));
  
  const categories = await prisma.expenseCategory.findMany();
  console.log('Categories:', categories);
  
  const users = await prisma.user.findMany({ select: { id: true, username: true, companyId: true, role: true }});
  console.log('Users:', users);
}

main().finally(() => prisma.$disconnect());
