const { NodeSSH } = require('node-ssh');
async function main() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({ host: '138.249.7.136', username: 'root', password: 'U4NIKO7rcFmf$qpt' });
    const res = await ssh.execCommand('asterisk -rx "pjsip show endpoint 1001w"');
    console.log(res.stdout);
    
    // Check if webrtc is enabled for this endpoint
    ssh.dispose();
  } catch(e) { console.error(e); }
}
main();
