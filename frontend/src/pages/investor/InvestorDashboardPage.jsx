import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  Calendar, 
  Lock, 
  ShieldCheck, 
  Wallet, 
  Smartphone,
  CreditCard,
  LogOut,
  Eye,
  BedDouble,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function InvestorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [branchId, setBranchId] = useState('all');
  const [data, setData] = useState(null);
  const [chartMode, setChartMode] = useState('methods'); // 'methods' | 'overview'

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/investor/dashboard', {
        params: {
          month,
          branchId
        }
      });
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching investor dashboard:', error);
      toast.error('Dashboard ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [month, branchId]);

  const metrics = data?.metrics || {};
  const branches = data?.branches || [];

  // Mehmonxona oylik bandligi hisobi
  const totalBandDays = data?.occupancyStats?.reduce((sum, item) => sum + (item.band || 0), 0) || 0;
  const daysWithData = data?.occupancyStats?.filter(item => item.band !== null)?.length || 1;
  const totalAvailableDays = (metrics.totalRooms || 0) * daysWithData;
  const monthlyOccupancyRate = totalAvailableDays > 0 ? ((totalBandDays / totalAvailableDays) * 100).toFixed(1) : 0;
  const averagePrice = totalBandDays > 0 ? Math.round((metrics.totalRevenue || 0) / totalBandDays) : 0;

  // Owner dashboard uslubidagi gradient kartochkalar
  const kpis = [
    {
      label: 'Oylik tushum',
      value: (metrics.totalRevenue || 0).toLocaleString('ru-RU'),
      unit: "so'm",
      icon: DollarSign,
      gradient: 'linear-gradient(135deg, #7B5EA7 0%, #9B59B6 100%)',
      shadow: 'rgba(123, 94, 167, 0.4)',
    },
    {
      label: 'Kassa (Naqd)',
      value: (metrics.revenueByMethod?.cash || 0).toLocaleString('ru-RU'),
      unit: "so'm",
      icon: Wallet,
      gradient: 'linear-gradient(135deg, #2980b9 0%, #56CCF2 100%)',
      shadow: 'rgba(41, 128, 185, 0.4)',
    },
    {
      label: 'QrCode oylik',
      value: (metrics.revenueByMethod?.qrcode || 0).toLocaleString('ru-RU'),
      unit: "so'm",
      icon: Smartphone,
      gradient: 'linear-gradient(135deg, #F7971E 0%, #FFD200 100%)',
      shadow: 'rgba(247, 151, 30, 0.4)',
    },
    {
      label: 'Terminal oylik',
      value: (metrics.revenueByMethod?.card || 0).toLocaleString('ru-RU'),
      unit: "so'm",
      icon: CreditCard,
      gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      shadow: 'rgba(17, 153, 142, 0.4)',
    },
    {
      label: 'Kartadan kartaga',
      value: (metrics.revenueByMethod?.transfer || 0).toLocaleString('ru-RU'),
      unit: "so'm",
      icon: CreditCard,
      gradient: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)',
      shadow: 'rgba(74, 0, 224, 0.4)',
    },
    {
      label: 'Xarajat oylik',
      value: (metrics.totalExpenses || 0).toLocaleString('ru-RU'),
      unit: "so'm",
      icon: LogOut,
      gradient: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
      shadow: 'rgba(235, 51, 73, 0.4)',
    },
    {
      label: 'Sof foyda',
      value: (metrics.netProfit || 0).toLocaleString('ru-RU'),
      unit: "so'm",
      icon: TrendingUp,
      gradient: (metrics.netProfit || 0) >= 0 
        ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)' 
        : 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
      shadow: (metrics.netProfit || 0) >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
    }
  ];

  // Pie chart ma'lumotlari (To'lov turlari bo'yicha)
  const paymentMethodsPie = [
    { name: 'Kassa (Naqd)', value: metrics.revenueByMethod?.cash || 0, color: '#2980b9' },
    { name: 'QrCode', value: metrics.revenueByMethod?.qrcode || 0, color: '#F7971E' },
    { name: 'Terminal', value: metrics.revenueByMethod?.card || 0, color: '#10b981' },
    { name: 'Kartadan kartaga', value: metrics.revenueByMethod?.transfer || 0, color: '#8b5cf6' },
  ].filter(item => item.value > 0);

  // Tushum vs Chiqim taqsimoti
  const flowPie = [
    { name: 'Sof foyda', value: Math.max(0, metrics.netProfit || 0), color: '#10b981' },
    { name: 'Xarajat', value: metrics.totalExpenses || 0, color: '#eb3349' },
  ].filter(item => item.value > 0);

  const activePieData = chartMode === 'methods' ? paymentMethodsPie : flowPie;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-500/20">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Investor Read-Only Kabineti
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Investor Financial Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">
            Biriktirilgan filial tushumlari, to'lov turlari va xarajatlari nazorati
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {branches.length > 1 && (
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 text-sm">
              <Building2 size={16} className="text-indigo-400" />
              <select 
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer [&>option]:text-slate-900"
              >
                <option value="all">Barcha filiallar ({branches.length})</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-indigo-400" />
            <input 
              type="month" 
              value={month} 
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Main KPI Cards — Owner uslubidagi gradient kartochkalar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 sm:gap-4">
            {kpis.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl overflow-hidden relative transition-all duration-300 hover:-translate-y-1 p-3.5 flex flex-col items-center justify-center text-center"
                  style={{
                    background: card.gradient,
                    boxShadow: `0 8px 24px ${card.shadow}`,
                  }}
                >
                  <div className="flex flex-col items-center justify-center text-center w-full">
                    <p className="text-white/90 font-semibold text-xs sm:text-[13px] mb-1.5 truncate max-w-full">
                      {card.label}
                    </p>
                    <div className="flex items-center justify-center gap-1 my-1">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
                        <Icon size={16} className="text-white drop-shadow-sm" />
                      </div>
                    </div>
                    <div className="flex items-baseline justify-center gap-1 mt-1">
                      <span className="text-white font-extrabold text-base sm:text-lg tracking-tight drop-shadow-sm">
                        {card.value}
                      </span>
                      <span className="text-white/80 text-[10px] sm:text-xs font-medium">
                        {card.unit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Secondary Section: Pie Chart & Expense Transparency */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie Chart Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                    <PieIcon className="text-indigo-600" size={19} /> Moliyaviy Taqsimot
                  </h3>
                  {/* Mode switch */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                    <button
                      onClick={() => setChartMode('methods')}
                      className={`px-2 py-1 rounded-md transition-colors ${chartMode === 'methods' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      To'lovlar
                    </button>
                    <button
                      onClick={() => setChartMode('overview')}
                      className={`px-2 py-1 rounded-md transition-colors ${chartMode === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Kirim/Chiqim
                    </button>
                  </div>
                </div>
                <p className="text-slate-500 text-xs mb-3">
                  {chartMode === 'methods' 
                    ? "Yuqoridagi to'lov turlari (Naqd, QrCode, Terminal, O'tkazma) ulushi"
                    : "Sof foyda va umumiy xarajatlar mutanosibligi"}
                </p>

                <div className="h-56 w-full flex items-center justify-center">
                  {activePieData.length === 0 ? (
                    <div className="text-center text-slate-400 py-10 text-xs italic">
                      Ushbu oyda tahlil uchun ma'lumot mavjud emas
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {activePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                          formatter={(v) => [`${Number(v).toLocaleString('ru-RU')} so'm`, 'Summa']}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36} 
                          iconType="circle" 
                          wrapperStyle={{ fontSize: '11px', fontWeight: 500, color: '#475569' }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100 text-center mt-2">
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <div className="text-[11px] text-slate-500 font-medium">Jami Tushum</div>
                  <div className="text-sm font-bold text-slate-900">
                    {(metrics.totalRevenue || 0).toLocaleString('ru-RU')} so'm
                  </div>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl">
                  <div className="text-[11px] text-emerald-600 font-medium">Sof Foyda</div>
                  <div className={`text-sm font-bold ${(metrics.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {(metrics.netProfit || 0).toLocaleString('ru-RU')} so'm
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses List Transparency */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="text-slate-600" size={20} /> Shaffof Xarajatlar Tarixi (So'nggi chiqimlar)
                </h3>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Lock size={12} /> Faqat ko'rish rejimi
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Xarajat nomi</th>
                      <th className="px-4 py-3">Kategoriya</th>
                      <th className="px-4 py-3 text-right">Summa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.expenses || []).map((exp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{exp.title || "Operatsion xarajat"}</td>
                        <td className="px-4 py-3 text-slate-500">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {exp.category || "General"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600">
                          -{(exp.amount || 0).toLocaleString('ru-RU')} so'm
                        </td>
                      </tr>
                    ))}
                    {(!data?.expenses || data.expenses.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                          Ushbu oyda xarajatlar mavjud emas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mehmonxonaning bandligi grafigi (Xuddi Owner nikidek) */}
          {data?.occupancyStats?.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm mt-6">
              <div className="text-center mb-6 relative">
                <h3 className="text-[17px] font-bold text-slate-800 tracking-tight flex items-center justify-center gap-2">
                  <BedDouble className="text-indigo-600" size={20} /> Mehmonxonaning bandligi
                </h3>
                <p className="text-[13px] text-slate-500 font-medium mt-1">
                  Xonalar bo'yicha % nisbat .... <span className="text-emerald-600 font-semibold ml-1">({monthlyOccupancyRate}% oylik bandlik)</span> <span className="text-indigo-600 font-semibold ml-2">(O'rtacha narx: {averagePrice.toLocaleString('ru-RU')} so'm)</span>
                </p>
              </div>
              <div className="h-72 w-full mt-4">
                <ResponsiveContainer width="99%" height={280}>
                  <AreaChart
                    data={data.occupancyStats.map(item => ({
                      ...item,
                      percentage: (item.band !== null && metrics.totalRooms) 
                        ? parseFloat(((item.band / metrics.totalRooms) * 100).toFixed(1)) 
                        : null,
                      avgPrice: item.avgPrice || 0
                    }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorInvestorPercentage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={true} horizontal={true} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                      dy={10} 
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                      label={{ 
                        value: "Xonalar bo'yicha % bandlik", 
                        angle: -90, 
                        position: 'insideLeft', 
                        offset: -5, 
                        style: { textAnchor: 'middle', fill: '#475569', fontSize: 12, fontWeight: 600 } 
                      }}
                      ticks={[0, 25, 50, 75, 100, 125, 150]}
                      domain={[0, 150]}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const point = payload[0].payload;
                          const pointAvgPrice = point.avgPrice > 0 ? point.avgPrice : (point.band > 0 ? averagePrice : 0);
                          return (
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xl text-xs space-y-1.5 min-w-[180px]">
                              <p className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center justify-between">
                                <span>Sana: {label}</span>
                                {point.band !== null && (
                                  <span className="text-slate-500 font-normal">({point.band} ta xona)</span>
                                )}
                              </p>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 font-medium">Bandlik:</span>
                                <span className="font-bold text-blue-600">
                                  {point.percentage !== null ? `${point.percentage}%` : "Ma'lumot yo'q"}
                                </span>
                              </div>
                              {pointAvgPrice > 0 && (
                                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                                  <span className="text-slate-500 font-medium">O'rtacha narx:</span>
                                  <span className="font-bold text-emerald-600">
                                    {pointAvgPrice.toLocaleString('ru-RU')} so'm
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="linear"
                      dataKey="percentage"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorInvestorPercentage)"
                      connectNulls={false}
                      activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                      dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
