const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const cleanOldImages = () => {
  // Har kuni tunda soat 02:00 da ishga tushadi
  cron.schedule('0 2 * * *', () => {
    console.log('🧹 [CRON] Eski rasmlarni tozalash boshlandi...');
    const uploadDir = path.join(__dirname, '../../uploads/cleaning');
    
    if (!fs.existsSync(uploadDir)) return;

    const files = fs.readdirSync(uploadDir);
    const now = Date.now();
    const FIVE_DAYS_IN_MS = 5 * 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;

    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      
      // Agar fayl 5 kundan eski bo'lsa
      if (now - stats.mtime.getTime() > FIVE_DAYS_IN_MS) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });

    console.log(`✅ [CRON] ${deletedCount} ta eski (5 kundan o'tgan) tozalik rasmlari o'chirib yuborildi.`);
  });
};

module.exports = cleanOldImages;
