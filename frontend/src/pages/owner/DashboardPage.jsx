import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { DollarSign, TrendingUp, Bed, LogOut, CheckCircle, Clock, Building2, ClipboardList, Wallet } from 'lucide-react';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shiftPage, setShiftPage] = useState(1);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    setShiftPage(1);
    fetchDashboard();
  }, [selectedBranch, month, year, startDate, endDate]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.data);
    } catch {}
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate && endDate) {
        params.start = startDate;
        params.end = endDate;
      } else {
        params.month = month;
        params.year = year;
      }
      if (selectedBranch) params.branchId = selectedBranch;
      const res = await api.get('/dashboard/summary', { params });
      setData(res.data.data);
      setShiftPage(1);
    } catch (error) {
      console.error(error);
      toast.error('Dashboard ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const ov = data?.overview;
  
  const shiftReports = data?.shiftReports || [];
  const itemsPerPage = 10;
  const totalPages = Math.ceil(shiftReports.length / itemsPerPage);
  const paginatedShifts = shiftReports.slice((shiftPage - 1) * itemsPerPage, shiftPage * itemsPerPage);

  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-400">Dashboard yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Oylik tushum', value: ov?.totalIncome?.toLocaleString(), unit: "so'm",
      icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
    },
    {
      label: 'Oylik xarajat', value: ov?.totalExpenses?.toLocaleString(), unit: "so'm",
      icon: LogOut, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20',
    },
    {
      label: 'Sof foyda', value: ov?.netProfit?.toLocaleString(), unit: "so'm",
      icon: TrendingUp, color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20',
    },
    {
      label: 'Kassa (Naqd)', value: ov?.cashBalance?.toLocaleString(), unit: "so'm",
      icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
    },
    {
      label: 'Bandlik darajasi', value: `${ov?.occupancyRate}%`, unit: `${ov?.occupiedRooms}/${ov?.totalRooms} xona`,
      icon: Bed, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bosh Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">
            {user?.role === 'owner' ? 'Barcha filiallar tahlili' : `${user?.branch?.name} tahlili`}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {['owner', 'supervisor'].includes(user?.role) && (
            <select
              className="input-field w-auto min-w-[160px]"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">Barcha filiallar</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-700/50">
            <input 
              type="date" 
              className="input-field bg-transparent border-none px-2 h-9 text-sm w-[130px] focus:ring-0" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
            <span className="text-slate-500">-</span>
            <input 
              type="date" 
              className="input-field bg-transparent border-none px-2 h-9 text-sm w-[130px] focus:ring-0" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>

          {(!startDate || !endDate) && (
            <div className="flex gap-2">
              <select className="input-field w-auto min-w-[120px]" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select className="input-field w-auto min-w-[100px]" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg">Tozalash</button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        {kpis.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm relative hover:border-slate-700 hover:bg-slate-800/40 transition-colors">
              <div className={`absolute top-4 right-4 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 ${card.color}`}>
                <Icon size={16} strokeWidth={2.5} />
              </div>
              <div className="mt-1">
                <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">{card.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold text-white tracking-tight">{card.value}</p>
                  {card.unit && <p className="text-xs font-medium text-slate-500">{card.unit}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today stats */}
      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-slate-700 hover:bg-slate-800/40 transition-colors">
            <div>
              <p className="text-[12px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Bugungi check-in</p>
              <p className="text-2xl font-bold text-white tracking-tight">{ov?.todayBookings}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-emerald-400">
              <CheckCircle size={22} />
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-slate-700 hover:bg-slate-800/40 transition-colors">
            <div>
              <p className="text-[12px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Bugungi check-out</p>
              <p className="text-2xl font-bold text-white tracking-tight">{ov?.todayCheckouts}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-orange-400">
              <LogOut size={22} />
            </div>
          </div>
        </div>
      )}

      {/* Payment and Expenses Breakdown */}
      {['owner', 'supervisor', 'director'].includes(user?.role) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Methods */}
          <div className="card">
            <h3 className="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-primary-400" /> Tushum to'lov turlari bo'yicha
            </h3>
            <div className="space-y-4">
              {data?.paymentMethods?.map(pm => (
                <div key={pm.paymentMethod} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                  <span className="font-medium text-slate-300 capitalize">{pm.paymentMethod}</span>
                  <span className="font-bold text-emerald-400">{pm._sum.paidAmount?.toLocaleString() || 0} so'm</span>
                </div>
              ))}
              {(!data?.paymentMethods || data.paymentMethods.length === 0) && (
                <p className="text-slate-500 text-center py-4">Ma'lumot yo'q</p>
              )}
            </div>
          </div>

          {/* Expenses by Category */}
          <div className="card">
            <h3 className="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2">
              <LogOut size={20} className="text-red-400" /> Xarajatlar toifasi bo'yicha
            </h3>
            <div className="space-y-4">
              {data?.expensesByCategory?.map(ec => (
                <div key={ec.category} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                  <span className="font-medium text-slate-300 capitalize">{ec.category}</span>
                  <span className="font-bold text-red-400">{ec._sum.amount?.toLocaleString() || 0} so'm</span>
                </div>
              ))}
              {(!data?.expensesByCategory || data.expensesByCategory.length === 0) && (
                <p className="text-slate-500 text-center py-4">Ma'lumot yo'q</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Top 5 Admins */}
      {['owner', 'supervisor', 'director'].includes(user?.role) && data?.topAdmins?.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-bold text-white tracking-tight mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-400" /> Top 5 Eng yaxshi adminlar
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Admin</th>
                  <th className="table-th">Filial</th>
                  <th className="table-th text-center">Smenalar soni</th>
                  <th className="table-th text-right">Jami tushum</th>
                </tr>
              </thead>
              <tbody>
                {data.topAdmins.map((ta, idx) => (
                  <tr key={ta.admin?.id || idx} className="table-row">
                    <td className="table-td font-medium text-slate-200">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        {ta.admin?.name}
                      </div>
                    </td>
                    <td className="table-td text-slate-400">{ta.admin?.branch?.name || '—'}</td>
                    <td className="table-td text-center font-medium text-slate-300">{ta.shiftCount} ta</td>
                    <td className="table-td text-right">
                      <span className="font-bold text-emerald-400">{ta.totalIncome?.toLocaleString()}</span>
                      <span className="text-xs font-medium text-slate-500 ml-1.5">so'm</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Smenalar kassa hisoboti */}
      {['supervisor', 'director'].includes(user?.role) && data?.shiftReports?.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-bold text-white tracking-tight mb-6 flex items-center gap-2">
            <ClipboardList size={20} className="text-primary-400" /> Smenalar bo'yicha kassa hisoboti
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Sana</th>
                  <th className="table-th">Admin</th>
                  {user?.role !== 'director' && <th className="table-th">Filial</th>}
                  <th className="table-th text-right">Jami kassa</th>
                  <th className="table-th text-right">Terminal</th>
                  <th className="table-th text-right">QR Code</th>
                  <th className="table-th text-right">Chiqim</th>
                  <th className="table-th text-right font-bold text-emerald-400">Qoldiq (Naqd)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShifts.map((sr) => (
                  <tr key={sr.id} className={`table-row ${sr.status === 'active' ? 'bg-emerald-500/5' : ''}`}>
                    <td className="table-td text-slate-400 font-medium">
                      <div className="flex items-center gap-2">
                        {format(new Date(sr.date), 'dd.MM.yyyy')}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${sr.shiftType === 'morning' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                          {sr.shiftType === 'morning' ? 'Kunduzgi' : 'Tungi'}
                        </span>
                        {sr.status === 'active' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                            Hali yopilmagan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-td font-medium text-slate-200">{sr.adminName}</td>
                    {user?.role !== 'director' && <td className="table-td text-slate-400">{sr.branchName}</td>}
                    <td className="table-td text-right font-bold text-white">{sr.totalIncome.toLocaleString()}</td>
                    <td className="table-td text-right text-slate-300">{sr.terminal.toLocaleString()}</td>
                    <td className="table-td text-right text-slate-300">{sr.qrcode.toLocaleString()}</td>
                    <td className="table-td text-right text-red-400">{sr.chiqim.toLocaleString()}</td>
                    <td className="table-td text-right font-bold text-emerald-400 bg-emerald-500/5">{sr.qoldiq.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t border-slate-800 gap-4">
              <span className="text-[13px] text-slate-400 font-medium">
                Jami <span className="text-white">{shiftReports.length}</span> ta yozuvdan <span className="text-white">{(shiftPage - 1) * itemsPerPage + 1}</span> - <span className="text-white">{Math.min(shiftPage * itemsPerPage, shiftReports.length)}</span> ko'rsatilmoqda
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShiftPage(p => Math.max(1, p - 1))}
                  disabled={shiftPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  Oldingi
                </button>
                <div className="flex gap-1 items-center mx-1 sm:mx-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setShiftPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${shiftPage === i + 1 ? 'bg-primary-500 text-white shadow-sm' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setShiftPage(p => Math.min(totalPages, p + 1))}
                  disabled={shiftPage === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  Keyingi
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Branch comparison (owner only) */}
      {user?.role === 'owner' && data?.branchStats && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Building2 size={20} className="text-primary-400" /> Filiallar taqqoslamasi
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Filial nomi</th>
                  <th className="table-th text-right">Oylik tushum</th>
                  <th className="table-th text-center">Xonalar</th>
                  <th className="table-th text-center">Bandlik</th>
                </tr>
              </thead>
              <tbody>
                {data.branchStats.map((bs, idx) => (
                  <tr key={bs.branch.id} className="table-row">
                    <td className="table-td font-medium text-slate-200">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        {bs.branch.name}
                      </div>
                    </td>
                    <td className="table-td text-right">
                      <span className="font-bold text-emerald-400">{bs.monthlyIncome.toLocaleString()}</span>
                      <span className="text-xs font-medium text-slate-500 ml-1.5">so'm</span>
                    </td>
                    <td className="table-td text-center text-slate-400 font-medium">{bs.totalRooms} ta</td>
                    <td className="table-td text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex-1 bg-slate-800 rounded-full h-1.5 max-w-24 overflow-hidden border border-slate-700/50">
                          <div
                            className="bg-primary-500 h-full rounded-full"
                            style={{ width: `${bs.totalRooms > 0 ? (bs.occupiedRooms / bs.totalRooms) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-300 w-8">
                          {bs.totalRooms > 0 ? Math.round((bs.occupiedRooms / bs.totalRooms) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Branch Bar Chart */}
          <div className="mt-8 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.branchStats.map((bs) => ({ name: bs.branch.name.split(' ')[1] || bs.branch.name, tushum: bs.monthlyIncome }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(v) => [`${v.toLocaleString()} so'm`, 'Tushum']}
                  itemStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Bar dataKey="tushum" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Shifts */}
      {user?.role === 'admin' && data?.monthlyShifts?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Clock size={20} className="text-primary-400" /> Oylik smenalar hisoboti
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Admin</th>
                  <th className="table-th">Smena turi</th>
                  <th className="table-th">Boshlanish</th>
                  <th className="table-th">Tugash</th>
                  <th className="table-th text-right">Tushum</th>
                  <th className="table-th text-center">Bronlar</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyShifts.slice(0, 10).map((shift) => (
                  <tr key={shift.id} className="table-row">
                    <td className="table-td font-medium text-slate-200">{shift.admin?.name}</td>
                    <td className="table-td">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        shift.shiftType === 'morning'
                          ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {shift.shiftType === 'morning' ? 'Kunduzgi' : 'Tungi'}
                      </span>
                    </td>
                    <td className="table-td text-slate-400 font-medium text-xs">{format(new Date(shift.startTime), 'dd.MM, HH:mm')}</td>
                    <td className="table-td text-slate-400 font-medium text-xs">
                      {shift.endTime ? format(new Date(shift.endTime), 'dd.MM, HH:mm') : '—'}
                    </td>
                    <td className="table-td text-right font-bold text-emerald-400">
                      {shift.totalIncome.toLocaleString()}
                    </td>
                    <td className="table-td text-center text-slate-400 font-medium">{shift.totalBookings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
