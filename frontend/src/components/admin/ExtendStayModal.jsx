import ModalPortal from '../common/ModalPortal';
import { useState } from 'react';
import { X, Calendar, Wallet , Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { formatNumberInput, parseNumberInput } from '../../lib/formatters';

function ExtendStayModal({ isOpen, onClose, booking, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    newCheckOutExpected: booking ? format(new Date(booking.checkOutExpected), "yyyy-MM-dd'T'HH:mm") : '',
    amount: '',
    isPaid: true,
    paymentMethod: 'cash'
  });

  if (!isOpen || !booking) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'amount') {
      setFormData(prev => ({ ...prev, amount: parseNumberInput(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const parsedAmount = Number(formData.amount) || 0;
    try {
      await api.put(`/bookings/${booking.id}/extend`, {
        newCheckOutExpected: new Date(formData.newCheckOutExpected).toISOString(),
        additionalPrice: parsedAmount,
        additionalPayment: formData.isPaid ? parsedAmount : 0,
        paymentMethod: formData.paymentMethod
      });
      toast.success('Muddat muvaffaqiyatli uzaytirildi');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    const start = new Date(booking.checkOutExpected);
    const end = new Date(formData.newCheckOutExpected);
    const diff = end - start;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const parsedAmount = Number(formData.amount) || 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="text-primary-500" />
            Muddatni uzaytirish
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Mehmon:</span>
              <span className="text-sm font-bold text-slate-900">{booking.primaryGuest?.firstName} {booking.primaryGuest?.lastName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Joriy chiqish vaqti:</span>
              <span className="font-semibold text-slate-700">{format(new Date(booking.checkOutExpected), 'dd.MM.yyyy HH:mm')}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1.5">Yangi ketish vaqti</label>
              <input
                type="datetime-local"
                name="newCheckOutExpected"
                value={formData.newCheckOutExpected}
                onChange={handleChange}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                className="input-field"
                required
              />
              {calculateDays() > 0 && (
                <p className="text-xs text-primary-600 font-semibold mt-1">+{calculateDays()} kun qo'shilmoqda</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1.5">Uzaytirish summasi (so'm)</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  inputMode="decimal"
                  name="amount"
                  value={formatNumberInput(formData.amount)}
                  onChange={handleChange}
                  className="input-field pl-10 font-bold text-base text-primary-700"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            {/* To'lov qabul qilinganlik holati */}
            <div className="pt-1">
              <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  name="isPaid"
                  checked={formData.isPaid}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-900 block">
                    To'lov hozir qabul qilindi
                  </span>
                  <span className="text-xs text-slate-500 block">
                    {formData.isPaid
                      ? (parsedAmount > 0 ? `Kassaga ${parsedAmount.toLocaleString()} so'm kirim qilinadi` : 'Kassaga kirim qilinadi')
                      : 'To\'lov olinmadi (Qarzdorlik sifatida saqlanadi)'}
                  </span>
                </div>
              </label>
            </div>

            {formData.isPaid && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">To'lov usuli</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'cash', label: 'Naqd' },
                    { key: 'terminal', label: 'Terminal' },
                    { key: 'qrcode', label: 'Click / Payme' }
                  ].map(method => (
                    <button
                      key={method.key}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.key }))}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        formData.paymentMethod === method.key
                          ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors font-semibold text-sm"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all font-semibold text-sm shadow-md shadow-primary-600/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Uzaytirishni saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExtendStayModalWrapper(props) {
  return <ModalPortal><ExtendStayModal {...props} /></ModalPortal>;
}
