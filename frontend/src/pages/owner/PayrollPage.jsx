import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Download, Printer, Filter, Calendar, Wallet, CheckCircle, Search, TrendingUp, TrendingDown, DollarSign, X } from 'lucide-react';
import * as XLSX from 'xlsx';

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
    if (!filterBranch && user?.role === 'owner') return;
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

  return (
    <div className="p-4 sm:p-8 space-y-6">

      {/* Print View Only */}
      <div className="print-only hidden p-8 text-black bg-white min-h-screen">
        <h1 className="text-2xl font-bold mb-2 uppercase text-center">Oylik maosh vedomosti</h1>
        <p className="text-center mb-6 font-semibold">
          Oy: {filterMonth} | Filial: {branches.find(b => String(b.id) === String(filterBranch))?.name || 'Barchasi'}
        </p>

        <table className="w-full border-collapse mb-10 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 font-bold w-10 text-center">T/r</th>
              <th className="border border-black p-2 font-bold text-left">F.I.O</th>
              <th className="border border-black p-2 font-bold text-left">Lavozim</th>
              <th className="border border-black p-2 font-bold text-right">Asosiy maosh</th>
              <th className="border border-black p-2 font-bold text-right">KPI qo'shimcha</th>
              <th className="border border-black p-2 font-bold text-right">Qolgan summa</th>
              <th className="border border-black p-2 font-bold w-32 text-center">Imzo</th>
            </tr>
          </thead>
          <tbody>
            {report.map((item, idx) => (
              <tr key={item.user.id}>
                <td className="border border-black p-2 text-center">{idx + 1}</td>
                <td className="border border-black p-2 font-bold">{item.user.name}</td>
                <td className="border border-black p-2 uppercase text-xs">{item.user.role}</td>
                <td className="border border-black p-2 text-right">{item.stats.baseSalary.toLocaleString()}</td>
                <td className="border border-black p-2 text-right">{item.stats.kpiEarnings.toLocaleString()}</td>
                <td className="border border-black p-2 text-right font-bold text-lg">{item.stats.totalPayable.toLocaleString()}</td>
                <td className="border border-black p-4"></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-end mt-20">
          <div className="text-center">
            <div className="w-48 border-b border-black mb-2"></div>
            <p className="font-bold text-sm uppercase">Tashkilot rahbari (M.O')</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-black mb-2"></div>
            <p className="font-bold text-sm uppercase">Buxgalter / Kassa</p>
          </div>
        </div>
      </div>

      {/* Screen View */}
      <div className="hide-on-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Wallet className="text-emerald-400" size={32} /> Oylik maosh
            </h1>
            <p className="text-slate-400 mt-1">Xodimlarning oylik maoshlari va jarimalarni boshqarish</p>
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
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-slate-300">
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center text-slate-400">
                <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
                Hisoblanmoqda...
              </div>
            ) : report.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p>Bu oy uchun ma'lumot topilmadi</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800/50">
                    <th className="table-th text-left">Xodim</th>
                    <th className="table-th text-center">Smenalar</th>
                    <th className="table-th text-right">Kassa Tushumi</th>
                    <th className="table-th text-right border-l border-slate-700 bg-indigo-500/5 text-indigo-300">Asosiy Oylik</th>
                    <th className="table-th text-right border-l border-slate-700 bg-indigo-500/5 text-indigo-300">KPI Daromadi</th>
                    <th className="table-th text-right border-l border-slate-700 bg-emerald-500/5 text-emerald-300">Bonus</th>
                    <th className="table-th text-right border-l border-slate-700 bg-red-500/5 text-red-300">Jarima</th>
                    <th className="table-th text-right border-l border-slate-700 bg-orange-500/5 text-orange-300">Avans</th>
                    <th className="table-th text-right border-l border-slate-700 bg-emerald-500/10 text-emerald-300 font-bold">Qoldiq</th>
                    <th className="table-th text-center border-l border-slate-800">Boshqaruv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {report.map((item) => (
                    <tr key={item.user.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="table-td">
                        <div className="flex flex-col max-w-[200px]">
                          <span className="font-bold text-white">{item.user.name}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider text-right mt-0.5">{item.user.role}</span>
                        </div>
                      </td>
                      <td className="table-td text-center">
                        {item.user.salaryType === 'per_shift' ? (
                          <div className="text-xs">
                            <span className="text-amber-400 mr-2" title="Kunduzgi smena">☀️ {item.stats.dayShifts}</span>
                            <span className="text-indigo-400" title="Tungi smena">🌙 {item.stats.nightShifts}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Statik oylik</span>
                        )}
                      </td>
                      <td className="table-td text-right font-mono text-sm text-slate-300">
                        {item.stats.totalShiftIncome > 0 ? item.stats.totalShiftIncome.toLocaleString() : '-'}
                      </td>

                      <td className="table-td text-right border-l border-slate-700">
                        <span className="text-sm font-bold text-indigo-300">
                          {item.stats.baseSalary.toLocaleString()}
                        </span>
                      </td>

                      <td className="table-td text-right border-l border-slate-700">
                        {item.stats.kpiEarnings > 0 ? (
                          <span className="text-sm font-semibold text-emerald-400">
                            {item.stats.kpiEarnings.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-sm">—</span>
                        )}
                      </td>

                      <td className="table-td text-right border-l border-slate-700">
                        {item.stats.totalBonuses > 0 ? (
                          <span className="text-sm font-semibold text-emerald-400">
                            {item.stats.totalBonuses.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-sm">—</span>
                        )}
                      </td>

                      <td className="table-td text-right border-l border-slate-700">
                        {item.stats.totalPenalties > 0 ? (
                          <span className="text-sm font-semibold text-red-400">
                            {item.stats.totalPenalties.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-sm">—</span>
                        )}
                      </td>

                      <td className="table-td text-right border-l border-slate-700">
                        {item.stats.totalAdvances > 0 ? (
                          <span className="text-sm font-semibold text-orange-400">
                            {item.stats.totalAdvances.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-sm">—</span>
                        )}
                      </td>

                      <td className="table-td text-right border-l border-slate-700 bg-emerald-500/5">
                        <span className="text-base font-bold text-emerald-400">
                          {item.stats.totalPayable.toLocaleString()}
                        </span>
                      </td>

                      <td className="table-td text-center border-l border-slate-800/50">
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

function FinanceActionModal({ user, month, onClose, currentUser }) {
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
    if (!txAmount || Number(txAmount) <= 0) return toast.error('Summani kiriting');

    setSubmitting(true);
    try {
      await api.post('/payroll', {
        userId: user.id,
        type: txType,
        amount: Number(txAmount),
        description: txDesc
      });
      toast.success('Saqlandi');
      onClose(true); // close and refresh
    } catch (err) {
      toast.error('Xatolik yuz berdi');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="modal-content w-full max-w-lg p-0 bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900/80">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-indigo-400" /> {user.name} - Moliya
          </h2>
          <button onClick={() => onClose(false)} className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-lg hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Amaliyot turini tanlang</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setTxType('penalty')} className={`py-3 rounded-xl text-sm font-semibold transition-all border ${txType === 'penalty' ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                  <TrendingDown size={18} className="mx-auto mb-1" /> Jarima (- )
                </button>
                {currentUser?.role === 'owner' && (
                  <>
                    <button type="button" onClick={() => setTxType('advance')} className={`py-3 rounded-xl text-sm font-semibold transition-all border ${txType === 'advance' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                      <Wallet size={18} className="mx-auto mb-1" /> Avans (- )
                    </button>
                    <button type="button" onClick={() => setTxType('bonus')} className={`py-3 rounded-xl text-sm font-semibold transition-all border ${txType === 'bonus' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                      <TrendingUp size={18} className="mx-auto mb-1" /> Bonus (+ )
                    </button>
                    <button type="button" onClick={() => setTxType('salary_payment')} className={`py-3 rounded-xl text-sm font-semibold transition-all border ${txType === 'salary_payment' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                      <CheckCircle size={18} className="mx-auto mb-1" /> Oylik to'lash
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="label">Summa (so'm)</label>
              <input type="number" className="input-field text-lg font-bold text-white bg-slate-950" placeholder="100000" value={txAmount} onChange={e => setTxAmount(e.target.value)} required />
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
              <p className="text-xs uppercase text-slate-500 font-bold mb-3 tracking-wider">So'nggi operatsiyalar</p>
              <div className="space-y-2">
                {history.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md mr-2 ${tx.type === 'penalty' ? 'text-red-400 bg-red-500/10' :
                        tx.type === 'advance' ? 'text-orange-400 bg-orange-500/10' :
                          tx.type === 'bonus' ? 'text-emerald-400 bg-emerald-500/10' :
                            tx.type === 'salary_payment' ? 'text-indigo-400 bg-indigo-500/10' :
                              'text-slate-400 bg-slate-500/10'
                        }`}>
                        {tx.type === 'penalty' ? 'Jarima' : tx.type === 'advance' ? 'Avans' : tx.type === 'bonus' ? 'Bonus' : tx.type === 'salary_payment' ? 'Oylik' : tx.type}
                      </span>
                      <span className="text-slate-400 text-xs">{new Date(tx.date).toLocaleDateString()}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-white">{tx.amount.toLocaleString()}</span>
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
