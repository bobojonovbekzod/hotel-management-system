const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRoleEnum() {
  console.log('=== FIXING LOCAL POSTGRESQL ENUM ROLE TO INCLUDE OPERATOR ===');
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'operator';`);
    console.log('✅ Successfully added operator to PostgreSQL Role enum!');
  } catch (err) {
    console.log('Enum alter note:', err.message);
  }
}

fixRoleEnum()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
