const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '138.249.7.136',
      username: 'root',
      password: 'U4NIKO7rcFmf$qpt'
    });
    
    const envContent = `PORT=5000
DATABASE_URL="postgresql://hotel_user:hotel_pass123@localhost:5432/hotel_db?schema=public"
JWT_SECRET="hotel_secret_key_123!"
`;

    await ssh.execCommand(`cat << 'EOF' > /root/hotel-management-system/backend/.env\n${envContent}\nEOF`);
    await ssh.execCommand('pm2 restart hotel-backend');
    console.log("Server .env restored and PM2 restarted.");
    
    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
run();
