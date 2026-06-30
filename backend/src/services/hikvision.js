const { request } = require('urllib');
const FormData = require('form-data');

class HikvisionService {
  constructor(device) {
    this.device = device;
    this.baseUrl = `http://${device.ipAddress}:${device.port}/ISAPI`;
    this.auth = `${device.username}:${device.password}`;
  }

  // Qurilmaga rasm va ma'lumot yuklash
  async addFace(userId, name, imageBuffer) {
    try {
      // 1. Xodim ruxsatlarini berish (UserInfo)
      const userInfoPayload = {
        UserInfo: {
          employeeNo: userId.toString(),
          name: name,
          userType: 'normal',
          Valid: {
            enable: true,
            beginTime: '2000-01-01T00:00:00',
            endTime: '2037-12-31T23:59:59'
          },
          doorRight: '1',
          RightPlan: [
            {
              doorNo: 1,
              planTemplateNo: '1'
            }
          ]
        }
      };
      
      // Avvaliga Modify (yangilash) ga urinib ko'ramiz
      let userRes = await request(`${this.baseUrl}/AccessControl/UserInfo/Modify?format=json`, {
        method: 'PUT',
        digestAuth: this.auth,
        content: JSON.stringify(userInfoPayload),
        headers: { 'Content-Type': 'application/json' }
      });

      // Agar xodim topilmasa (oldin yaratilmagan bo'lsa), Record (yaratish) qilamiz
      if (userRes.status === 400 && userRes.data.toString().includes('not exist')) {
        userRes = await request(`${this.baseUrl}/AccessControl/UserInfo/Record?format=json`, {
          method: 'POST',
          digestAuth: this.auth,
          content: JSON.stringify(userInfoPayload),
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (userRes.status >= 400 && !userRes.data.toString().includes('employeeNoAlreadyExist')) {
        throw new Error(`UserInfo xatosi: ${userRes.data.toString()}`);
      }

      // 2. Xodimni rasm yuborish orqali kiritish
      const faceJson = JSON.stringify({
        faceLibType: 'blackFD',
        FDID: '1',
        FPID: userId.toString()
      });
      
      const form = new FormData();
      form.append('FaceDataRecord', faceJson, { contentType: 'application/json' });
      form.append('img', imageBuffer, { filename: 'face.jpg', contentType: 'image/jpeg' });

      let faceRes = await request(`${this.baseUrl}/Intelligent/FDLib/FaceDataRecord?format=json`, {
        method: 'POST',
        digestAuth: this.auth,
        content: form.getBuffer(),
        headers: form.getHeaders()
      });

      // Agar yuz allaqachon mavjud bo'lsa, uni o'chirib, qaytadan POST qilamiz
      if (faceRes.status >= 400 && faceRes.data.toString().includes('deviceUserAlreadyExistFace')) {
        console.log(`[Hikvision] Face already exists for employee ${userId}. Deleting old face and retrying...`);
        
        const delPayload = {
          FPID: [
            {
              value: userId.toString()
            }
          ]
        };

        // 1. Eskisini o'chirish
        await request(`${this.baseUrl}/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD`, {
          method: 'PUT',
          digestAuth: this.auth,
          content: JSON.stringify(delPayload),
          headers: { 'Content-Type': 'application/json' }
        });

        // 2. Qaytadan POST qilish
        faceRes = await request(`${this.baseUrl}/Intelligent/FDLib/FaceDataRecord?format=json`, {
          method: 'POST',
          digestAuth: this.auth,
          content: form.getBuffer(),
          headers: form.getHeaders()
        });
      }

      if (faceRes.status >= 400) {
        throw new Error(`Rasm yuklash xatosi: ${faceRes.data.toString()}`);
      }

      return true;
    } catch (error) {
      console.error('Hikvision addFace error:', error.message || error);
      throw new Error('Qurilmaga rasm yuklashda xatolik yuz berdi');
    }
  }

  // Xodimni o'chirish
  async deleteFace(userId) {
    try {
      const delPayload = {
        UserInfoDelCond: {
          EmployeeNoList: [{ employeeNo: userId.toString() }]
        }
      };
      await request(`${this.baseUrl}/AccessControl/UserInfoDetail/Delete?format=json`, {
        method: 'PUT',
        digestAuth: this.auth,
        content: JSON.stringify(delPayload),
        headers: { 'Content-Type': 'application/json' }
      });
      return true;
    } catch (error) {
      console.error('Hikvision deleteFace error:', error.message);
      return false;
    }
  }
}

module.exports = HikvisionService;
