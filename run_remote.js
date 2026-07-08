const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: '138.249.7.136',
    username: 'root',
    password: 'U4NIKO7rcFmf$qpt'
  });
  
  await ssh.putFile('./backend/add_expense_categories_2.js', '/root/hotel-management-system/backend/add_expense_categories_2.js');
  
  const result = await ssh.execCommand('node add_expense_categories_2.js', { cwd: '/root/hotel-management-system/backend' });
  console.log('STDOUT:', result.stdout);
  console.log('STDERR:', result.stderr);
  
  ssh.dispose();
}
run();
