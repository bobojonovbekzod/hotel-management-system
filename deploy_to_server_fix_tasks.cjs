const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deployToServer() {
  try {
    await ssh.connect({
      host: '138.249.7.136',
      username: 'root',
      password: 'U4NIKO7rcFmf$qpt',
      readyTimeout: 15000
    });

    console.log("=== 1. SYNCING BUILT FRONTEND TO NGINX WEB ROOT ===");
    await ssh.execCommand('rm -rf /var/www/hotelbase/html/*');
    await ssh.putDirectory('/Users/bekzod/Projects/hotel-management-system/frontend/dist', '/var/www/hotelbase/html');

    console.log("=== 2. RESTARTING NGINX ===");
    await ssh.execCommand('nginx -s reload');

    ssh.dispose();
    console.log("✅ DEPLOYMENT TO PRODUCTION SERVER COMPLETED SUCCESSFULLY!");
  } catch (err) {
    console.error(err);
  }
}

deployToServer();
