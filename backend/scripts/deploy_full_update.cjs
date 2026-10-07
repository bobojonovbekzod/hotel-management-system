const { NodeSSH } = require('node-ssh');
const path = require('path');

async function deploy() {
  const ssh = new NodeSSH();
  let connected = false;
  let attempts = 0;

  while (!connected && attempts < 3) {
    attempts++;
    try {
      console.log(`Connecting to 138.249.7.136 (attempt ${attempts})...`);
      await ssh.connect({
        host: '138.249.7.136',
        username: 'root',
        password: 'U4NIKO7rcFmf$qpt',
        readyTimeout: 35000
      });
      connected = true;
      console.log('Connected!');
    } catch (e) {
      console.warn(`Connection attempt ${attempts} failed: ${e.message}`);
      if (attempts < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (!connected) throw new Error('Could not connect after 3 attempts');

  console.log('1. Uploading backend routes...');
  await ssh.putFile(
    path.join(__dirname, '../src/routes/tasks.js'),
    '/root/hotel-management-system/backend/src/routes/tasks.js'
  );
  await ssh.putFile(
    path.join(__dirname, '../src/routes/notifications.js'),
    '/root/hotel-management-system/backend/src/routes/notifications.js'
  );
  console.log('Backend files uploaded successfully!');

  console.log('2. Restarting PM2 backend...');
  const restartRes = await ssh.execCommand('pm2 restart hotel-backend --update-env');
  console.log(restartRes.stdout || restartRes.stderr);

  console.log('3. Cleaning old build files from /var/www/hotelbase/html...');
  await ssh.execCommand('rm -rf /var/www/hotelbase/html/*');

  console.log('4. Uploading clean frontend dist to /var/www/hotelbase/html...');
  await ssh.putDirectory(
    path.join(__dirname, '../../frontend/dist'),
    '/var/www/hotelbase/html',
    {
      recursive: true,
      concurrency: 10,
      validate: (itemPath) => !itemPath.includes('.DS_Store')
    }
  );

  console.log('5. Uploading index.html explicitly...');
  await ssh.putFile(
    path.join(__dirname, '../../frontend/dist/index.html'),
    '/var/www/hotelbase/html/index.html'
  );

  console.log('ALL DEPLOYED SUCCESSFULLY!');
  ssh.dispose();
}

deploy().catch(console.error);
