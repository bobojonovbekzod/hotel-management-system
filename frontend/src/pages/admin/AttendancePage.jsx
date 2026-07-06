import { useState, useEffect } from 'react';
import { CalendarClock, CheckCircle2, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterBranch, setFilterBranch] = useState('');
  const [branches, setBranches] = useState([]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = { date: filterDate };
      if (filterBranch) params.branchId = filterBranch;
      const res = await api.get('/attendance', { params });
      setAttendance(res.data.data);
    } catch (error) {
      toast.error("Davomat ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [filterDate, filterBranch]);

  useEffect(() => {
    if (user?.role === 'owner' || user?.role === 'supervisor') {
      api.get('/branches').then(res => setBranches(res.data.data)).catch(() => {});
    }
  }, [user]);

  const formatTime = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '—';
    const diff = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}s ${minutes}d`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarClock className="text-primary-400" /> Face ID Davomat
          </h1>
          <p className="text-slate-400 text-sm mt-1">Xodimlarning kelib-ketish vaqtlari</p>
        </div>
        
        <div className="flex items-center gap-3">
          {(user?.role === 'owner' || user?.role === 'supervisor') && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2">
              <select
                className="bg-transparent text-white text-sm outline-none w-auto min-w-[150px]"
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
              >
                <option className="bg-slate-800 text-white" value="">Barcha filiallar</option>
                {branches.map((b) => (
                  <option className="bg-slate-800 text-white" key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <input 
              type="date" 
              className="bg-transparent text-white text-sm outline-none"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Yuklanmoqda...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Xodim</th>
                  <th className="px-6 py-4">Filial</th>
                  <th className="px-6 py-4 text-center">Sana</th>
                  <th className="px-6 py-4 text-center">Kelgan vaqti (In)</th>
                  <th className="px-6 py-4 text-center">Ketgan vaqti (Out)</th>
                  <th className="px-6 py-4 text-right">Jami vaqt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{record.user?.name || "Noma'lum"}</div>
                      <div className="text-xs text-primary-400 uppercase tracking-wider">{record.user?.role || '—'}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-400">
                      {record.branch?.name || "Noma'lum"}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {new Date(record.workDate).toLocaleDateString('uz-UZ')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-sm border border-emerald-500/20">
                        {formatTime(record.checkIn)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {record.checkOut ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-sm border border-slate-700">
                          {formatTime(record.checkOut)}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-xs">Hali chiqmadi</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white">
                      {calculateHours(record.checkIn, record.checkOut || (record.checkIn ? new Date() : null))}
                    </td>
                  </tr>
                ))}
                {attendance.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 border-dashed">
                      Bu sanada hech kim qayd etilmagan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
