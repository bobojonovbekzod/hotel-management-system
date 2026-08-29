import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Users, Building2, Briefcase, MapPin, Clock, UserX, User, Mail, Send, Phone, Image as ImageIcon, ChevronRight } from 'lucide-react';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

export default function HRDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/users/hr-stats');
      setStats(res.data.data);
    } catch {
      toast.error("HR ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <FullScreenLoader />;

  // Gender Chart Data
  const genderData = [
    { name: 'Erkak', value: stats?.genderDist?.male || 0, color: '#3b82f6' }, // Blue
    { name: 'Ayol', value: stats?.genderDist?.female || 0, color: '#ec4899' }, // Pink
    { name: 'Kiritilmagan', value: stats?.genderDist?.other || 0, color: '#94a3b8' }, // Slate neutral
  ].filter(d => d.value > 0);

  // If no data, show a grey empty ring
  if (genderData.length === 0) {
    genderData.push({ name: 'Ma\'lumot yo\'q', value: 1, color: '#e2e8f0' });
  }

  // Profile completion progress calculations
  const total = stats?.total || 1; // avoid division by zero
  const profilePcts = {
    email: Math.round(((stats?.profile?.email || 0) / total) * 100),
    telegram: Math.round(((stats?.profile?.telegram || 0) / total) * 100),
    phone: Math.round(((stats?.profile?.phone || 0) / total) * 100),
    photo: Math.round(((stats?.profile?.photo || 0) / total) * 100),
  };

  return (
    <div className="space-y-6">
      {/* Top 6 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        
        <div className="card shadow-sm border border-slate-200/60 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-blue-500/10 p-1.5 rounded-lg">
              <Users size={16} className="text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Jami xodimlar</p>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-2">{stats?.total ?? 0}</h3>
          <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 border border-slate-200">
            <span className="mr-1">- 0%</span> o'tgan oydan
          </div>
        </div>

        <div className="card shadow-sm border border-slate-200/60 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-blue-400/10 p-1.5 rounded-lg">
              <Building2 size={16} className="text-blue-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700">bo'limlar</p>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-2">{stats?.departmentsCount ?? 0}</h3>
          <p className="text-xs text-slate-500">Tashkiliy birliklar</p>
        </div>

        <div className="card shadow-sm border border-slate-200/60 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-orange-500/10 p-1.5 rounded-lg">
              <Briefcase size={16} className="text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Lavozimlar</p>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-2">{stats?.rolesCount ?? 0}</h3>
          <p className="text-xs text-slate-500">Mavjud lavozimlar</p>
        </div>

        <div className="card shadow-sm border border-slate-200/60 p-5 rounded-2xl border-b-4 border-b-green-400">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-green-500/10 p-1.5 rounded-lg">
              <MapPin size={16} className="text-green-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700">joylashuvlar</p>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-2">{stats?.departmentsCount ?? 0}</h3>
          <p className="text-xs text-slate-500">Ofis joylashuvlari</p>
        </div>

        <div className="card shadow-sm border border-slate-200/60 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-teal-500/10 p-1.5 rounded-lg">
              <Clock size={16} className="text-teal-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700">O'rtacha ish tajribasi</p>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-2">{stats?.avgExperience ?? 0}</h3>
          <p className="text-xs text-slate-500">O'rtacha yillar</p>
        </div>

        <div className="card shadow-sm border border-slate-200/60 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-red-500/10 p-1.5 rounded-lg">
              <UserX size={16} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Nofaol xodimlar</p>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-2">{stats?.inactive ?? 0}</h3>
          <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 border border-slate-200">
            <span className="mr-1">- 0%</span> o'tgan oydan
          </div>
        </div>

      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Yosh taqsimoti */}
        <div className="card shadow-sm border border-slate-200/60 p-6 rounded-2xl">
          <h3 className="text-base font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Users size={18} className="text-blue-500" /> Yosh taqsimoti
          </h3>
          
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 text-center">
              <h4 className="text-2xl font-bold text-blue-600 mb-1">{stats?.ageDist?.under25 ?? 0}</h4>
              <p className="text-[10px] sm:text-xs text-blue-600 font-medium">Yosh (25 gacha)</p>
            </div>
            <div className="bg-fuchsia-50/50 border border-fuchsia-200 rounded-xl p-3 text-center">
              <h4 className="text-2xl font-bold text-fuchsia-600 mb-1">{(stats?.ageDist?.from25to35 ?? 0) + (stats?.ageDist?.from35to55 ?? 0)}</h4>
              <p className="text-[10px] sm:text-xs text-fuchsia-600 font-medium">O'rta (25-55)</p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 text-center">
              <h4 className="text-2xl font-bold text-emerald-600 mb-1">{stats?.ageDist?.over55 ?? 0}</h4>
              <p className="text-[10px] sm:text-xs text-emerald-600 font-medium">Katta (55+)</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-medium mb-4">Detailed Breakdown</p>
          
          <div className="space-y-5">
            {/* 25 gacha */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <span className="text-slate-700">25 gacha</span>
                </div>
                <span className="font-semibold text-slate-900">{stats?.ageDist?.under25 ?? 0} <span className="text-slate-400 font-normal text-xs">({Math.round(((stats?.ageDist?.under25 ?? 0) / total) * 100)}%)</span></span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${((stats?.ageDist?.under25 ?? 0) / total) * 100}%` }}></div>
              </div>
            </div>

            {/* 25-35 */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-500"></div>
                  <span className="text-slate-700">25-35</span>
                </div>
                <span className="font-semibold text-slate-900">{stats?.ageDist?.from25to35 ?? 0} <span className="text-slate-400 font-normal text-xs">({Math.round(((stats?.ageDist?.from25to35 ?? 0) / total) * 100)}%)</span></span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-fuchsia-500 h-2 rounded-full" style={{ width: `${((stats?.ageDist?.from25to35 ?? 0) / total) * 100}%` }}></div>
              </div>
            </div>
            
            {/* 35-55 */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                  <span className="text-slate-700">35-55</span>
                </div>
                <span className="font-semibold text-slate-900">{stats?.ageDist?.from35to55 ?? 0} <span className="text-slate-400 font-normal text-xs">({Math.round(((stats?.ageDist?.from35to55 ?? 0) / total) * 100)}%)</span></span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${((stats?.ageDist?.from35to55 ?? 0) / total) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Jins bo'yicha taqsimot */}
        <div className="card shadow-sm border border-slate-200/60 p-6 rounded-2xl relative overflow-hidden flex flex-col">
          <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User size={18} className="text-blue-400" /> Jins bo'yicha taqsimot
          </h3>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-800">{stats?.total ?? 0}</span>
                <span className="text-xs text-slate-500">Jami</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {genderData.map((g) => (
              <div key={g.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }}></div>
                  <span className="text-sm text-slate-600">{g.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{g.value}</span>
                  <span className="text-xs text-slate-400 w-8 text-right">{Math.round((g.value / total) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-sm">
            <span className="font-medium text-slate-700">Jami xodimlar</span>
            <span className="font-bold text-slate-900">{stats?.total ?? 0}</span>
          </div>
        </div>

        {/* Profil to'ldirish */}
        <div className="card shadow-sm border border-slate-200/60 p-6 rounded-2xl flex flex-col">
          <h3 className="text-base font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <User size={18} className="text-blue-400" /> Profil to'ldirish
          </h3>
          
          <div className="grid grid-cols-2 gap-4 flex-1">
            
            {/* Email */}
            <div className="bg-blue-50/40 border border-blue-100 p-4 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-blue-600 mb-4">
                <Mail size={16} />
                <span className="text-sm font-medium">Elektron pochta</span>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-slate-900 mb-1">{stats?.profile?.email ?? 0}</h4>
                <p className="text-[10px] text-slate-500 mb-2">{profilePcts.email}% complete</p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${profilePcts.email}%` }}></div>
                </div>
              </div>
            </div>

            {/* Telegram */}
            <div className="bg-cyan-50/40 border border-cyan-100 p-4 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-cyan-600 mb-4">
                <Send size={16} />
                <span className="text-sm font-medium">Telegram</span>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-slate-900 mb-1">{stats?.profile?.telegram ?? 0}</h4>
                <p className="text-[10px] text-slate-500 mb-2">{profilePcts.telegram}% complete</p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full">
                  <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${profilePcts.telegram}%` }}></div>
                </div>
              </div>
            </div>

            {/* Telefon */}
            <div className="bg-green-50/40 border border-green-100 p-4 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <Phone size={16} />
                <span className="text-sm font-medium">Telefon</span>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-slate-900 mb-1">{stats?.profile?.phone ?? 0}</h4>
                <p className="text-[10px] text-slate-500 mb-2">{profilePcts.phone}% complete</p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${profilePcts.phone}%` }}></div>
                </div>
              </div>
            </div>

            {/* Photo */}
            <div className="bg-purple-50/40 border border-purple-100 p-4 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-purple-600 mb-4">
                <ImageIcon size={16} />
                <span className="text-sm font-medium">Profile Photo</span>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-slate-900 mb-1">{stats?.profile?.photo ?? 0}</h4>
                <p className="text-[10px] text-slate-500 mb-2">{profilePcts.photo}% complete</p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full">
                  <div className="bg-purple-400 h-1.5 rounded-full" style={{ width: `${profilePcts.photo}%` }}></div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Bottom Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Bo'limlar bo'yicha taqsimot */}
        <div className="card shadow-sm border border-slate-200/60 p-5 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 text-blue-500 p-1.5 rounded-lg">
                <Building2 size={16} />
              </div>
              <span className="font-semibold text-slate-800 text-sm">Bo'limlar bo'yicha taqsimot</span>
            </div>
            <button className="text-blue-500 text-[11px] font-medium flex items-center gap-1 hover:text-blue-600 px-2 py-1 rounded-lg border border-blue-100 bg-white shadow-sm">
              Batafsil ko'rsatish <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex-1 space-y-4">
            {(stats?.byBranch || []).length === 0 ? (
              <div className="flex items-center justify-center h-20 text-slate-400 text-sm">No data available</div>
            ) : (
              (stats?.byBranch || []).map((b, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600 text-xs">{b.branch}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-xs">{b.total}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">{Math.round((b.total / total) * 100)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(b.total / total) * 100}%` }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Total</span>
            <span className="font-bold text-blue-600">{stats?.total ?? 0}</span>
          </div>
        </div>

        {/* Lavozimlar bo'yicha taqsimot */}
        <div className="card shadow-sm border border-slate-200/60 p-5 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 text-blue-500 p-1.5 rounded-lg">
                <Briefcase size={16} />
              </div>
              <span className="font-semibold text-slate-800 text-sm">Lavozimlar bo'yicha taqsimot</span>
            </div>
            <button className="text-blue-500 text-[11px] font-medium flex items-center gap-1 hover:text-blue-600 px-2 py-1 rounded-lg border border-blue-100 bg-white shadow-sm">
              Batafsil ko'rsatish <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex-1 space-y-4">
            {(stats?.byRole || []).length === 0 ? (
              <div className="flex items-center justify-center h-20 text-slate-400 text-sm">No data available</div>
            ) : (
              (stats?.byRole || []).map((r, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600 text-xs capitalize">{r.role}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-xs">{r.count}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">{Math.round((r.count / total) * 100)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(r.count / total) * 100}%` }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Total</span>
            <span className="font-bold text-blue-600">{stats?.total ?? 0}</span>
          </div>
        </div>

        {/* Joylashuvlar bo'yicha taqsimot */}
        <div className="card shadow-sm border border-slate-200/60 p-5 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 text-blue-500 p-1.5 rounded-lg">
                <MapPin size={16} />
              </div>
              <span className="font-semibold text-slate-800 text-sm">Joylashuvlar bo'yicha taqsimot</span>
            </div>
            <button className="text-blue-500 text-[11px] font-medium flex items-center gap-1 hover:text-blue-600 px-2 py-1 rounded-lg border border-blue-100 bg-white shadow-sm">
              Batafsil ko'rsatish <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[80px]">
            <span className="text-sm text-slate-400">No data available</span>
          </div>
        </div>

        {/* Xodim holati */}
        <div className="card shadow-sm border border-slate-200/60 p-5 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 text-blue-500 p-1.5 rounded-lg">
                <User size={16} />
              </div>
              <span className="font-semibold text-slate-800 text-sm">Xodim holati</span>
            </div>
            <button className="text-blue-500 text-[11px] font-medium flex items-center gap-1 hover:text-blue-600 px-2 py-1 rounded-lg border border-blue-100 bg-white shadow-sm">
              Batafsil ko'rsatish <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex-1 space-y-4">
            {[
              { name: 'Faol', count: stats?.active ?? 0 },
              { name: 'Faol emas', count: stats?.inactive ?? 0 }
            ].map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600 text-xs">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-xs">{s.count}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">{Math.round((s.count / total) * 100)}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(s.count / total) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Total</span>
            <span className="font-bold text-blue-600">{stats?.total ?? 0}</span>
          </div>
        </div>

        {/* Eng ko'p millatlar */}
        <div className="card shadow-sm border border-slate-200/60 p-5 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 text-blue-500 p-1.5 rounded-lg">
                <MapPin size={16} />
              </div>
              <span className="font-semibold text-slate-800 text-sm">Eng ko'p millatlar</span>
            </div>
            <button className="text-blue-500 text-[11px] font-medium flex items-center gap-1 hover:text-blue-600 px-2 py-1 rounded-lg border border-blue-100 bg-white shadow-sm">
              Batafsil ko'rsatish <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[80px]">
            <span className="text-sm text-slate-400">No data available</span>
          </div>
        </div>

        {/* Yaqinlashayotgan tug'ilgan kunlar */}
        <div className="card shadow-sm border border-slate-200/60 p-5 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="bg-pink-50 text-pink-500 p-1.5 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
              </div>
              <span className="font-semibold text-slate-800 text-sm">Yaqinlashayotgan tug'ilgan kunlar</span>
            </div>
            <button className="text-blue-500 text-[11px] font-medium flex items-center gap-1 hover:text-blue-600 px-2 py-1 rounded-lg border border-blue-100 bg-white shadow-sm">
              Batafsil ko'rsatish <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex-1 min-h-[80px]">
            {(() => {
              const rawList = stats?.upcomingBirthdays || [];
              const uniqueList = [];
              const seenNames = new Set();
              rawList.forEach(b => {
                const key = b.name ? b.name.trim().toLowerCase().replace(/\s+/g, ' ') : '';
                if (key && !seenNames.has(key)) {
                  seenNames.add(key);
                  uniqueList.push(b);
                }
              });

              if (uniqueList.length === 0) {
                return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Keyingi 30 kun ichida hech kimning tug'ilgan kuni yo'q</div>;
              }

              return (
                <div className="space-y-3">
                  {uniqueList.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{b.name}</span>
                        {b.branchName && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                            {b.branchName}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100">
                        {b.daysLeft === 0 ? '🎉 Bugun!' : `⏳ ${b.daysLeft} kundan so'ng`} ({b.ageTurning} yosh)
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

      </div>

    </div>
  );
}
