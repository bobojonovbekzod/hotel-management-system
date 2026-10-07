const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deployBackendServer() {
  await ssh.connect({
    host: '138.249.7.136',
    username: 'root',
    password: 'U4NIKO7rcFmf$qpt',
    readyTimeout: 20000
  });

  console.log('Uploading server.js, guestPortal.js, geminiService.js...');
  await ssh.putFile(
    path.join(__dirname, '../src/server.js'),
    '/root/hotel-management-system/backend/src/server.js'
  );
  await ssh.putFile(
    path.join(__dirname, '../src/routes/guestPortal.js'),
    '/root/hotel-management-system/backend/src/routes/guestPortal.js'
  );
  await ssh.putFile(
    path.join(__dirname, '../src/services/geminiService.js'),
    '/root/hotel-management-system/backend/src/services/geminiService.js'
  );

  console.log('Restarting PM2 hotel-backend...');
  const pm2Res = await ssh.execCommand('pm2 restart hotel-backend');
  console.log('PM2 restart:\n', pm2Res.stdout);

  ssh.dispose();
}

deployBackendServer().catch(console.error);
