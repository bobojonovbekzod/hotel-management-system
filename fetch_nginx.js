const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '138.249.7.136',
      username: 'root',
      password: 'U4NIKO7rcFmf$qpt'
    });
    
    const result = await ssh.execCommand('cat /etc/nginx/sites-available/hotelbase || cat /etc/nginx/sites-enabled/hotelbase || cat /etc/nginx/nginx.conf');
    console.log(result.stdout);
    ssh.dispose();
  } catch (error) {
    console.error(error);
  }
}
run();
