import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Banknote, Building2, Calendar as CalendarIcon, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({
    branchId: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (user?.role === 'owner') {
      fetchBranches();
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data?.data || []);
    } catch {}
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions', { params: filters });
      setTransactions(res.data.data || []);
    } catch (err) {
      toast.error('Tranzaksiyalarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  const terminalIncome = transactions.filter(t => t.type === 'income' && (t.method === 'terminal' || t.method === 'karta')).reduce((sum, t) => sum + t.amount, 0);
  const qrcodeIncome = transactions.filter(t => t.type === 'income' && t.method === 'qrcode').reduce((sum, t) => sum + t.amount, 0);
  const bankIncome = terminalIncome + qrcodeIncome;
  
  const cashIncome = totalIncome - bankIncome;
  const cashBalance = cashIncome - totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-400">
          <Banknote size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kassa (Tranzaksiyalar)</h1>
          <p className="text-slate-600">Barcha tushumlar va to'lovlar ro'yxati</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CalendarIcon size={16} /> Sana bo'yicha filter
            </label>
            <input
              type="date"
              className="input-field"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          {user?.role === 'owner' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Building2 size={16} /> Filial bo'yicha filter
              </label>
              <select
                className="input-field"
                value={filters.branchId}
                onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value }))}
              >
                <option value="">Barcha filiallar</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="card p-0 bg-white border border-slate-200 overflow-hidden mb-8">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800/60">
          
          <div className="flex-1 p-5 text-center md:text-left bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
            <p className="text-sm font-medium text-slate-600 mb-1">Jami Tushum</p>
            <p className="text-2xl font-bold text-slate-900">{totalIncome.toLocaleString()}</p>
          </div>

          <div className="flex-1 p-5 text-center md:text-left hover:bg-slate-50 transition-colors">
            <p className="text-sm font-medium text-slate-600 mb-1">Terminal</p>
            <p className="text-2xl font-bold text-slate-900">{terminalIncome.toLocaleString()}</p>
          </div>

          <div className="flex-1 p-5 text-center md:text-left hover:bg-slate-50 transition-colors">
            <p className="text-sm font-medium text-slate-600 mb-1">QR Code</p>
            <p className="text-2xl font-bold text-slate-900">{qrcodeIncome.toLocaleString()}</p>
          </div>

          <div className="flex-1 p-5 text-center md:text-left hover:bg-slate-50 transition-colors">
            <p className="text-sm font-medium text-slate-600 mb-1">Xarajatlar</p>
            <p className="text-2xl font-bold text-rose-400">{totalExpense.toLocaleString()}</p>
          </div>

          <div className={`flex-1 p-5 text-center md:text-left transition-colors ${cashBalance >= 0 ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'bg-red-500/5 hover:bg-red-500/10'}`}>
            <p className="text-sm font-medium text-slate-600 mb-1">Naqd Qoldiq</p>
            <p className={`text-2xl font-bold ${cashBalance >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{cashBalance.toLocaleString()}</p>
          </div>

        </div>
      </div>
      
      <div className="grid grid-cols-1">
        <div className="card overflow-x-auto p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-600">Yuklanmoqda...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-600 flex flex-col items-center">
              <Search size={48} className="mb-4 text-slate-700" />
              Bu sanada hech qanday tranzaksiya topilmadi
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th pl-6">Vaqt</th>
                  <th className="table-th">Xona / Mijoz</th>
                  <th className="table-th">Filial</th>
                  <th className="table-th">To'lov usuli</th>
                  <th className="table-th">Qabul qildi</th>
                  <th className="table-th">Turi</th>
                  <th className="table-th text-right pr-6">Summa</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="table-row">
                    <td className="table-td pl-6">
                      <span className="text-slate-900 font-medium">{format(new Date(t.createdAt), 'HH:mm')}</span>
                      <span className="block text-xs text-slate-600">{format(new Date(t.createdAt), 'dd.MM.yyyy')}</span>
                    </td>
                    <td className="table-td">
                      <span className="text-slate-900 font-medium">{t.details}</span>
                    </td>
                    <td className="table-td text-slate-800">
                      {t.branchName}
                    </td>
                    <td className="table-td">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize
                        ${t.method === 'cash' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                        ${t.method === 'terminal' || t.method === 'karta' ? 'bg-blue-500/20 text-blue-400' : ''}
                        ${t.method === 'qrcode' ? 'bg-purple-500/20 text-purple-400' : ''}
                        ${t.method === '-' ? 'bg-slate-500/20 text-slate-600' : ''}
                      `}>
                        {t.method}
                      </span>
                    </td>
                    <td className="table-td text-slate-800">
                      {t.adminName}
                    </td>
                    <td className="table-td">
                      {t.type === 'income' ? (
                        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full text-xs font-medium">Kirim</span>
                      ) : (
                        <span className="bg-rose-500/20 text-rose-400 px-2 py-1 rounded-full text-xs font-medium">Chiqim</span>
                      )}
                    </td>
                    <td className="table-td text-right pr-6">
                      {t.type === 'income' ? (
                        <span className="text-emerald-400 font-bold">+{t.amount.toLocaleString()}</span>
                      ) : (
                        <span className="text-rose-400 font-bold">-{t.amount.toLocaleString()}</span>
                      )}
                       <span className="text-slate-600 text-xs ml-1">so'm</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
