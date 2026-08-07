import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Save, ShieldAlert } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function EditPaymentModal({ isOpen, onClose, transaction, onUpdated }) {
  const { user } = useAuth();
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction && isOpen) {
      setMethod(transaction.method || 'cash');
      setAmount(transaction.amount || '');
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const isOwner = user?.role === 'owner';
  
  // Real payment id comes from 'p-123', need to extract '123'
  const paymentId = transaction.id.replace('p-', '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/transactions/payments/${paymentId}`, {
        method,
        amount: isOwner ? amount : undefined // Only owner sends amount
      });
      toast.success("To'lov muvaffaqiyatli tahrirlandi!");
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Tahrirlashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
        
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800">To'lovni tahrirlash</h3>
            <p className="text-xs text-slate-500 mt-0.5">{transaction.details}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">To'lov usuli</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              required
            >
              <option value="cash">Naqd</option>
              <option value="terminal">Terminal</option>
              <option value="qrcode">QR Kod</option>
              <option value="transfer">Ko'chirma (Perechisleniye)</option>
            </select>
            <p className="text-xs text-slate-500">Bu summani qaysi kassa turiga (Naqd, Terminal) tushishini o'zgartiradi.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex justify-between">
              <span>To'lov summasi</span>
              {!isOwner && <span className="text-[10px] text-rose-500 flex items-center gap-1"><ShieldAlert size={12}/> Faqat Owner tahrirlay oladi</span>}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all ${
                isOwner 
                  ? "bg-white border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                  : "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
              }`}
              disabled={!isOwner}
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Saqlanmoqda...' : <><Save size={16}/> Saqlash</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
