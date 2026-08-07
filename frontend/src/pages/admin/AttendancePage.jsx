import { useState, useEffect } from 'react';
import { CalendarClock, CheckCircle2, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AttendancePage() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterBranch, setFilterBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' yoki 'shifts'
  const [dataList, setDataList] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { date: filterDate };
      if (filterBranch) params.branchId = filterBranch;
      
      if (activeTab === 'shifts') {
        const res = await api.get('/shifts', { params });
        const targetDate = new Date(filterDate).toDateString();
        const dailyShifts = res.data.data.filter(s => new Date(s.startTime).toDateString() === targetDate);
        setDataList(dailyShifts);
      } else {
        const res = await api.get('/attendance', { params });
        setDataList(res.data.data);
      }
    } catch (error) {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterDate, filterBranch, activeTab]);

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="text-primary-400" /> Davomat (Tabel)
          </h1>
          <p className="text-slate-600 text-sm mt-1">Xodimlarning kelib-ketish vaqtlari</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 shadow-inner">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'attendance' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Farroshlar
            </button>
            <button
              onClick={() => setActiveTab('shifts')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'shifts' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Adminlar (Smena)
            </button>
          </div>
          {(user?.role === 'owner' || user?.role === 'supervisor') && (
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
              <select
                className="bg-transparent text-slate-900 text-sm outline-none w-auto min-w-[150px]"
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
              >
                <option className="bg-slate-100 text-slate-900" value="">Barcha filiallar</option>
                {branches.map((b) => (
                  <option className="bg-slate-100 text-slate-900" key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <Filter size={16} className="text-slate-600" />
            <input 
              type="date" 
              className="bg-transparent text-slate-900 text-sm outline-none"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-600">Yuklanmoqda...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-800">
              <thead className="bg-white shadow-sm text-xs uppercase text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Xodim</th>
                  <th className="px-6 py-4">Filial</th>
                  <th className="px-6 py-4 text-center">Kelish vaqti</th>
                  <th className="px-6 py-4 text-center">Ketish vaqti</th>
                  <th className="px-6 py-4 text-center">Jami vaqt</th>
                  <th className="px-6 py-4 text-center">Rasmlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {dataList.map((item) => {
                  const isShift = activeTab === 'shifts';
                  const name = isShift ? item.admin?.name : item.user?.name;
                  const role = isShift ? item.admin?.role : item.user?.role;
                  const branchName = item.branch?.name;
                  const checkIn = isShift ? item.startTime : item.checkIn;
                  const checkOut = isShift ? item.endTime : item.checkOut;
                  const photo1 = isShift ? item.startPhotoUrl : item.checkInPhoto;
                  const photo2 = !isShift ? item.checkOutPhoto : null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{name || "Noma'lum"}</div>
                        <div className="text-xs text-primary-400 uppercase tracking-wider">{role || 'Xodim'}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600">
                        {branchName || "Noma'lum"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-sm border border-emerald-500/20">
                          {formatTime(checkIn)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {checkOut ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-mono text-sm border border-slate-300">
                            {formatTime(checkOut)}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic text-xs">Hali chiqmadi</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-900">
                        {calculateHours(checkIn, checkOut || new Date())}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {photo1 ? (
                            <button 
                              onClick={() => setSelectedPhoto(photo1)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors"
                            >
                              Kirish rasmi
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">Rasm yo'q</span>
                          )}
                          {photo2 && (
                            <button 
                              onClick={() => setSelectedPhoto(photo2)}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-xs font-bold transition-colors"
                            >
                              Chiqish rasmi
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {dataList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-600 border-dashed">
                      Bu sanada hech kim qayd etilmagan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedPhoto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-2xl w-full">
            <img 
              src={selectedPhoto?.startsWith('/uploads') ? `/api${selectedPhoto}` : selectedPhoto} 
              alt="Kamera rasmi" 
              className="w-full h-auto rounded-xl shadow-2xl border-4 border-white/10" 
            />
            <button 
              className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-xl hover:bg-red-50 hover:text-red-600 transition-colors"
              onClick={() => setSelectedPhoto(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
