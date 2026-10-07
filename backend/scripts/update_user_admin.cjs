const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  await ssh.connect({ host: '138.249.7.136', username: 'root', password: 'U4NIKO7rcFmf$qpt' });
  const result = await ssh.execCommand(`su - postgres -c "psql -d hotel_db -c \\"UPDATE users SET username = 'nigora-samarqand2-admin' WHERE username = 'nigora_samarqand2-admin';\\""`);
  console.log(result.stdout);
  console.log(result.stderr);
  ssh.dispose();
}
run();
