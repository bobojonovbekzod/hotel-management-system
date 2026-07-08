const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  connectionString: 'postgresql://postgres:Opensimsim@1@localhost:5432/hotel_management'
});

// Test qilinadigan parollar
const testPasswords = ['admin123', '12345', 'password', '123456', 'admin', 'hotel123'];

async function main() {
  await client.connect();
  
  const users = await client.query(
    `SELECT username, name, role, password FROM "users" ORDER BY role`
  );
  
  console.log('\n=== Foydalanuvchilar va parol tekshiruvi ===\n');
  
  for (const user of users.rows) {
    let foundPassword = null;
    for (const testPwd of testPasswords) {
      const match = await bcrypt.compare(testPwd, user.password);
      if (match) {
        foundPassword = testPwd;
        break;
      }
    }
    console.log(`[${user.role.padEnd(10)}] username: ${user.username.padEnd(25)} | ${user.name.padEnd(30)} | parol: ${foundPassword || '(topilmadi)'}`);
  }
  
  await client.end();
}

main().catch(console.error);
