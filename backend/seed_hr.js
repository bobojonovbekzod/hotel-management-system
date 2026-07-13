const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in local DB`);

  const genders = ['Erkak', 'Ayol'];
  
  for (const user of users) {
    // Generate random age between 20 and 60
    const today = new Date();
    const age = Math.floor(Math.random() * 40) + 20;
    const birthDate = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
    
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const hasTelegram = Math.random() > 0.3; // 70% have telegram
    const hasPhone = Math.random() > 0.1; // 90% have phone
    const hasPhoto = Math.random() > 0.5; // 50% have photo
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        birthDate: birthDate,
        gender: gender,
        telegram: hasTelegram ? `@${user.username}` : null,
        phone: hasPhone ? `+99890${Math.floor(1000000 + Math.random() * 9000000)}` : null,
        photoUrl: hasPhoto ? `https://ui-avatars.com/api/?name=${user.username}&background=random` : null,
      }
    });
    
    console.log(`Updated user ${user.username} with mock data`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
