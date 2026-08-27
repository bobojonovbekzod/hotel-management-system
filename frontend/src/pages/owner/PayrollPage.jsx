import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Download, Printer, Filter, Calendar, Wallet, CheckCircle, Search, TrendingUp, TrendingDown, DollarSign, X, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatNumberInput, parseNumberInput } from '../../lib/formatters';

export default function PayrollPage() {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [filterBranch, setFilterBranch] = useState('');

  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const [filterMonth, setFilterMonth] = useState(currentMonth);

  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [financeUser, setFinanceUser] = useState(null);

  useEffect(() => {
    fetchBranches();
  }, [user]);

  useEffect(() => {
    fetchPayroll();
  }, [filterBranch, filterMonth]);

  const fetchBranches = async () => {
    if (user?.role === 'owner' || user?.role === 'director') {
      try {
        const res = await api.get('/branches');
        setBranches(res.data.data || []);
        if (user?.role === 'director' && user?.branchId) {
          setFilterBranch(String(user.branchId));
        } else if (res.data.data?.length > 0) {
          setFilterBranch(String(res.data.data[0].id));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const fetchPayroll = async () => {
    if (!filterBranch && user?.role === 'owner') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/payroll`, {
        params: { branchId: filterBranch, month: filterMonth }
      });
      setReport(res.data.data);
    } catch (err) {
      toast.error('Oylik hisobotini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const openFinanceModal = (userObj) => {
    setFinanceUser(userObj);
    setShowFinanceModal(true);
  };

  const closeFinanceModal = (shouldRefresh) => {
    setShowFinanceModal(false);
    setFinanceUser(null);
    if (shouldRefresh) fetchPayroll();
  };

  const exportExcel = () => {
    if (!report || report.length === 0) return toast.error('Ma\'lumot yo\'q');

    const dataToExport = report.map((item, idx) => ({
      "T/r": idx + 1,
      "F.I.O": item.user.name,
      "Lavozim": item.user.role,
      "Kunduzgi smena": item.stats.dayShifts,
      "Tungi smena": item.stats.nightShifts,
      "Kassa tushumi (so'm)": item.stats.totalShiftIncome,
      "KPI (%)": item.user.kpiPercentage || 0,
      "Asosiy oylik (so'm)": item.stats.baseSalary,
      "KPI daromadi (so'm)": item.stats.kpiEarnings,
      "Bonuslar (so'm)": item.stats.totalBonuses,
      "Ushlanmalar (so'm)": item.stats.totalAdvances + item.stats.totalPenalties,
      "Berilgan maosh (so'm)": item.stats.totalPaid,
      "To'lanishi kerak bo'lgan jami summa": item.stats.totalPayable
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);

    // Add columns width
    const wscols = [
      { wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 10 },
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 30 }
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Oylik Hisobot");
    XLSX.writeFile(wb, `Oylik_Hisobot_${filterMonth}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalAdvances = report.reduce((sum, item) => sum + item.stats.totalAdvances, 0);
  const totalPayable = report.reduce((sum, item) => sum + item.stats.totalPayable, 0);
  
  const [year, monthNum] = filterMonth.split('-');
  const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  const monthName = months[parseInt(monthNum, 10) - 1];
  const branchName = branches.find(b => String(b.id) === String(filterBranch))?.name || 'Barcha filiallar';

  return (
    <div className="p-4 sm:p-8 space-y-6">

      {/* Print View Only */}
      <div className="hidden print:block print-area p-8 text-black bg-white min-h-screen font-serif">
        <h1 className="text-2xl font-bold mb-1 uppercase text-center text-[#2f5597] tracking-wide">
          FAMILY HOTELS ({branchName})
        </h1>
        <div className="w-full flex justify-center mb-6">
          <p className="text-center font-bold text-[#4472c4] italic border-b border-[#8faadc] inline-block px-10 pb-1 uppercase text-sm">
            oylik maoshni olganligi to'g'risida blank
          </p>
        </div>

        <div className="mb-4 space-y-4 ml-10">
          <div className="flex items-center gap-2 font-semibold text-lg border-b border-black inline-block pr-10 pb-1">
            <span role="img" aria-label="calendar">📅</span> Oy: <span className="underline decoration-dotted">{monthName}. {year} uchun</span>
          </div>
        </div>

        <table className="w-full border-collapse mb-10 text-sm mt-6 mx-auto" style={{ maxWidth: '95%' }}>
          <thead>
            <tr className="bg-white">
              <th className="border border-black p-2 font-bold w-10 text-center">№</th>
              <th className="border border-black p-2 font-bold text-center">Xodimning<br/>F.I.Sh.</th>
              <th className="border border-black p-2 font-bold text-center">Lavozimi</th>
              <th className="border border-black p-2 font-bold text-center">Avans<br/>Summa<br/>(so'm)</th>
              <th className="border border-black p-2 font-bold text-center">Olingan<br/>sana</th>
              <th className="border border-black p-2 font-bold text-center">Xodim<br/>imzosi</th>
              <th className="border border-black p-2 font-bold text-center">Ostatok<br/>oylik<br/>summa</th>
              <th className="border border-black p-2 font-bold text-center">Olingan<br/>sana</th>
              <th className="border border-black p-2 font-bold text-center w-24">Xodim<br/>imzosi</th>
            </tr>
          </thead>
          <tbody>
            {report.map((item, idx) => (
              <tr key={item.user.id}>
                <td className="border border-black p-2 text-center font-medium">{idx + 1}</td>
                <td className="border border-black p-2 font-semibold text-center">{item.user.name}</td>
                <td className="border border-black p-2 text-center capitalize font-medium">{item.user.role}</td>
                <td className="border border-black p-2 text-right tabular-nums pr-4 font-semibold">{item.stats.totalAdvances ? item.stats.totalAdvances.toLocaleString() : ''}</td>
                <td className="border border-black p-2 text-center"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2 text-right tabular-nums pr-4 font-bold text-base">{item.stats.totalPayable ? item.stats.totalPayable.toLocaleString() : ''}</td>
                <td className="border border-black p-2 text-center"></td>
                <td className="border border-black p-2"></td>
              </tr>
            ))}
            {/* Total Row */}
            <tr className="bg-white font-bold text-base">
              <td colSpan="3" className="border border-black p-2 text-right pr-4">Jami:</td>
              <td className="border border-black p-2 text-right tabular-nums pr-4">{totalAdvances ? totalAdvances.toLocaleString() : ''}</td>
              <td colSpan="2" className="border border-black p-2"></td>
              <td className="border border-black p-2 text-right tabular-nums pr-4">{totalPayable ? totalPayable.toLocaleString() : ''}</td>
              <td colSpan="2" className="border border-black p-2"></td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8 space-y-6 text-lg font-medium ml-10">
          <div className="flex items-center gap-2">
            <span role="img" aria-label="pin" className="text-xl">📌</span> Oylik maoshni berish uchun mas'ul shaxs:
          </div>
          <div className="flex items-center gap-2 ml-8">
            <span className="underline decoration-black underline-offset-4">F.I.Sh.:</span> <div className="border-b border-black flex-1 max-w-sm ml-2"></div>
          </div>
          <div className="flex items-center gap-2 ml-8">
            <span className="underline decoration-black underline-offset-4">Lavozimi:</span> <div className="border-b border-black flex-1 max-w-sm ml-2"></div>
          </div>
          <div className="flex items-center gap-2 ml-8">
            <span className="underline decoration-black underline-offset-4">Imzo:</span> <div className="border-b border-black flex-1 max-w-sm ml-2"></div>
          </div>
        </div>
      </div>

      {/* Screen View */}
      <div className="print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <Wallet className="text-emerald-400" size={32} /> Oylik maosh
            </h1>
            <p className="text-slate-600 mt-1">Xodimlarning oylik maoshlari va jarimalarni boshqarish</p>
          </div>

          {user?.role === 'owner' && (
            <div className="flex gap-2">
              <button onClick={exportExcel} className="btn-secondary flex items-center gap-2">
                <Download size={18} /> <span className="hidden sm:inline">Excel</span>
              </button>
              <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
                <Printer size={18} /> <span className="hidden sm:inline">Chop etish</span>
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-slate-800">
            <Filter size={18} className="text-emerald-400" />
            <span className="font-medium">Filtrlar:</span>
          </div>

          {(user?.role === 'owner' || user?.role === 'director') && (
            <select
              className="input-field max-w-[200px]"
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
            >
              {/* <option value="">Barcha filiallar</option> */}
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center relative">
            <input
              type="month"
              className="input-field cursor-pointer"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              onClick={(e) => e.target.showPicker && e.target.showPicker()}
            />
          </div>
        </div>

        {/* Report Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center text-slate-600">
                <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
                Hisoblanmoqda...
              </div>
            ) : report.length === 0 ? (
              <div className="p-12 text-center text-slate-600">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p>Bu oy uchun ma'lumot topilmadi</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="table-th text-left">Xodim</th>
                    <th className="table-th text-center">Ish kunlari / Smenalar</th>
                    <th className="table-th text-right">Kassa Tushumi</th>
                    <th className="table-th text-right border-l border-slate-300 bg-indigo-500/5 text-indigo-300">Asosiy Oylik</th>
                    <th className="table-th text-right border-l border-slate-300 bg-indigo-500/5 text-indigo-300">KPI Daromadi</th>
                    <th className="table-th text-right border-l border-slate-300 bg-emerald-500/5 text-emerald-300">Bonus</th>
                    <th className="table-th text-right border-l border-slate-300 bg-red-500/5 text-red-300">Jarima</th>
                    <th className="table-th text-right border-l border-slate-300 bg-orange-500/5 text-orange-300">Avans</th>
                    <th className="table-th text-right border-l border-slate-300 bg-emerald-500/10 text-emerald-300 font-bold">Qoldiq</th>
                    <th className="table-th text-center border-l border-slate-200">Boshqaruv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {report.map((item) => (
                    <tr key={item.user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-td">
                        <div className="flex flex-col max-w-[200px]">
                          <span className="font-bold text-slate-900">{item.user.name}</span>
                          <span className="text-[10px] text-slate-600 uppercase tracking-wider text-right mt-0.5">{item.user.role}</span>
                        </div>
                      </td>
                      <td className="table-td text-center">
                        <div className="flex flex-col gap-1 text-xs items-center">
                          {/* Davomat */}
                          {item.stats.attendances > 0 && (
                            <span className="text-blue-600 font-medium" title="Davomat">🟢 {item.stats.attendances} kun kelgan</span>
                          )}
                          
                          {/* Tozalik */}
                          {item.stats.cleanedRoomsCount > 0 && (
                            <span className="text-purple-600 font-medium" title="Tozalangan xonalar">🧽 {item.stats.cleanedRoomsCount} ta xona</span>
                          )}

                          {/* Smenalar */}
                          {(item.stats.dayShifts > 0 || item.stats.nightShifts > 0) && (
                            <div className="flex gap-2 justify-center">
                              {item.stats.dayShifts > 0 && <span className="text-amber-500 font-medium" title="Kunduzgi smena">☀️ {item.stats.dayShifts}</span>}
                              {item.stats.nightShifts > 0 && <span className="text-indigo-500 font-medium" title="Tungi smena">🌙 {item.stats.nightShifts}</span>}
                            </div>
                          )}

                          {/* Agar hech narsa bo'lmasa */}
                          {!item.stats.attendances && !item.stats.cleanedRoomsCount && !item.stats.dayShifts && !item.stats.nightShifts && (
                            <span className="text-slate-500">{item.user.salaryType === 'static' ? 'Statik oylik' : '—'}</span>
                          )}
                        </div>
                      </td>
                      <td className="table-td text-right font-mono text-sm text-slate-800">
                        {item.stats.totalShiftIncome > 0 ? item.stats.totalShiftIncome.toLocaleString() : '-'}
                      </td>

                      <td className="table-td text-right border-l border-slate-300">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-indigo-300">
                            {item.stats.baseSalary.toLocaleString()}
                          </span>
                          {item.user.appliedFixedSalary && (
                            <span className="text-[9px] text-slate-500 max-w-[120px] text-right mt-0.5" title={`Filial tushumi bo'yicha maxsus fiksa oylik belgilangan`}>
                              (Maxsus Fiksa)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="table-td text-right border-l border-slate-300">
                        {item.stats.kpiEarnings > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold text-emerald-400">
                              {item.stats.kpiEarnings.toLocaleString()}
                            </span>
                            {item.user.appliedKpiThreshold ? (
                              <span className="text-[9px] text-slate-500 max-w-[120px] text-right mt-0.5" title={`Filialning umumiy kassasi: ${item.user.branchTotalIncomeForKpi?.toLocaleString()} so'm\nBelgilangan KPI qadam: ${item.user.appliedKpiThreshold?.toLocaleString()} so'm = ${item.user.kpiPercentage}%`}>
                                (Tushum {item.user.branchTotalIncomeForKpi >= 1000000 ? (item.user.branchTotalIncomeForKpi/1000000).toFixed(1)+'M' : item.user.branchTotalIncomeForKpi} ➔ {item.user.kpiPercentage}%)
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 mt-0.5">({item.user.kpiPercentage}%)</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-slate-700 text-sm">—</span>
                            {item.user.appliedFixedSalary ? (
                               <span className="text-[9px] text-slate-500 max-w-[120px] text-right mt-0.5">
                                 (Maxsus fiksa qo'llanildi)
                               </span>
                            ) : item.user.appliedKpiThreshold === null && item.user.branchTotalIncomeForKpi > 0 && item.user.role === 'admin' && (
                              <span className="text-[9px] text-slate-500 max-w-[120px] text-right mt-0.5">
                                (KPI rejasiga yetilmadi: {item.user.branchTotalIncomeForKpi >= 1000000 ? (item.user.branchTotalIncomeForKpi/1000000).toFixed(1)+'M' : item.user.branchTotalIncomeForKpi})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="table-td text-right border-l border-slate-300">
                        {item.stats.totalBonuses > 0 ? (
                          <span className="text-sm font-semibold text-emerald-400">
                            {item.stats.totalBonuses.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-700 text-sm">—</span>
                        )}
                      </td>

                      <td className="table-td text-right border-l border-slate-300">
                        {item.stats.totalPenalties > 0 ? (
                          <span className="text-sm font-semibold text-red-400">
                            {item.stats.totalPenalties.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-700 text-sm">—</span>
                        )}
                      </td>

                      <td className="table-td text-right border-l border-slate-300">
                        {item.stats.totalAdvances > 0 ? (
                          <span className="text-sm font-semibold text-orange-400">
                            {item.stats.totalAdvances.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-700 text-sm">—</span>
                        )}
                      </td>

                      <td className="table-td text-right border-l border-slate-300 bg-emerald-500/5">
                        <span className="text-base font-bold text-emerald-400">
                          {item.stats.totalPayable.toLocaleString()}
                        </span>
                      </td>

                      <td className="table-td text-center border-l border-slate-200">
                        <button
                          onClick={() => openFinanceModal(item.user)}
                          title="Moliya"
                          className="p-2 text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/30 rounded-lg transition-colors flex items-center justify-center mx-auto"
                        >
                          <DollarSign size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Finance Action Modal */}
      {showFinanceModal && financeUser && (
        <FinanceActionModal
          user={financeUser}
          month={filterMonth}
          onClose={closeFinanceModal}
          currentUser={user}
        />
      )}
    </div>
  );
}

export function FinanceActionModal({ user, month, onClose, currentUser }) {
  const [txType, setTxType] = useState('penalty');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Fetch user history for the selected month to show recent actions
    fetchHistory();
  }, [user.id, month]);

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/payroll/${user.id}`);
      // In a real app we'd filter res.data.data.transactions by month, 
      // but for simplicity we'll just show the last 5 overall or filtered
      setHistory(res.data.data.transactions.slice(0, 5));
    } catch (e) {
      // ignore
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(parseNumberInput(txAmount));
    if (!parsedAmount || parsedAmount <= 0) return toast.error('Summani kiriting');

    setSubmitting(true);
    try {
      await api.post('/payroll', {
        userId: user.id,
        type: txType,
        amount: parsedAmount,
        description: txDesc
      });
      toast.success('Saqlandi');
      onClose(true); // close and refresh
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xatolik yuz berdi');
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Ushbu amaliyotni o\'chirishni xohlaysizmi?')) return;
    setSubmitting(true);
    try {
      await api.delete(`/payroll/${id}`);
      toast.success('Amaliyot o\'chirildi');
      // Update history list and close modal to refresh payroll
      fetchHistory();
      onClose(true); 
    } catch (err) {
      toast.error(err.response?.data?.message || 'O\'chirishda xatolik yuz berdi');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="modal-content w-full max-w-lg p-0 bg-white border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-white shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="text-indigo-400" /> {user.name} - Moliya
          </h2>
          <button onClick={() => onClose(false)} className="p-2 text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 rounded-lg hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Amaliyot turini tanlang</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTxType('penalty')}
                  className={`py-3 rounded-xl text-sm font-bold transition-all border flex flex-col items-center justify-center gap-1 ${
                    txType === 'penalty'
                      ? 'bg-red-500/20 border-red-500 text-red-500 shadow-md'
                      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <TrendingDown size={20} />
                  <span>Jarima (- )</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTxType('advance')}
                  className={`py-3 rounded-xl text-sm font-bold transition-all border flex flex-col items-center justify-center gap-1 ${
                    txType === 'advance'
                      ? 'bg-orange-500/20 border-orange-500 text-orange-500 shadow-md'
                      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Wallet size={20} />
                  <span>Avans (- )</span>
                </button>

                {currentUser?.role === 'owner' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setTxType('bonus')}
                      className={`py-3 rounded-xl text-sm font-bold transition-all border flex flex-col items-center justify-center gap-1 ${
                        txType === 'bonus'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-md'
                          : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <TrendingUp size={20} />
                      <span>Bonus (+ )</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('salary_payment')}
                      className={`py-3 rounded-xl text-sm font-bold transition-all border flex flex-col items-center justify-center gap-1 ${
                        txType === 'salary_payment'
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-500 shadow-md'
                          : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle size={20} />
                      <span>Oylik to'lash</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="label">Summa (so'm)</label>
              <input type="text" inputMode="decimal" className="input-field text-lg font-bold text-slate-900 bg-slate-100" placeholder="Masalan: 100 000" value={formatNumberInput(txAmount)} onChange={e => setTxAmount(parseNumberInput(e.target.value))} required />
            </div>

            <div>
              <label className="label">Izoh (ixtiyoriy)</label>
              <textarea className="input-field min-h-[80px]" placeholder="Sababi..." value={txDesc} onChange={e => setTxDesc(e.target.value)}></textarea>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => onClose(false)} className="btn-secondary flex-1">Bekor qilish</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 text-white font-bold">
                {submitting ? 'Saqlanmoqda...' : 'Tasdiqlash va Saqlash'}
              </button>
            </div>
          </form>

          {history.length > 0 && (
            <div className="mt-8">
              <p className="text-xs uppercase text-slate-600 font-bold mb-3 tracking-wider">So'nggi operatsiyalar</p>
              <div className="space-y-2">
                {history.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-300">
                    <div className="flex-1">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md mr-2 ${tx.type === 'penalty' ? 'text-red-400 bg-red-500/10' :
                        tx.type === 'advance' ? 'text-orange-400 bg-orange-500/10' :
                          tx.type === 'bonus' ? 'text-emerald-400 bg-emerald-500/10' :
                            tx.type === 'salary_payment' ? 'text-indigo-400 bg-indigo-500/10' :
                              'text-slate-600 bg-slate-500/10'
                        }`}>
                        {tx.type === 'penalty' ? 'Jarima' : tx.type === 'advance' ? 'Avans' : tx.type === 'bonus' ? 'Bonus' : tx.type === 'salary_payment' ? 'Oylik' : tx.type}
                      </span>
                      <span className="text-slate-600 text-xs">{new Date(tx.date).toLocaleDateString()}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-slate-900 mr-3">{tx.amount.toLocaleString()}</span>
                    {(currentUser?.role === 'owner' || currentUser?.role === 'director') && (
                      <button 
                        type="button" 
                        onClick={() => handleDelete(tx.id)} 
                        disabled={submitting} 
                        className="text-slate-600 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-md transition-colors" 
                        title="O'chirish"
                      >
                         <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
