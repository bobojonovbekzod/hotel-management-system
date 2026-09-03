const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getLogsFast() {
  try {
    await ssh.connect({
      host: '138.249.7.136',
      username: 'root',
      password: 'U4NIKO7rcFmf$qpt',
      readyTimeout: 15000
    });

    const res = await ssh.execCommand('tail -n 40 /root/.pm2/logs/hotel-backend-out-0.log');
    console.log("=== PM2 OUT LOGS ===");
    console.log(res.stdout);

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}

getLogsFast();
