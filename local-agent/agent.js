require('dotenv').config();
const io = require('socket.io-client');
const { request } = require('urllib');
const FormData = require('form-data');
const fs = require('fs');

const SERVER_URL = process.env.SERVER_URL || 'https://hotelbase.uz';
const BRANCH_ID = process.env.BRANCH_ID;
const AGENT_TOKEN = process.env.AGENT_TOKEN;

if (!BRANCH_ID || !AGENT_TOKEN) {
  console.error('XATOLIK: .env faylida BRANCH_ID va AGENT_TOKEN kiritilmagan!');
  process.exit(1);
}

class HikvisionService {
  constructor(device) {
    this.device = device;
    this.baseUrl = `http://${device.ipAddress}:${device.port}/ISAPI`;
    this.auth = `${device.username}:${device.password}`;
  }

  async addFace(userId, name, imageBuffer) {
    try {
      const userInfoPayload = {
        UserInfo: {
          employeeNo: userId.toString(),
          name: name,
          userType: 'normal',
          Valid: { enable: true, beginTime: '2000-01-01T00:00:00', endTime: '2037-12-31T23:59:59' },
          doorRight: '1',
          RightPlan: [{ doorNo: 1, planTemplateNo: '1' }]
        }
      };
      
      let userRes = await request(`${this.baseUrl}/AccessControl/UserInfo/Record?format=json`, {
        method: 'POST', digestAuth: this.auth, content: JSON.stringify(userInfoPayload), headers: { 'Content-Type': 'application/json' }
      });

      if (userRes.status >= 400) {
        userRes = await request(`${this.baseUrl}/AccessControl/UserInfo/Modify?format=json`, {
          method: 'PUT', digestAuth: this.auth, content: JSON.stringify(userInfoPayload), headers: { 'Content-Type': 'application/json' }
        });
      }

      const faceJson = JSON.stringify({ faceLibType: 'blackFD', FDID: '1', FPID: userId.toString() });
      const form = new FormData();
      form.append('FaceDataRecord', faceJson, { contentType: 'application/json' });
      form.append('img', Buffer.from(imageBuffer), { filename: 'face.jpg', contentType: 'image/jpeg' });

      let faceRes = await request(`${this.baseUrl}/Intelligent/FDLib/FaceDataRecord?format=json`, {
        method: 'POST', digestAuth: this.auth, content: form.getBuffer(), headers: form.getHeaders()
      });

      if (faceRes.status >= 400 && faceRes.data.toString().includes('deviceUserAlreadyExistFace')) {
        console.log(`[Hikvision] Yuz allaqachon mavjud (${userId}). Eskisi o'chirilib yangilanmoqda...`);
        const delPayload = { FPID: [{ value: userId.toString() }] };
        await request(`${this.baseUrl}/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD`, {
          method: 'PUT', digestAuth: this.auth, content: JSON.stringify(delPayload), headers: { 'Content-Type': 'application/json' }
        });
        faceRes = await request(`${this.baseUrl}/Intelligent/FDLib/FaceDataRecord?format=json`, {
          method: 'POST', digestAuth: this.auth, content: form.getBuffer(), headers: form.getHeaders()
        });
      }

      if (faceRes.status >= 400) throw new Error(`Rasm yuklash xatosi: ${faceRes.data.toString()}`);
      return true;
    } catch (error) {
      console.error('Hikvision addFace error:', error.message || error);
      throw error;
    }
  }

  async deleteFace(userId) {
    try {
      const delPayload = { UserInfoDelCond: { EmployeeNoList: [{ employeeNo: userId.toString() }] } };
      await request(`${this.baseUrl}/AccessControl/UserInfoDetail/Delete?format=json`, {
        method: 'PUT', digestAuth: this.auth, content: JSON.stringify(delPayload), headers: { 'Content-Type': 'application/json' }
      });
      return true;
    } catch (error) {
      console.error('Hikvision deleteFace error:', error.message);
      return false;
    }
  }
}

console.log(`📡 HotelBase serveriga ulanish kutilmoqda: ${SERVER_URL}`);

const socket = io(`${SERVER_URL}/agent`, {
  auth: {
    branchId: BRANCH_ID,
    token: AGENT_TOKEN
  }
});

socket.on('connect', () => {
  console.log('✅ Server bilan aloqa o\'rnatildi!');
});

socket.on('disconnect', () => {
  console.log('❌ Server bilan aloqa uzildi. Qayta ulanish kutilmoqda...');
});

socket.on('ADD_FACE', async (data, callback) => {
  console.log(`\n📥 Yangi yuz keldi: [Xodim ID: ${data.userId}] - ${data.name}`);
  try {
    const hikvision = new HikvisionService(data.device);
    const imgBuffer = Buffer.from(data.image);
    await hikvision.addFace(data.userId, data.name, imgBuffer);
    console.log(`✅ Yuz qurilmaga muvaffaqiyatli yuklandi: ${data.name}`);
    if(callback) callback({ success: true });
  } catch (error) {
    console.error(`❌ Yuzni yuklashda xatolik:`, error.message);
    if(callback) callback({ success: false, message: error.message });
  }
});

socket.on('DELETE_FACE', async (data, callback) => {
  console.log(`\n🗑️ Yuzni o'chirish buyrug'i keldi: [Xodim ID: ${data.userId}]`);
  try {
    const hikvision = new HikvisionService(data.device);
    await hikvision.deleteFace(data.userId);
    console.log(`✅ Yuz qurilmadan o'chirildi: ID ${data.userId}`);
    if(callback) callback({ success: true });
  } catch (error) {
    console.error(`❌ Yuzni o'chirishda xatolik:`, error.message);
    if(callback) callback({ success: false, message: error.message });
  }
});

console.log('🚀 Local Agent ishga tushdi...');
