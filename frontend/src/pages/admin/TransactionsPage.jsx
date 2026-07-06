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

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-400">
          <Banknote size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Kassa (Tranzaksiyalar)</h1>
          <p className="text-slate-400">Barcha tushumlar va to'lovlar ro'yxati</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
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
              <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-emerald-500/10 border-emerald-500/20 md:col-span-1">
          <h3 className="text-emerald-400 font-semibold mb-2">Tanlangan kundagi jami tushum</h3>
          <p className="text-3xl font-bold text-white">{totalAmount.toLocaleString()} <span className="text-base font-normal text-slate-400">so'm</span></p>
          <p className="text-sm text-slate-500 mt-1">{transactions.length} ta to'lov</p>
        </div>
        
        <div className="card md:col-span-2 overflow-x-auto p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Yuklanmoqda...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center">
              <Search size={48} className="mb-4 text-slate-600" />
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
                  <th className="table-th text-right pr-6">Summa</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="table-row">
                    <td className="table-td pl-6">
                      <span className="text-white font-medium">{format(new Date(t.createdAt), 'HH:mm')}</span>
                      <span className="block text-xs text-slate-500">{format(new Date(t.createdAt), 'dd.MM.yyyy')}</span>
                    </td>
                    <td className="table-td">
                      {t.booking ? (
                        <div>
                          <span className="text-white font-medium">{t.booking.room?.roomNumber}-xona</span>
                          <span className="block text-xs text-slate-400">
                            {t.booking.primaryGuest?.firstName} {t.booking.primaryGuest?.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="table-td text-slate-300">
                      {t.booking?.room?.branch?.name || '-'}
                    </td>
                    <td className="table-td">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize
                        ${t.method === 'cash' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                        ${t.method === 'terminal' || t.method === 'karta' ? 'bg-blue-500/20 text-blue-400' : ''}
                        ${t.method === 'qrcode' ? 'bg-purple-500/20 text-purple-400' : ''}
                      `}>
                        {t.method}
                      </span>
                    </td>
                    <td className="table-td text-slate-300">
                      {t.booking?.admin ? `${t.booking.admin.name}` : '-'}
                    </td>
                    <td className="table-td text-right pr-6">
                      <span className="text-emerald-400 font-bold">+{t.amount.toLocaleString()}</span> so'm
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
