import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Users, UserCheck, UserX, UserPlus, ShieldCheck, UserCog, User, Building2 } from 'lucide-react';
import FullScreenLoader from '../../components/common/FullScreenLoader';

const roleLabels = {
  director: { label: 'Direktor', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  supervisor: { label: 'Nazoratchi', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  admin: { label: 'Admin', color: 'bg-primary-500/20 text-primary-400 border-primary-500/30' },
  cleaner: { label: 'Tozalik xodimi', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

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

  const maxBranchTotal = Math.max(...(stats?.byBranch?.map(b => b.total) || [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="text-primary-400" /> HR Dashboard
        </h1>
        <p className="text-slate-600 text-sm mt-1">Xodimlar bo'yicha umumiy statistika</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center text-primary-400 flex-shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Jami xodimlar</p>
            <p className="text-3xl font-bold text-slate-900">{stats?.total ?? 0}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Faol xodimlar</p>
            <p className="text-3xl font-bold text-emerald-400">{stats?.active ?? 0}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400 flex-shrink-0">
            <UserX size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Nofaol</p>
            <p className="text-3xl font-bold text-red-400">{stats?.inactive ?? 0}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/15 flex items-center justify-center text-yellow-400 flex-shrink-0">
            <UserPlus size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Bu oy qo'shilgan</p>
            <p className="text-3xl font-bold text-yellow-400">{stats?.newThisMonth ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Breakdown */}
        <div className="card">
          <h2 className="text-base font-semibold text-slate-900 mb-5 flex items-center gap-2">
            <UserCog size={18} className="text-primary-400" /> Lavozimlar bo'yicha taqsimot
          </h2>
          <div className="space-y-4">
            {stats?.byRole?.map(({ role, count }) => {
              const config = roleLabels[role] || { label: role, color: 'bg-slate-500/20 text-slate-600 border-slate-500/30' };
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={role}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{count} ta <span className="text-slate-600 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!stats?.byRole || stats.byRole.length === 0) && (
              <p className="text-slate-600 text-sm text-center py-4">Ma'lumot yo'q</p>
            )}
          </div>
        </div>

        {/* Branch Breakdown */}
        <div className="card">
          <h2 className="text-base font-semibold text-slate-900 mb-5 flex items-center gap-2">
            <Building2 size={18} className="text-primary-400" /> Filiallar bo'yicha taqsimot
          </h2>
          <div className="space-y-4">
            {stats?.byBranch?.map(({ branch, total, active }) => {
              const pct = maxBranchTotal > 0 ? Math.round((total / maxBranchTotal) * 100) : 0;
              const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
              return (
                <div key={branch}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-900 truncate max-w-[60%]">{branch}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-400 font-semibold">{active} faol</span>
                      <span className="text-slate-600">/ {total} jami</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!stats?.byBranch || stats.byBranch.length === 0) && (
              <p className="text-slate-600 text-sm text-center py-4">Ma'lumot yo'q</p>
            )}
          </div>
        </div>
      </div>

      {/* Faollik overview */}
      <div className="card">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary-400" /> Umumiy faollik holati
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden flex">
            {stats?.active > 0 && (
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 flex items-center justify-center text-xs font-bold text-white transition-all duration-700"
                style={{ width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%` }}
              >
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
              </div>
            )}
            {stats?.inactive > 0 && (
              <div
                className="h-full bg-gradient-to-r from-red-700 to-red-500 flex items-center justify-center text-xs font-bold text-white transition-all duration-700"
                style={{ width: `${stats.total > 0 ? (stats.inactive / stats.total) * 100 : 0}%` }}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-6 mt-3 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Faol: {stats?.active}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Nofaol: {stats?.inactive}</span>
        </div>
      </div>
    </div>
  );
}
