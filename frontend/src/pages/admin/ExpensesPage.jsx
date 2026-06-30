import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { WalletCards, Plus, Inbox, Trash2 } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
  
  const [form, setForm] = useState({ categoryId: '', amount: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');
  
  // For owner managing categories
  const [newCatName, setNewCatName] = useState('');

  const now = new Date();

  useEffect(() => {
    fetchData();
    fetchShift();
  }, []);

  const fetchData = async () => {
    try {
      const [expRes, catRes] = await Promise.all([
        api.get('/expenses', { params: { month: now.getMonth() + 1, year: now.getFullYear() } }),
        api.get('/expense-categories')
      ]);
      setExpenses(expRes.data.data);
      setCategories(catRes.data.data);
      if (catRes.data.data.length > 0) {
        setForm(prev => ({ ...prev, categoryId: catRes.data.data[0].id }));
      }
    } catch {
      toast.error("Xarajatlar yuklanmadi");
    } finally {
      setLoading(false);
    }
  };

  const fetchShift = async () => {
    try {
      const res = await api.get('/shifts/my/active');
      setActiveShift(res.data.data);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Summa kiriting!');
      return;
    }
    if (!form.categoryId) {
      toast.error('Kategoriyani tanlang!');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/expenses', {
        ...form,
        shiftId: activeShift?.id,
        amount: parseFloat(form.amount),
      });
      toast.success('Xarajat qo\'shildi!');
      setForm(prev => ({ ...prev, amount: '', description: '' }));
      setShowForm(false);
      fetchData();
    } catch {
      toast.error('Xato yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/expenses/${confirmDialog.id}`);
      toast.success('Xarajat o\'chirildi');
      fetchData();
    } catch {
      toast.error('O\'chirishda xatolik');
    } finally {
      setConfirmDialog({ isOpen: false, id: null });
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName) return;
    try {
      await api.post('/expense-categories', { name: newCatName });
      toast.success("Tur qo'shildi");
      setNewCatName('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Xato yuz berdi");
    }
  };

  const filteredExpenses = filter === 'all' ? expenses : expenses.filter((e) => e.categoryId === parseInt(filter));
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <WalletCards className="text-primary-400" /> Xarajatlar
          </h1>
          <p className="text-slate-400 text-sm">{format(now, 'MMMM yyyy')} oyi uchun</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Xarajat qo'shish
        </button>
      </div>

      {/* Owner category manage */}
      {user?.role === 'owner' && (
        <div className="card flex items-center gap-4">
          <input
            type="text"
            className="input-field flex-1"
            placeholder="Yangi xarajat turi nomi..."
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
          />
          <button onClick={handleAddCategory} className="btn-secondary whitespace-nowrap">
            Tur qo'shish
          </button>
        </div>
      )}

      {/* Category breakdown */}
      <div className="card">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-sm transition-all border ${
              filter === 'all'
                ? 'bg-primary-600/20 border-primary-500/40 text-white'
                : 'bg-slate-800/30 border-slate-700/30 text-slate-400 hover:text-white'
            }`}
          >
            Barchasi
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id.toString())}
              className={`px-3 py-1.5 rounded-xl text-sm transition-all border ${
                filter === c.id.toString()
                  ? 'bg-primary-600/20 border-primary-500/40 text-white'
                  : 'bg-slate-800/30 border-slate-700/30 text-slate-400 hover:text-white'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      <div className="card">
        {loading ? (
          <div className="py-10 text-center text-slate-400">Yuklanmoqda...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center">
            <Inbox size={48} className="text-slate-600 mb-4" />
            <p className="text-slate-400">Xarajat yo'q</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Kategoriya</th>
                  <th className="table-th">Tavsif</th>
                  <th className="table-th">Sana</th>
                  <th className="table-th text-right">Summa</th>
                  <th className="table-th">Admin</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="table-row">
                    <td className="table-td font-medium text-white">
                      {expense.category?.name || '-'}
                    </td>
                    <td className="table-td text-slate-300">{expense.description || '—'}</td>
                    <td className="table-td">
                      {format(new Date(expense.expenseDate), 'dd.MM.yyyy')}
                    </td>
                    <td className="table-td text-right font-bold text-white">
                      {expense.amount.toLocaleString()} <span className="text-xs text-slate-500">so'm</span>
                    </td>
                    <td className="table-td text-slate-400 text-xs">{expense.admin?.name}</td>
                    <td className="table-td">
                      {user?.role === 'owner' && (
                        <button
                          onClick={() => handleDeleteClick(expense.id)}
                          className="text-red-400/60 hover:text-red-400 text-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-600/50">
                  <td colSpan={3} className="table-td font-semibold text-slate-300">
                    Jami:
                  </td>
                  <td className="table-td text-right font-bold text-xl text-red-400">
                    {totalAmount.toLocaleString()} <span className="text-xs text-slate-400">so'm</span>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md card">
            <h3 className="text-lg font-bold text-white mb-4">Xarajat qo'shish</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Turkum</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Tanlang...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Summa (so'm)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Tavsif (ixtiyoriy)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field"
                  placeholder="Nima uchun xarajat qilindi?"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  Bekor qilish
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDialog.isOpen && (
        <ConfirmModal 
          title="Xarajatni o'chirish"
          message="Rostdan ham ushbu xarajatni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi."
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
        />
      )}
    </div>
  );
}
