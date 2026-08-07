const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deploy() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Connecting to remote server (Attempt ${attempt})...`);
      await ssh.connect({
        host: '138.249.7.136',
        username: 'root',
        password: 'U4NIKO7rcFmf$qpt',
        readyTimeout: 30000
      });

      console.log('Connected! Uploading backend src directory...');
      await ssh.putDirectory(
        '/Users/bekzod/Projects/hotel-management-system/backend/src',
        '/root/hotel-management-system/backend/src',
        {
          recursive: true,
          concurrency: 5
        }
      );

      console.log('Uploading frontend dist to Nginx web root (/var/www/hotelbase/html)...');
      await ssh.putDirectory(
        '/Users/bekzod/Projects/hotel-management-system/frontend/dist',
        '/var/www/hotelbase/html',
        {
          recursive: true,
          concurrency: 5
        }
      );

      await ssh.putDirectory(
        '/Users/bekzod/Projects/hotel-management-system/frontend/dist',
        '/root/hotel-management-system/frontend/dist',
        {
          recursive: true,
          concurrency: 5
        }
      );

      console.log('Restarting PM2 backend...');
      const pm2Result = await ssh.execCommand('pm2 restart all');
      console.log(pm2Result.stdout);

      console.log('REAL DEPLOYMENT TO /var/www/hotelbase/html SUCCESSFUL!');
      ssh.dispose();
      return;
    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message);
      ssh.dispose();
      if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
    }
  }
}

deploy();
