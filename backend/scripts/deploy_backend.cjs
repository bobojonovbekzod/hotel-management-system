const { NodeSSH } = require('node-ssh');
const path = require('path');

async function main() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: '138.249.7.136',
      username: 'root',
      password: 'U4NIKO7rcFmf$qpt',
      readyTimeout: 15000
    });

    console.log("Connected to remote server. Uploading guestPortal.js...");
    
    const localFile = path.join(__dirname, '../src/routes/guestPortal.js');
    const remoteFile = '/var/www/hotelbase/backend/src/routes/guestPortal.js';
    
    // Actually the backend path is likely /var/www/hotelbase/backend based on typical deploy
    // Let's verify if the file exists there.
    const checkFile = await ssh.execCommand('ls -l /var/www/hotelbase/backend/src/routes/guestPortal.js');
    if (checkFile.code !== 0) {
      console.error("Backend path might be different:", checkFile.stderr);
      // Wait, is it /root/hotel-management-system/backend or /var/www/hotelbase/backend?
      // In earlier tasks, I used /root/hotel-management-system/backend. Let's try that.
    }
    
    const remoteFile2 = '/root/hotel-management-system/backend/src/routes/guestPortal.js';
    
    await ssh.putFile(localFile, remoteFile2);
    console.log("Uploaded successfully to " + remoteFile2);
    
    console.log("Restarting PM2 backend...");
    const restartResult = await ssh.execCommand('pm2 restart all', {
      cwd: '/root/hotel-management-system/backend'
    });
    
    console.log(restartResult.stdout);
    
    ssh.dispose();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
