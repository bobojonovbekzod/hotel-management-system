const { NodeSSH } = require('node-ssh');
async function main() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({ host: '138.249.7.136', username: 'root', password: 'U4NIKO7rcFmf$qpt' });
    const res = await ssh.execCommand('asterisk -rx "pjsip show endpoints"');
    console.log(res.stdout);
    
    // Also check pjsip config for webrtc
    const cat = await ssh.execCommand('cat /etc/asterisk/pjsip.conf');
    console.log("=== PJSIP.CONF ===");
    console.log(cat.stdout.substring(0, 1000));
    
    ssh.dispose();
  } catch(e) { console.error(e); }
}
main();
