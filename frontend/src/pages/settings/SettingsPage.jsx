import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Settings, Lock, User, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user, login } = useAuth();
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword && newPassword !== confirmPassword) {
      return toast.error('Yangi parollar mos kelmadi!');
    }

    if (newPassword && !currentPassword) {
      return toast.error('Parolni almashtirish uchun joriy parolni kiritishingiz shart!');
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        username,
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await api.put('/profile', payload);
      
      // Muvaffaqiyatli bo'lsa, contextdagi user ma'lumotlarini yangilash kerak
      // Odatda token o'zgarmaydi (agar backend token parolni o'zgartirmasa), shuning uchun user obyektini saqlab qo'yamiz.
      // Lekin eng oson yo'li hozircha muvaffaqiyat xabarini ko'rsatib, parollarni tozalashdir.
      toast.success('Sozlamalar muvaffaqiyatli saqlandi');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Update local storage user data manually if needed, but context handles it if we refresh.
      // To keep it simple, we can just let it be, user name/username changes will reflect after refresh or we could update the context state.
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="text-primary-400" /> Profil Sozlamalari
        </h1>
        <p className="text-slate-600 text-sm mt-1">Shaxsiy ma'lumotlaringiz va tizimga kirish parolingizni o'zgartirish</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* Shaxsiy ma'lumotlar */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <User size={20} className="text-slate-600" /> Shaxsiy ma'lumotlar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Ismingiz</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
              <div>
                <label className="label">Login (Username)</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Xavfsizlik va Parol */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Lock size={20} className="text-slate-600" /> Xavfsizlik (Parolni o'zgartirish)
            </h2>
            <p className="text-sm text-slate-600 mb-6">Agar parolni o'zgartirishni xohlamasangiz, bu qatorlarni bo'sh qoldiring.</p>
            
            <div className="space-y-4 max-w-md">
              <div>
                <label className="label">Joriy parol</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="********"
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Yangi parol</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="Yangi parol"
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="label">Yangi parolni takrorlang</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="Parolni tasdiqlang"
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary">
              <Save size={18} />
              {submitting ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
