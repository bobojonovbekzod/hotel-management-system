const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkHr500() {
  try {
    await ssh.connect({
      host: '138.249.7.136',
      username: 'root',
      password: 'U4NIKO7rcFmf$qpt',
      readyTimeout: 15000
    });

    console.log("=== PM2 ERROR LOGS (LAST 30 LINES) ===");
    const errRes = await ssh.execCommand('tail -n 30 /root/.pm2/logs/hotel-backend-error.log');
    console.log(errRes.stdout);

    console.log("=== PM2 OUT LOGS (LAST 15 LINES) ===");
    const outRes = await ssh.execCommand('tail -n 15 /root/.pm2/logs/hotel-backend-out.log');
    console.log(outRes.stdout);

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}

checkHr500();
