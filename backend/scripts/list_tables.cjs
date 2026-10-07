const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function check() {
  await ssh.connect({ host: '138.249.7.136', username: 'root', password: 'U4NIKO7rcFmf$qpt' });
  const result = await ssh.execCommand(`su - postgres -c "psql -d hotel_db -c \\"\\\\dt\\""`);
  console.log(result.stdout);
  ssh.dispose();
}
check();
