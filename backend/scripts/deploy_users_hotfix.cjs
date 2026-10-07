const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deployUsersHotfix() {
  await ssh.connect({
    host: '138.249.7.136',
    username: 'root',
    password: 'U4NIKO7rcFmf$qpt',
    readyTimeout: 20000
  });

  console.log('Uploading users.js to server...');
  await ssh.putFile(
    path.join(__dirname, '../src/routes/users.js'),
    '/root/hotel-management-system/backend/src/routes/users.js'
  );

  console.log('Restarting PM2 hotel-backend...');
  const pm2Res = await ssh.execCommand('pm2 restart hotel-backend');
  console.log('PM2 restart output:\n', pm2Res.stdout);

  ssh.dispose();
}

deployUsersHotfix().catch(console.error);
