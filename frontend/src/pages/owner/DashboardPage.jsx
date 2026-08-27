import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { DollarSign, TrendingUp, Bed, LogOut, CheckCircle, Clock, Building2, ClipboardList, Wallet, Smartphone, CreditCard, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import ActiveIssuesBar from '../../components/admin/ActiveIssuesBar';

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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

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
      setBranches(res.data?.data || []);
    } catch { }
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

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-primary-500" /> : <ArrowDown size={14} className="text-primary-500" />;
  };

  const sortedBranchStats = [...(data?.branchStats || [])].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const key = sortConfig.key;
    const aValue = a[key] || 0;
    const bValue = b[key] || 0;
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // E-mehmon uslubidagi gradient kartochkalar
  const kpis = [
    {
      label: 'Oylik tushum', value: (ov?.totalIncome || 0).toLocaleString(), unit: "so'm",
      icon: DollarSign,
      gradient: 'linear-gradient(135deg, #7B5EA7 0%, #9B59B6 100%)',
      shadow: 'rgba(123, 94, 167, 0.4)',
    },
    {
      label: 'QrCode oylik', value: (data?.paymentStats?.find(p => p.name === 'QrCode')?.value || 0).toLocaleString(), unit: "so'm",
      icon: Smartphone,
      gradient: 'linear-gradient(135deg, #F7971E 0%, #FFD200 100%)',
      shadow: 'rgba(247, 151, 30, 0.4)',
    },
    {
      label: 'Terminal oylik', value: (data?.paymentStats?.find(p => p.name === 'Terminal')?.value || 0).toLocaleString(), unit: "so'm",
      icon: CreditCard,
      gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      shadow: 'rgba(17, 153, 142, 0.4)',
    },
    {
      label: 'Kartadan kartaga', value: (data?.paymentStats?.find(p => p.name === 'Karta/Karta')?.value || 0).toLocaleString(), unit: "so'm",
      icon: CreditCard,
      gradient: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)',
      shadow: 'rgba(74, 0, 224, 0.4)',
    },
    {
      label: 'Xarajat oylik', value: (ov?.totalExpenses || 0).toLocaleString(), unit: "so'm",
      icon: LogOut,
      gradient: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
      shadow: 'rgba(235, 51, 73, 0.4)',
    },
    {
      label: 'Kassa (Naqd)', value: (ov?.cashBalance || 0).toLocaleString(), unit: "so'm",
      icon: Wallet,
      gradient: 'linear-gradient(135deg, #2980b9 0%, #56CCF2 100%)',
      shadow: 'rgba(41, 128, 185, 0.4)',
    }
  ];

  const totalBandDays = data?.occupancyStats?.reduce((sum, item) => sum + (item.band || 0), 0) || 0;
  const daysWithData = data?.occupancyStats?.filter(item => item.band !== null)?.length || 1;
  const totalAvailableDays = (ov?.totalRooms || 0) * daysWithData;
  const monthlyOccupancyRate = totalAvailableDays > 0 ? ((totalBandDays / totalAvailableDays) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <ActiveIssuesBar />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bosh Dashboard</h1>
          <p className="text-slate-600 text-sm mt-1 font-medium">
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
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <input
              type="date"
              className="input-field bg-transparent border-none px-2 h-9 text-sm w-[130px] focus:ring-0"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-600">-</span>
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
                {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-slate-600 hover:text-slate-800 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Tozalash</button>
          )}
        </div>
      </div>

      {/* KPI Cards — E-mehmon uslubi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl overflow-hidden relative transition-all duration-300 hover:-translate-y-1 cursor-pointer p-3.5 flex flex-col items-center justify-center text-center"
              style={{
                background: card.gradient,
                boxShadow: `0 8px 24px ${card.shadow}`,
              }}
            >
              <div className="flex flex-col items-center justify-center text-center w-full">
                <p className="text-white/90 font-semibold text-xs sm:text-[13px] mb-1.5 truncate max-w-full">
                  {card.label}
                </p>
                <div className="flex items-baseline justify-center gap-1 w-full">
                  <p className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight truncate">
                    {card.value}
                  </p>
                  <p className="text-white/80 text-[11px] font-medium flex-shrink-0">{card.unit}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today stats */}
      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-slate-300 hover:bg-slate-50 transition-colors">
            <div>
              <p className="text-[12px] font-semibold text-slate-600 mb-1 uppercase tracking-wider">Bugungi check-in</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{ov?.todayBookings}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-emerald-500">
              <CheckCircle size={22} />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-slate-300 hover:bg-slate-50 transition-colors">
            <div>
              <p className="text-[12px] font-semibold text-slate-600 mb-1 uppercase tracking-wider">Bugungi check-out</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{ov?.todayCheckouts}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-orange-500">
              <LogOut size={22} />
            </div>
          </div>
        </div>
      )}

      {/* Payment and Expenses Breakdown */}
      {['owner', 'supervisor', 'director'].includes(user?.role) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Methods Pie Chart */}
          <div className="card">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-primary-500" /> To'lov turlari bo'yicha tushum
            </h3>
            <div className="h-64 w-full mt-4 flex items-center justify-center">
              {(!data?.paymentStats || data.paymentStats.length === 0) ? (
                <p className="text-slate-500 text-sm">Ma'lumot yo'q</p>
              ) : (
                <ResponsiveContainer width="99%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.paymentStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.paymentStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(v) => [`${v.toLocaleString()} so'm`, 'Summa']}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 500, color: '#475569' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Expenses by Category */}
          <div className="card">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4 flex items-center gap-2">
              <LogOut size={20} className="text-red-500" /> Xarajatlar toifasi bo'yicha
            </h3>
            <div className="space-y-4">
              {data?.expensesByCategory?.map((ec, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-medium text-slate-800 capitalize">{ec.category}</span>
                  <span className="font-bold text-red-600">{ec._sum.amount?.toLocaleString() || 0} so'm</span>
                </div>
              ))}
              {(!data?.expensesByCategory || data.expensesByCategory.length === 0) && (
                <p className="text-slate-600 text-center py-4">Ma'lumot yo'q</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Occupancy Line Chart */}
      {['owner', 'supervisor', 'director'].includes(user?.role) && data?.occupancyStats?.length > 0 && (
        <div className="card mt-6">
          <div className="text-center mb-6 relative">
            <h3 className="text-[17px] font-bold text-slate-800 tracking-tight">
              Mehmonxonaning bandligi
            </h3>
            <p className="text-[13px] text-slate-500 font-medium mt-1">
              Xonalar bo'yicha % nisbat .... <span className="text-emerald-600 ml-1">({monthlyOccupancyRate}% oylik bandlik)</span>
            </p>
          </div>
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="99%" height={280}>
              <AreaChart
                data={data.occupancyStats.map(item => ({
                  ...item,
                  percentage: (item.band !== null && ov?.totalRooms) ? parseFloat(((item.band / ov.totalRooms) * 100).toFixed(1)) : null
                }))}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPercentage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={true} horizontal={true} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  label={{ value: "Xonalar bo'yicha % bandlik", angle: -90, position: 'insideLeft', offset: -5, style: { textAnchor: 'middle', fill: '#475569', fontSize: 12, fontWeight: 600 } }}
                  ticks={[0, 25, 50, 75, 100]}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v, name, props) => [
                    v !== null ? `${v}% (${props.payload.band} ta xona band)` : 'Ma\'lumot yo\'q',
                    'Bandlik'
                  ]}
                  labelStyle={{ color: '#475569', fontWeight: 600, marginBottom: '4px' }}
                />
                <Area
                  type="linear"
                  dataKey="percentage"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPercentage)"
                  connectNulls={false}
                  activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Smenalar kassa hisoboti */}
      {['supervisor', 'director'].includes(user?.role) && data?.shiftReports?.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2">
            <ClipboardList size={20} className="text-primary-500" /> Smenalar bo'yicha kassa hisoboti
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Sana</th>
                  <th className="table-th">Admin</th>
                  {user?.role !== 'director' && <th className="table-th">Filial</th>}
                  <th className="table-th text-right">Jami tushum</th>
                  <th className="table-th text-right">Naqd</th>
                  <th className="table-th text-right">Terminal</th>
                  <th className="table-th text-right">QR Code</th>
                  <th className="table-th text-right">Karta/Karta</th>
                  <th className="table-th text-right">Chiqim</th>
                  <th className="table-th text-right font-bold text-emerald-600">Qoldiq kassa</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShifts.map((sr) => (
                  <tr key={sr.id} className={`table-row ${sr.status === 'active' ? 'bg-emerald-50' : ''}`}>
                    <td className="table-td text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        {format(new Date(sr.date), 'dd.MM.yyyy')}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${sr.shiftType === 'morning' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}>
                          {sr.shiftType === 'morning' ? 'Kunduzgi' : 'Tungi'}
                        </span>
                        {sr.status === 'active' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-100 text-emerald-600 border border-emerald-200 animate-pulse">
                            Hali yopilmagan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-td font-medium text-slate-800">{sr.adminName}</td>
                    {user?.role !== 'director' && <td className="table-td text-slate-600">{sr.branchName}</td>}
                    <td className="table-td text-right font-bold text-slate-900">{sr.totalIncome.toLocaleString()}</td>
                    <td className="table-td text-right text-slate-700">{(sr.totalIncome - sr.terminal - sr.qrcode - (sr.transfer || 0)).toLocaleString()}</td>
                    <td className="table-td text-right text-slate-700">{sr.terminal.toLocaleString()}</td>
                    <td className="table-td text-right text-slate-700">{sr.qrcode.toLocaleString()}</td>
                    <td className="table-td text-right text-slate-700">{(sr.transfer || 0).toLocaleString()}</td>
                    <td className="table-td text-right text-red-500">{sr.chiqim.toLocaleString()}</td>
                    <td className="table-td text-right font-bold text-emerald-600 bg-emerald-50">{sr.qoldiq.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t border-slate-100 gap-4">
              <span className="text-[13px] text-slate-600 font-medium">
                Jami <span className="text-slate-900">{shiftReports.length}</span> ta yozuvdan <span className="text-slate-900">{(shiftPage - 1) * itemsPerPage + 1}</span> - <span className="text-slate-900">{Math.min(shiftPage * itemsPerPage, shiftReports.length)}</span> ko'rsatilmoqda
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShiftPage(p => Math.max(1, p - 1))}
                  disabled={shiftPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-50 hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Oldingi
                </button>
                <div className="flex gap-1 items-center mx-1 sm:mx-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setShiftPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${shiftPage === i + 1 ? 'bg-primary-500 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-primary-600 border border-slate-200'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShiftPage(p => Math.min(totalPages, p + 1))}
                  disabled={shiftPage === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-50 hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Keyingi
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Branch Stats Table (owner, supervisor, director) */}
      {['owner', 'supervisor', 'director'].includes(user?.role) && data?.branchStats && (
        <div className="card mt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 size={20} className="text-primary-500" /> Filiallar bo'yicha oylik hisobot
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th text-left">Filial</th>
                  <th className="table-th text-right cursor-pointer group select-none" onClick={() => handleSort('totalIncome')}>
                    <div className="flex items-center justify-end gap-1">Jami tushum {renderSortIcon('totalIncome')}</div>
                  </th>
                  <th className="table-th text-right cursor-pointer group select-none" onClick={() => handleSort('additionalServices')}>
                    <div className="flex items-center justify-end gap-1">Qo'sh. xizmatlar {renderSortIcon('additionalServices')}</div>
                  </th>
                  <th className="table-th text-right cursor-pointer group select-none" onClick={() => handleSort('terminal')}>
                    <div className="flex items-center justify-end gap-1">Terminal {renderSortIcon('terminal')}</div>
                  </th>
                  <th className="table-th text-right cursor-pointer group select-none" onClick={() => handleSort('qrcode')}>
                    <div className="flex items-center justify-end gap-1">QrCode {renderSortIcon('qrcode')}</div>
                  </th>
                  <th className="table-th text-right cursor-pointer group select-none" onClick={() => handleSort('transfer')}>
                    <div className="flex items-center justify-end gap-1">Kartadan kartaga {renderSortIcon('transfer')}</div>
                  </th>
                  <th className="table-th text-right text-red-500 cursor-pointer group select-none" onClick={() => handleSort('totalExpenses')}>
                    <div className="flex items-center justify-end gap-1">Xarajatlar {renderSortIcon('totalExpenses')}</div>
                  </th>
                  <th className="table-th text-right font-bold text-emerald-600 cursor-pointer group select-none" onClick={() => handleSort('balance')}>
                    <div className="flex items-center justify-end gap-1">Qoldiq {renderSortIcon('balance')}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedBranchStats.map((bs, idx) => (
                  <tr key={bs.branch.id} className="table-row hover:bg-slate-50 transition-colors">
                    <td className="table-td font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        {bs.branch.name}
                      </div>
                    </td>
                    <td className="table-td text-right font-bold text-slate-900">
                      {(bs.totalIncome || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">so'm</span>
                    </td>
                    <td className="table-td text-right text-slate-600">
                      {(bs.additionalServices || 0).toLocaleString()}
                    </td>
                    <td className="table-td text-right text-slate-600">
                      {(bs.terminal || 0).toLocaleString()}
                    </td>
                    <td className="table-td text-right text-slate-600">
                      {(bs.qrcode || 0).toLocaleString()}
                    </td>
                    <td className="table-td text-right text-slate-600">
                      {(bs.transfer || 0).toLocaleString()}
                    </td>
                    <td className="table-td text-right font-medium text-red-500">
                      {(bs.totalExpenses || 0).toLocaleString()}
                    </td>
                    <td className="table-td text-right font-bold text-emerald-600 bg-emerald-50/50">
                      {(bs.balance || 0).toLocaleString()} <span className="text-xs font-normal text-emerald-600/70">so'm</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top 5 Admins */}
      {['owner', 'supervisor', 'director'].includes(user?.role) && data?.topAdmins?.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-500" /> Top 5 Eng yaxshi adminlar
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
                    <td className="table-td font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        {ta.admin?.name}
                      </div>
                    </td>
                    <td className="table-td text-slate-600">{ta.admin?.branch?.name || '—'}</td>
                    <td className="table-td text-center font-medium text-slate-700">{ta.shiftCount} ta</td>
                    <td className="table-td text-right">
                      <span className="font-bold text-emerald-600">{ta.totalIncome?.toLocaleString()}</span>
                      <span className="text-xs font-medium text-slate-600 ml-1.5">so'm</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Shifts */}
      {user?.role === 'admin' && data?.monthlyShifts?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock size={20} className="text-primary-500" /> Oylik smenalar hisoboti
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
                    <td className="table-td font-medium text-slate-800">{shift.admin?.name}</td>
                    <td className="table-td">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${shift.shiftType === 'morning'
                        ? 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                        : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}>
                        {shift.shiftType === 'morning' ? 'Kunduzgi' : 'Tungi'}
                      </span>
                    </td>
                    <td className="table-td text-slate-600 font-medium text-xs">{format(new Date(shift.startTime), 'dd.MM, HH:mm')}</td>
                    <td className="table-td text-slate-600 font-medium text-xs">
                      {shift.endTime ? format(new Date(shift.endTime), 'dd.MM, HH:mm') : '—'}
                    </td>
                    <td className="table-td text-right font-bold text-emerald-600">
                      {shift.totalIncome.toLocaleString()}
                    </td>
                    <td className="table-td text-center text-slate-600 font-medium">{shift.totalBookings}</td>
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
