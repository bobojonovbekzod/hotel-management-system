const { NodeSSH } = require('node-ssh');
const https = require('https');

async function checkMainServer() {
  console.log('=== 1. MAIN APPLICATION SERVER (138.249.7.136 / hotelbase.uz) ===');
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: '138.249.7.136',
      username: 'root',
      password: 'U4NIKO7rcFmf$qpt',
      readyTimeout: 15000
    });

    const pm2Status = await ssh.execCommand('pm2 jlist');
    const pm2List = JSON.parse(pm2Status.stdout || '[]');
    const backendProcess = pm2List.find(p => p.name === 'hotel-backend');

    console.log('PM2 Status:', backendProcess ? `${backendProcess.name}: ${backendProcess.pm2_env.status} (PID: ${backendProcess.pid}, Memory: ${(backendProcess.monit.memory / 1024 / 1024).toFixed(1)}MB, CPU: ${backendProcess.monit.cpu}%, Restarts: ${backendProcess.pm2_env.restart_time})` : 'NOT FOUND');

    const mem = await ssh.execCommand('free -m');
    console.log('Server Memory:\n', mem.stdout);

    const df = await ssh.execCommand('df -h /');
    console.log('Disk Usage:\n', df.stdout);

    const dbCheck = await ssh.execCommand('cd /root/hotel-management-system/backend && node -e "const { PrismaClient } = require(\'@prisma/client\'); const prisma = new PrismaClient(); prisma.booking.count().then(c => console.log(\'DB Connection: OK (Total Bookings: \' + c + \')\')).catch(e => console.error(\'DB Error:\', e.message)).finally(() => prisma.$disconnect());"');
    console.log(dbCheck.stdout.trim());

    ssh.dispose();
  } catch (err) {
    console.error('Main server error:', err.message);
  }
}

async function checkHttpsHealth() {
  console.log('\n=== 2. HTTPS API HEALTH (https://hotelbase.uz/api/health) ===');
  return new Promise((resolve) => {
    https.get('https://hotelbase.uz/api/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('HTTP Status:', res.statusCode);
        console.log('Health Response:', data);
        resolve();
      });
    }).on('error', (e) => {
      console.error('Health Check Error:', e.message);
      resolve();
    });
  });
}

async function checkPbxServer() {
  console.log('\n=== 3. ASTERISK PBX SERVER (89.126.208.59) ===');
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: '89.126.208.59',
      username: 'root',
      password: 'Je%K8$Q42R7H%IH',
      readyTimeout: 15000
    });

    const astUptime = await ssh.execCommand('asterisk -rx "core show uptime"');
    console.log('Asterisk Status:\n', astUptime.stdout.trim());

    const peers = await ssh.execCommand('asterisk -rx "sip show peers" | grep -E "1001|UTC|Total"');
    console.log('SIP Peers:\n', peers.stdout.trim());

    const mem = await ssh.execCommand('free -m');
    console.log('PBX Memory:\n', mem.stdout);

    ssh.dispose();
  } catch (err) {
    console.error('PBX Server error:', err.message);
  }
}

async function main() {
  await checkMainServer();
  await checkHttpsHealth();
  await checkPbxServer();
}

main();
