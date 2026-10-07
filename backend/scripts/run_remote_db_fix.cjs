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

    console.log("Connected to remote server. Uploading script...");
    
    const localFile = path.join(__dirname, 'remote_db_fix.js');
    const remoteFile = '/root/hotel-management-system/backend/scripts/remote_db_fix.js';
    
    await ssh.putFile(localFile, remoteFile);
    console.log("Uploaded successfully. Running script...");
    
    const result = await ssh.execCommand('node scripts/remote_db_fix.js', {
      cwd: '/root/hotel-management-system/backend'
    });
    
    console.log("=== STDOUT ===");
    console.log(result.stdout);
    
    if (result.stderr) {
      console.log("=== STDERR ===");
      console.error(result.stderr);
    }
    
    ssh.dispose();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
