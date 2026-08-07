import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Banknote, Building2, Calendar as CalendarIcon, Search, Clock, User, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import EditPaymentModal from '../../components/admin/EditPaymentModal';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [groupedData, setGroupedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({
    branchId: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  
  const [editingTransaction, setEditingTransaction] = useState(null);

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
    if (user?.role === 'owner' && !filters.branchId) {
      setGroupedData([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.get('/transactions', { params: filters });
      setGroupedData(res.data.data || []);
    } catch (err) {
      toast.error('Tranzaksiyalarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  };

  // Umumiy jami summalarni hisoblash
  const grandTotalIncome = groupedData.reduce((sum, group) => sum + group.stats.totalIncome, 0);
  const grandTerminal = groupedData.reduce((sum, group) => sum + group.stats.terminal, 0);
  const grandQrcode = groupedData.reduce((sum, group) => sum + group.stats.qrcode, 0);
  const grandTransfer = groupedData.reduce((sum, group) => sum + group.stats.transfer, 0);
  const grandExpenses = groupedData.reduce((sum, group) => sum + group.stats.expenses, 0);
  const grandCashBalance = groupedData.reduce((sum, group) => sum + group.stats.qoldiq, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-400">
          <Banknote size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kassa (Tranzaksiyalar)</h1>
          <p className="text-slate-600">Smenalar va adminlar bo'yicha kirim-chiqim hisoboti</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CalendarIcon size={16} /> Sana bo'yicha filter
            </label>
            <DatePicker
              selected={new Date(filters.date)}
              onChange={(date) => setFilters(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }))}
              dateFormat="dd/MM/yyyy"
              className="input-field"
              portalId="root"
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

      {/* UMUMIY HISOBOT */}
      <div className="card p-0 bg-white border border-slate-200 overflow-hidden mb-8">
        <div className="bg-slate-50 border-b border-slate-200 p-3">
          <h3 className="font-bold text-slate-800 text-center uppercase text-sm tracking-wider">Tanlangan sana bo'yicha umumiy hisobot</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          <div className="p-4 text-center bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors col-span-2 md:col-span-1">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">Jami Tushum</p>
            <p className="text-xl font-bold text-slate-900">{grandTotalIncome.toLocaleString()}</p>
          </div>

          <div className="p-4 text-center hover:bg-slate-50 transition-colors">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">Terminal</p>
            <p className="text-lg font-bold text-slate-700">{grandTerminal.toLocaleString()}</p>
          </div>

          <div className="p-4 text-center hover:bg-slate-50 transition-colors">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">QR Code</p>
            <p className="text-lg font-bold text-slate-700">{grandQrcode.toLocaleString()}</p>
          </div>

          <div className="p-4 text-center hover:bg-slate-50 transition-colors">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">Ko'chirma</p>
            <p className="text-lg font-bold text-slate-700">{grandTransfer.toLocaleString()}</p>
          </div>

          <div className="p-4 text-center hover:bg-slate-50 transition-colors">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">Xarajatlar</p>
            <p className="text-lg font-bold text-rose-500">{grandExpenses.toLocaleString()}</p>
          </div>

          <div className={`p-4 text-center transition-colors ${grandCashBalance >= 0 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">Naqd Qoldiq</p>
            <p className={`text-xl font-bold ${grandCashBalance >= 0 ? 'text-amber-600' : 'text-red-500'}`}>{grandCashBalance.toLocaleString()}</p>
          </div>

        </div>
      </div>
      
      {/* SMENALAR BO'YICHA GURUHLANGAN TRANZAKSIYALAR */}
      <div className="space-y-8">
        {user?.role === 'owner' && !filters.branchId ? (
          <div className="card p-12 text-center text-slate-500 flex flex-col items-center border border-dashed border-slate-300">
            <Building2 size={48} className="mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">Filialni tanlang</h3>
            <p>Tranzaksiyalarni ko'rish uchun yuqoridan qaysi filial kamerasini ko'rmoqchi bo'lsangiz, o'shani tanlang.</p>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-slate-600">Yuklanmoqda...</div>
        ) : groupedData.length === 0 ? (
          <div className="card p-12 text-center text-slate-600 flex flex-col items-center">
            <Search size={48} className="mb-4 text-slate-300" />
            Bu sanada hech qanday smena yoki tranzaksiya topilmadi
          </div>
        ) : (
          groupedData.map((group, index) => (
            <div key={group.shift.id} className="card p-0 border border-slate-200 shadow-sm overflow-hidden animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              
              {/* Smena Sarlavhasi */}
              <div className={`p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${group.shift.id === 'other' ? 'bg-slate-100' : 'bg-indigo-50/50'}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-lg text-slate-900">{group.shift.adminName}</h3>
                    {group.shift.id !== 'other' && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${group.shift.shiftType === 'morning' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {group.shift.shiftType === 'morning' ? 'Kunduzgi' : 'Tungi'}
                      </span>
                    )}
                    {group.shift.status === 'active' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-100 text-emerald-700 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Hali ochiq
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span className="flex items-center gap-1"><Building2 size={14} /> {group.shift.branchName}</span>
                    {group.shift.id !== 'other' && (
                      <span className="flex items-center gap-1">
                        <Clock size={14} /> {format(new Date(group.shift.startTime), 'dd.MM.yyyy HH:mm')} - {group.shift.endTime ? format(new Date(group.shift.endTime), 'HH:mm') : 'Hozirgacha'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Smena qisqacha statistikasi */}
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Jami tushum</p>
                    <p className="font-bold text-slate-900">{group.stats.totalIncome.toLocaleString()} <span className="text-xs font-normal text-slate-500">so'm</span></p>
                  </div>
                  <div className="text-right pl-4 border-l border-slate-200">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Naqd qoldiq kassa</p>
                    <p className={`font-bold ${group.stats.qoldiq >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {group.stats.qoldiq.toLocaleString()} <span className="text-xs font-normal text-slate-500">so'm</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Tranzaksiyalar jadvali */}
              <div className="overflow-x-auto">
                {group.transactions.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    Bu smenada hali tranzaksiyalar yo'q.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="table-th pl-6 py-2">Vaqt</th>
                        <th className="table-th py-2">Mijoz / Tafsilot</th>
                        <th className="table-th py-2">To'lov usuli</th>
                        <th className="table-th py-2">Turi</th>
                        <th className="table-th text-right pr-6 py-2">Summa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 pl-6 text-slate-600 whitespace-nowrap">
                            {format(new Date(t.createdAt), 'HH:mm')}
                            <span className="text-xs text-slate-400 ml-2">{format(new Date(t.createdAt), 'dd.MM')}</span>
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-800">
                            {t.details}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize
                              ${t.type === 'expense' || t.method === 'cash' ? 'bg-emerald-100 text-emerald-700' : ''}
                              ${t.method === 'terminal' || t.method === 'karta' ? 'bg-blue-100 text-blue-700' : ''}
                              ${t.method === 'qrcode' ? 'bg-purple-100 text-purple-700' : ''}
                              ${t.method === 'transfer' ? 'bg-orange-100 text-orange-700' : ''}
                              ${t.method === '-' && t.type !== 'expense' ? 'bg-slate-100 text-slate-600' : ''}
                            `}>
                              {t.type === 'expense' ? 'Naqd' :
                                t.method === 'cash' ? 'Naqd' :
                                t.method === 'terminal' || t.method === 'karta' ? 'Terminal' :
                                t.method === 'qrcode' ? 'QR Kod' :
                                t.method === 'transfer' ? "Ko'chirma" :
                                t.method}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            {t.type === 'income' ? (
                              <span className="text-emerald-600 flex items-center gap-1 font-medium text-xs"><CheckCircle2 size={12}/> Kirim</span>
                            ) : (
                              <span className="text-rose-500 flex items-center gap-1 font-medium text-xs"><AlertCircle size={12}/> Chiqim</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 pr-6 text-right whitespace-nowrap">
                            {t.type === 'income' ? (
                              <span className="text-emerald-600 font-bold">+{t.amount.toLocaleString()}</span>
                            ) : (
                              <span className="text-rose-500 font-bold">-{t.amount.toLocaleString()}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <EditPaymentModal 
        isOpen={!!editingTransaction} 
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        onUpdated={fetchTransactions}
      />
    </div>
  );
}
