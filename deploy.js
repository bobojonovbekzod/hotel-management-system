const { NodeSSH } = require('node-ssh');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

// Server ma'lumotlari
const SERVER_IP = '138.249.7.136';
const USERNAME = 'root';
const PASSWORD = 'U4NIKO7rcFmf$qpt';
const BACKEND_PATH = '/root/hotel-management-system/backend';
const FRONTEND_PATH = '/var/www/hotelbase/html';

async function deploy() {
  console.log('🚀 Dasturni serverga yuklash (Deploy) jarayoni boshlandi...\n');

  try {
    // 1. Frontendni build qilish
    console.log('📦 1. Frontend yig\'ilmoqda (build)...');
    execSync('npm run build', { 
      cwd: path.join(__dirname, 'frontend'), 
      stdio: 'inherit' 
    });
    console.log('✅ Frontend muvaffaqiyatli yig\'ildi!\n');

    // 2. Serverga ulanish
    console.log(`🔌 2. Serverga ulanilmoqda (${SERVER_IP})...`);
    await ssh.connect({
      host: SERVER_IP,
      username: USERNAME,
      password: PASSWORD
    });
    console.log('✅ Serverga ulanish muvaffaqiyatli!\n');

    // 3. Frontend fayllarni yuklash
    console.log('🌐 3. Frontend fayllari serverga yuklanmoqda...');
    // Serverdagi eski fayllarni o'chirish
    await ssh.execCommand(`rm -rf ${FRONTEND_PATH}/*`);
    // Yangi fayllarni yuklash
    await ssh.putDirectory(path.join(__dirname, 'frontend', 'dist'), FRONTEND_PATH, {
      recursive: true,
      concurrency: 10,
    });
    console.log('✅ Frontend serverga yuklandi!\n');

    // 4. Backend fayllarni yuklash
    console.log('⚙️ 4. Backend fayllari serverga yuklanmoqda...');
    
    // Keraksiz fayllarni o'tkazib yuborish uchun funksiya
    const validateItem = (itemPath) => {
      const isNodeModules = itemPath.includes('node_modules');
      const isLogs = itemPath.includes('.log');
      const isEnv = itemPath.endsWith('.env');
      return !isNodeModules && !isLogs && !isEnv;
    };

    await ssh.putDirectory(path.join(__dirname, 'backend'), BACKEND_PATH, {
      recursive: true,
      concurrency: 10,
      validate: validateItem
    });
    console.log('✅ Backend serverga yuklandi!\n');

    // 5. Backend qaramliklarini o'rnatish va restart berish
    console.log('🔄 5. Server qayta ishga tushirilmoqda...');
    await ssh.execCommand('npm install', { cwd: BACKEND_PATH });
    await ssh.execCommand('npx prisma db push --accept-data-loss', { cwd: BACKEND_PATH });
    await ssh.execCommand('npx prisma generate', { cwd: BACKEND_PATH });
    await ssh.execCommand('pm2 restart hotel-backend', { cwd: BACKEND_PATH });
    console.log('✅ Server qayta ishga tushirildi!\n');

    console.log('🎉 BARCHA O\'ZGARISHLAR MUVAFFAQIYATLI SERVERGA YUKLANDI! 🎉');
    
  } catch (error) {
    console.error('❌ XATOLIK YUZ BERDI:', error);
  } finally {
    ssh.dispose();
  }
}

deploy();
