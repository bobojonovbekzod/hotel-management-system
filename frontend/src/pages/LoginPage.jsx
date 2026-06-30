import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Hotel, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Username va parolni kiriting!');
      return;
    }
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      toast.success(`Xush kelibsiz, ${user.name}!`);
      // Roli bo'yicha yo'naltirish
      if (user.role === 'owner') navigate('/owner/dashboard');
      else if (user.role === 'director') navigate('/director/dashboard');
      else if (user.role === 'admin') navigate('/admin/rooms');
      else navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login xatosi. Qaytadan urinib ko\'ring.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-800/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md p-4 animate-fade-in">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-600 to-primary-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-500/30">
            <Hotel className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Hotel Manager</h1>
          <p className="text-slate-400">Boshqaruv tizimiga kiring</p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Foydalanuvchi nomi</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">👤</span>
                <input
                  id="username-input"
                  type="text"
                  className="input-field pl-11"
                  placeholder="username kiriting"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="label">Parol</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="password-input"
                  type={showPass ? 'text' : 'password'}
                  className="input-field pl-11 pr-12"
                  placeholder="parol kiriting"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Kirmoqda...</span>
                </>
              ) : (
                <>
                  <span>Kirish</span>
                </>
              )}
            </button>
          </form>

        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Hotel Management System © 2026
        </p>
      </div>
    </div>
  );
}
