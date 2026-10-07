const { NodeSSH } = require('node-ssh');
async function main() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({ host: '138.249.7.136', username: 'root', password: 'U4NIKO7rcFmf$qpt' });
    
    console.log("=== Asterisk Version ===");
    const v = await ssh.execCommand('asterisk -rx "core show version"');
    console.log(v.stdout);

    console.log("=== SIP Peers ===");
    const peers = await ssh.execCommand('asterisk -rx "sip show peers"');
    console.log(peers.stdout);

    console.log("=== SIP Peer 1001w ===");
    const p1001 = await ssh.execCommand('asterisk -rx "sip show peer 1001w"');
    console.log(p1001.stdout);

    console.log("\n=== Cat /etc/asterisk/sip.conf ===");
    const sipConf = await ssh.execCommand('cat /etc/asterisk/sip.conf');
    console.log(sipConf.stdout);

    ssh.dispose();
  } catch(e) { console.error(e); }
}
main();
