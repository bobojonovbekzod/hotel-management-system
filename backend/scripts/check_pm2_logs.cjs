const { NodeSSH } = require('node-ssh');

async function check() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: '138.249.7.136',
      username: 'root',
      password: 'U4NIKO7rcFmf$qpt',
      readyTimeout: 15000
    });

    console.log("=== PM2 STATUS ===");
    const status = await ssh.execCommand('pm2 status');
    console.log(status.stdout);

    console.log("=== PM2 LOGS (ERRORS) ===");
    const logs = await ssh.execCommand('pm2 logs hotel-backend --err --lines 50 --nostream');
    console.log(logs.stdout || logs.stderr);

    console.log("=== PM2 RECENT LOGS ===");
    const recent = await ssh.execCommand('pm2 logs hotel-backend --lines 30 --nostream');
    console.log(recent.stdout || recent.stderr);

    ssh.dispose();
  } catch (e) {
    console.error(e);
  }
}

check();
