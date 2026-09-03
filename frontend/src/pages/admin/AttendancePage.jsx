import { useState, useEffect } from 'react';
import { CalendarClock, Search, Filter, Check, TableProperties, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AttendancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterBranch, setFilterBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [activeTab, setActiveTab] = useState('cleaner_matrix'); // Default to cleaner_matrix tab!
  const [dataList, setDataList] = useState([]);

  // Cleaner Matrix state
  const [matrixMonth, setMatrixMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [matrixData, setMatrixData] = useState(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [togglingCell, setTogglingCell] = useState(null);

  const fetchData = async () => {
    if (activeTab === 'cleaner_matrix') {
      fetchMatrix();
      return;
    }

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

  const fetchMatrix = async () => {
    setMatrixLoading(true);
    try {
      const params = { month: matrixMonth };
      if (filterBranch) params.branchId = filterBranch;
      const res = await api.get('/attendance/monthly-matrix', { params });
      setMatrixData(res.data.data);
    } catch (error) {
      toast.error("Tabel ma'lumotlarini yuklashda xatolik");
    } finally {
      setMatrixLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterDate, filterBranch, activeTab, matrixMonth]);

  useEffect(() => {
    if (user?.role === 'owner' || user?.role === 'supervisor') {
      api.get('/branches').then(res => setBranches(res.data.data)).catch(() => {});
    }
  }, [user]);

  const handleToggleCell = async (cleanerId, dateStr, currentStatus) => {
    const newStatus = !currentStatus;
    const cellKey = `${cleanerId}_${dateStr}`;
    setTogglingCell(cellKey);

    // Optimistic UI update
    setMatrixData(prev => {
      if (!prev) return prev;
      const updatedMatrix = { ...prev.matrix };
      if (!updatedMatrix[cleanerId]) updatedMatrix[cleanerId] = {};
      updatedMatrix[cleanerId][dateStr] = newStatus;
      return { ...prev, matrix: updatedMatrix };
    });

    try {
      await api.post('/attendance/toggle-cell', {
        userId: cleanerId,
        dateStr,
        isPresent: newStatus
      });
      toast.success(newStatus ? "Keldi deb belgilandi" : "Kelmadi deb o'chirildi", { id: 'cell-toggle', duration: 1500 });
    } catch (error) {
      toast.error("Saqlashda xatolik");
      fetchMatrix(); // Revert on error
    } finally {
      setTogglingCell(null);
    }
  };

  const handleEditDailySalary = async (cleaner) => {
    const inputVal = window.prompt(
      `${cleaner.name} ning ${matrixMonth} oyi uchun kunlik smena narxini kiriting (masalan: 200000 yoki 250000):`,
      cleaner.salary || ''
    );
    if (inputVal === null) return;
    const newSalary = parseFloat(inputVal);
    if (isNaN(newSalary) || newSalary < 0) {
      toast.error("Iltimos, yaroqli musbat raqam kiriting");
      return;
    }

    try {
      await api.post('/attendance/set-monthly-salary', {
        userId: cleaner.id,
        month: matrixMonth,
        salary: newSalary,
        salaryType: 'per_shift'
      });
      toast.success(`${cleaner.name} ning ${matrixMonth} oyi uchun kunlik stavkasi ${newSalary.toLocaleString('ru-RU')} so'm qilib yangilandi.`);
      fetchMatrix();
    } catch (error) {
      toast.error("Stavkani saqlashda xatolik yuz berdi");
    }
  };


  const formatTime = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '—';
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return '—';

    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}s ${minutes}d`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="text-primary-600" /> Davomat (Tabel)
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {activeTab === 'cleaner_matrix' 
              ? "Tozalik xodimlarining oylik davomat jadvali (Tabel)"
              : "Xodimlarning kelib-ketish vaqtlari"}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 shadow-inner">
            <button
              onClick={() => setActiveTab('cleaner_matrix')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'cleaner_matrix' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <TableProperties size={16} /> Farroshlar Tabeli
            </button>
            {user?.role !== 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'attendance' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Kunlik Rasm/Vaqt
                </button>
                <button
                  onClick={() => setActiveTab('shifts')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'shifts' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Admin Smenalari
                </button>
              </>
            )}
          </div>

          {(user?.role === 'owner' || user?.role === 'supervisor') && (
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
              <select
                className="bg-transparent text-slate-900 text-sm outline-none w-auto min-w-[140px]"
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
              >
                <option value="">Barcha filiallar</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'cleaner_matrix' ? (
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Oy:</span>
              <input 
                type="month" 
                className="bg-transparent text-slate-900 text-sm font-bold outline-none cursor-pointer"
                value={matrixMonth}
                onChange={e => setMatrixMonth(e.target.value)}
              />
            </div>
          ) : (
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
              <Filter size={16} className="text-slate-600" />
              <input 
                type="date" 
                className="bg-transparent text-slate-900 text-sm outline-none"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* MATRIX VIEW TAB FOR CLEANERS */}
      {activeTab === 'cleaner_matrix' ? (
        <div className="card p-0 overflow-hidden border border-slate-200 shadow-sm">
          {matrixLoading ? (
            <div className="p-12 text-center text-slate-600 font-medium">Tabel yuklanmoqda...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                    <th className="px-4 py-3 sticky left-0 z-20 bg-slate-900 min-w-[180px] shadow-md">
                      Farrosh (F.I.Sh)
                    </th>
                    <th className="px-3 py-3 text-center min-w-[100px]">Filial</th>
                    <th className="px-3 py-3 text-center min-w-[110px]">Kunlik Stavka</th>
                    
                    {matrixData?.days?.map(d => (
                      <th 
                        key={d.dateStr} 
                        className={`px-1.5 py-2 text-center min-w-[36px] ${d.isWeekend ? 'bg-amber-950/40 text-amber-300' : ''}`}
                      >
                        <div className="text-[10px] opacity-75">{d.dayName}</div>
                        <div className="text-xs font-bold">{d.dayNum}</div>
                      </th>
                    ))}

                    <th className="px-3 py-3 text-center min-w-[80px] bg-slate-800">Jami Kun</th>
                    <th className="px-4 py-3 text-right min-w-[130px] bg-emerald-950 text-emerald-300">Hisoblangan Maosh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 bg-white">
                  {matrixData?.cleaners?.map(cleaner => {
                    const cleanerMap = matrixData.matrix[cleaner.id] || {};
                    let presentCount = 0;

                    matrixData.days.forEach(d => {
                      if (cleanerMap[d.dateStr]) presentCount++;
                    });

                    // Calculate estimated salary
                    let estimatedEarnings = 0;
                    if (cleaner.salaryType === 'per_shift') {
                      estimatedEarnings = presentCount * (cleaner.salary || 0);
                    } else {
                      estimatedEarnings = cleaner.salary || 0;
                    }

                    return (
                      <tr key={cleaner.id} className="hover:bg-slate-50/80 transition-colors divide-x divide-slate-200">
                        <td className="px-4 py-3 sticky left-0 z-10 bg-white font-bold text-slate-900 shadow-sm border-r border-slate-200">
                          <div>{cleaner.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal uppercase">{cleaner.role}</div>
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-medium text-slate-600">
                          {cleaner.branch?.name || "—"}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-mono text-slate-700">
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{cleaner.salary ? `${cleaner.salary.toLocaleString('ru-RU')} so'm` : '0 so\'m'}</span>
                            {['owner', 'director', 'supervisor'].includes(user?.role) && (
                              <button
                                type="button"
                                onClick={() => handleEditDailySalary(cleaner)}
                                className="p-1 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded transition-colors"
                                title="Kunlik smena narxini o'zgartirish"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                          </div>
                        </td>

                        {matrixData.days.map(d => {
                          const isChecked = Boolean(cleanerMap[d.dateStr]);
                          const isToggling = togglingCell === `${cleaner.id}_${d.dateStr}`;

                          return (
                            <td key={d.dateStr} className={`p-1 text-center ${d.isWeekend ? 'bg-amber-50/50' : ''}`}>
                              <button
                                type="button"
                                disabled={isToggling}
                                onClick={() => handleToggleCell(cleaner.id, d.dateStr, isChecked)}
                                title={`${cleaner.name} - ${d.dateStr}: ${isChecked ? 'Keldi' : 'Kelmadi'}`}
                                className={`w-7 h-7 rounded-md flex items-center justify-center mx-auto transition-all ${
                                  isChecked 
                                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300 hover:bg-emerald-700' 
                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-400 border border-slate-200'
                                }`}
                              >
                                {isChecked && <Check size={16} className="stroke-[3]" />}
                              </button>
                            </td>
                          );
                        })}

                        <td className="px-3 py-3 text-center font-bold text-slate-900 bg-slate-50 text-sm">
                          {presentCount} kun
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50 text-sm">
                          {estimatedEarnings.toLocaleString('ru-RU')} so'm
                        </td>
                      </tr>
                    );
                  })}

                  {(!matrixData?.cleaners || matrixData.cleaners.length === 0) && (
                    <tr>
                      <td colSpan={(matrixData?.days?.length || 0) + 5} className="px-6 py-12 text-center text-slate-500 italic">
                        Tozalik xodimlari topilmadi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* DAILY ATTENDANCE & SHIFTS VIEW */
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
                <tbody className="divide-y divide-slate-200">
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
                          <div className="text-xs text-primary-600 font-semibold uppercase tracking-wider">{role || 'Xodim'}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-600">
                          {branchName || "Noma'lum"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono text-sm border border-emerald-200">
                            {formatTime(checkIn)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {checkOut ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-mono text-sm border border-slate-300">
                              {formatTime(checkOut)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Hali chiqmadi</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-900">
                          {calculateHours(checkIn, checkOut)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {photo1 ? (
                              <button 
                                onClick={() => setSelectedPhoto(photo1)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors"
                              >
                                Kirish rasmi
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs">Rasm yo'q</span>
                            )}
                            {photo2 && (
                              <button 
                                onClick={() => setSelectedPhoto(photo2)}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-xs font-bold transition-colors"
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
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                        Bu sanada hech kim qayd etilmagan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
