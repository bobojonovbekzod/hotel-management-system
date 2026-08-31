const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createLocalOperator() {
  console.log('=== CREATING LOCAL CALL OPERATOR USER FOR ZANGIOTA HOTEL ===');

  let company = await prisma.company.findFirst({});
  if (!company) {
    company = await prisma.company.create({
      data: { name: 'Test Hotel Group' }
    });
  }

  let branch = await prisma.branch.findFirst({});
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        companyId: company.id,
        name: 'Zangiota',
        address: 'Quyoshli, Zangiota tumani',
        phone: '+998901234567'
      }
    });
  } else {
    // Update branch name to Zangiota Test Hotel if branch exists
    branch = await prisma.branch.update({
      where: { id: branch.id },
      data: { name: 'Zangiota Test Hotel' }
    });
  }

  console.log('Using Branch:', branch.id, branch.name);

  const hashedPassword = await bcrypt.hash('operator123', 10);

  const operator = await prisma.user.upsert({
    where: { username: 'operator-zangiota' },
    update: {
      password: hashedPassword,
      role: 'operator',
      branchId: branch.id,
      companyId: company.id,
      name: 'Call Operator Zangiota',
      isActive: true
    },
    create: {
      username: 'operator-zangiota',
      password: hashedPassword,
      role: 'operator',
      branchId: branch.id,
      companyId: company.id,
      name: 'Call Operator Zangiota',
      phone: '+998900000000',
      isActive: true
    }
  });

  console.log('✅ Success! Local Call Operator created:');
  console.log('   Username:', operator.username);
  console.log('   Password: operator123');
  console.log('   Role:', operator.role);
  console.log('   Branch:', branch.name);
}

createLocalOperator()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
