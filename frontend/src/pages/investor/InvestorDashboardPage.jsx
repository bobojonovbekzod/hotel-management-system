import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Building2, 
  Calendar, 
  Lock, 
  ShieldCheck, 
  BedDouble, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Eye
} from 'lucide-react';
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

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/investor/dashboard', {
        params: { month, branchId }
      });
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error("Dashboard ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [month, branchId]);

  const metrics = data?.metrics || {};
  const branches = data?.branches || [];

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
            Biriktirilgan filiallar tushumlari, xarajatlari va ulush ko'rsatkichlari nazorati
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {branches.length > 0 && (
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
          {/* Main KPI Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Jami Tushum (Revenue)</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {(metrics.totalRevenue || 0).toLocaleString('ru-RU')} <span className="text-sm font-medium text-slate-500">so'm</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                <span>Naqd: {(metrics.revenueByMethod?.cash || 0).toLocaleString('ru-RU')}</span>
                <span>Karta: {(metrics.revenueByMethod?.card || 0).toLocaleString('ru-RU')}</span>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Jami Xarajatlar</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <TrendingDown size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {(metrics.totalExpenses || 0).toLocaleString('ru-RU')} <span className="text-sm font-medium text-slate-500">so'm</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                <span>Filial va operatsion chiqimlar</span>
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Sof Foyda (Net Profit)</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Wallet size={18} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {(metrics.netProfit || 0).toLocaleString('ru-RU')} <span className="text-sm font-medium text-slate-500">so'm</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                <span>Tushum - Xarajat ayirmasi</span>
              </div>
            </div>

            {/* Investor Profit Share */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
              <div className="flex items-center justify-between text-indigo-200 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Sizning Ulushingiz ({metrics.sharePercentage || 0}%)</span>
                <div className="p-2 bg-white/10 rounded-xl">
                  <PieChart size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold">
                {(metrics.investorShareAmount || 0).toLocaleString('ru-RU')} <span className="text-sm font-normal text-indigo-200">so'm</span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-xs text-indigo-200">
                <span>Sof foydadagi tegishli summa</span>
              </div>
            </div>
          </div>

          {/* Secondary Cards: Occupancy & Expense Transparency */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Occupancy Rate Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <BedDouble className="text-indigo-600" size={20} /> Xonalar Bandlik Ko'rsatkichi
                  </h3>
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                    {metrics.occupancyRate || 0}% Band
                  </span>
                </div>
                <p className="text-slate-500 text-sm mb-6">
                  Filialdagi mavjud xonalarning real vaqtdagi bandlik darajasi.
                </p>
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden mb-4">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(metrics.occupancyRate || 0, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <div className="text-xs text-slate-500">Jami Xonalar</div>
                  <div className="text-lg font-bold text-slate-900">{metrics.totalRooms || 0} ta</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <div className="text-xs text-slate-500">Hozir Band</div>
                  <div className="text-lg font-bold text-indigo-600">{metrics.activeBookings || 0} ta</div>
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
        </>
      )}
    </div>
  );
}
