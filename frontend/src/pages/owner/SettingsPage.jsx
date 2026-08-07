import { useState, useRef } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Settings, Upload, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(
    user?.company?.logoUrl ? `${api.defaults.baseURL || '/api'}${user.company.logoUrl}` : null
  );
  const fileInputRef = useRef(null);

  // Parol o'zgartirish state'lari
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Faqat rasm yuklashingiz mumkin');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target.result);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('logo', file);

    setLoading(true);
    try {
      const res = await api.put('/companies/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        toast.success("Logotip muvaffaqiyatli yangilandi. Iltimos, o'zgarishlar to'liq ko'rinishi uchun sahifani yangilang (F5).");
      }
    } catch (err) {
      toast.error('Logotip yuklashda xatolik yuz berdi');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error("Yangi parollar mos tushmadi!");
    }
    if (passwordData.newPassword.length < 6) {
      return toast.error("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak!");
    }

    setChangingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      if (res.data.success) {
        toast.success("Parol muvaffaqiyatli o'zgartirildi!");
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Parolni o'zgartirishda xatolik yuz berdi");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-400">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sozlamalar</h1>
          <p className="text-slate-600">Kompaniya va tizim sozlamalari</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo Upload Card - Faqat owner uchun */}
        {user?.role === 'owner' && (
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ImageIcon size={20} className="text-primary-400" />
              Kompaniya Logotipi
            </h2>
            
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden relative group">
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Company Logo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-white text-sm font-medium"
                        disabled={loading}
                      >
                        O'zgartirish
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-600">
                    <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                    <span className="text-xs">Logo yo'q</span>
                  </div>
                )}
              </div>

              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleLogoChange}
                accept="image/*"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                <Upload size={18} />
                {loading ? 'Yuklanmoqda...' : 'Yangi logo yuklash'}
              </button>
              <p className="text-xs text-slate-600 text-center max-w-[250px]">
                Tavsiya etiladigan o'lcham: 200x200px. Kvadrat formatdagi rasm yuklang.
              </p>
            </div>
          </div>
        )}

        {/* Parolni o'zgartirish */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Settings size={20} className="text-primary-400" />
            Parolni o'zgartirish
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Joriy parol</label>
              <input
                type="password"
                required
                className="input-field"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Hozirgi parolingizni kiriting"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Yangi parol</label>
              <input
                type="password"
                required
                className="input-field"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Yangi parolni kiriting (kamida 6 ta belgi)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Yangi parolni tasdiqlang</label>
              <input
                type="password"
                required
                className="input-field"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Yangi parolni qayta kiriting"
              />
            </div>
            <button
              type="submit"
              disabled={changingPassword}
              className="btn-primary w-full"
            >
              {changingPassword ? "O'zgartirilmoqda..." : "Parolni saqlash"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
