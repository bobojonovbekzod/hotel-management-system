const { NodeSSH } = require('node-ssh');

async function check() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: '89.126.208.59',
      username: 'root',
      password: 'Je%K8$Q42R7H%IH',
      readyTimeout: 15000
    });

    const result = await ssh.execCommand('grep -ri "onpbx" /etc/asterisk/');
    console.log('--- onpbx Search Results ---');
    console.log(result.stdout || 'No onpbx references found.');
    if (result.stderr) console.error('Errors:', result.stderr);

    const result2 = await ssh.execCommand('grep -ri "onlinepbx" /etc/asterisk/');
    console.log('--- onlinepbx Search Results ---');
    console.log(result2.stdout || 'No onlinepbx references found.');

    const result3 = await ssh.execCommand('grep -ri "pbx36096" /etc/asterisk/');
    console.log('--- pbx36096 Search Results ---');
    console.log(result3.stdout || 'No pbx36096 references found.');
    
    // Check active sip registry
    const sipShowRegistry = await ssh.execCommand('asterisk -rx "sip show registry"');
    console.log('--- SIP Registry ---');
    console.log(sipShowRegistry.stdout);

    ssh.dispose();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
