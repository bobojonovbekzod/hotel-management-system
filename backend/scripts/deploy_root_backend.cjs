const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deployToRootBackend() {
  await ssh.connect({
    host: '138.249.7.136',
    username: 'root',
    password: 'U4NIKO7rcFmf$qpt',
    readyTimeout: 20000
  });

  console.log('Connected! Uploading backend files to /root/hotel-management-system/backend...');
  
  await ssh.putFile(
    path.join(__dirname, '../../backend/prisma/schema.prisma'),
    '/root/hotel-management-system/backend/prisma/schema.prisma'
  );
  await ssh.putFile(
    path.join(__dirname, '../../backend/src/routes/tasks.js'),
    '/root/hotel-management-system/backend/src/routes/tasks.js'
  );

  // Ensure uploads directory exists
  await ssh.execCommand('mkdir -p /root/hotel-management-system/backend/uploads/tasks');
  await ssh.execCommand('chmod -R 777 /root/hotel-management-system/backend/uploads');

  console.log('Running prisma db push and generate in /root/hotel-management-system/backend...');
  const pushRes = await ssh.execCommand('cd /root/hotel-management-system/backend && npx prisma db push && npx prisma generate');
  console.log('Prisma output:\n', pushRes.stdout, pushRes.stderr);

  console.log('Restarting PM2 hotel-backend...');
  const pm2Res = await ssh.execCommand('pm2 restart hotel-backend');
  console.log('PM2 restart:\n', pm2Res.stdout);

  // Check columns in MySQL directly
  const tableCheck = await ssh.execCommand('cd /root/hotel-management-system/backend && node -e "const { PrismaClient } = require(\'@prisma/client\'); const prisma = new PrismaClient(); prisma.task.findFirst().then(r => console.log(\'Task findFirst success:\', r)).catch(e => console.error(\'Error:\', e)).finally(() => prisma.$disconnect());"');
  console.log('DB Query verification:\n', tableCheck.stdout, tableCheck.stderr);

  ssh.dispose();
}

deployToRootBackend().catch(console.error);
