import ModalPortal from '../common/ModalPortal';
import { useState } from 'react';
import { X, Calendar, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { formatNumberInput, parseNumberInput } from '../../lib/formatters';

function ExtendStayModal({ isOpen, onClose, booking, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    newCheckOutExpected: booking ? format(new Date(booking.checkOutExpected), "yyyy-MM-dd'T'HH:mm") : '',
    additionalPrice: '',
    additionalPayment: '',
    paymentMethod: 'cash'
  });

  if (!isOpen || !booking) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'additionalPrice' || name === 'additionalPayment') {
      finalValue = parseNumberInput(value);
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/bookings/${booking.id}/extend`, {
        newCheckOutExpected: new Date(formData.newCheckOutExpected).toISOString(),
        additionalPrice: Number(formData.additionalPrice) || 0,
        additionalPayment: Number(formData.additionalPayment) || 0,
        paymentMethod: formData.paymentMethod
      });
      toast.success('Muddat uzaytirildi');
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="text-primary-400" />
            Muddatni uzaytirish
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Mehmon</p>
            <p className="text-lg font-medium text-slate-900">{booking.primaryGuest?.firstName} {booking.primaryGuest?.lastName}</p>
            <p className="text-sm text-slate-600">Joriy ketish vaqti: {format(new Date(booking.checkOutExpected), 'dd.MM.yyyy HH:mm')}</p>
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
                <p className="text-xs text-primary-400 mt-1">+{calculateDays()} kun qo'shilmoqda</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1.5">Qo'shimcha narx (so'm)</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input
                  type="text"
                  inputMode="decimal"
                  name="additionalPrice"
                  value={formatNumberInput(formData.additionalPrice)}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1.5">Hozir to'lanadigan summa (so'm)</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input
                  type="text"
                  inputMode="decimal"
                  name="additionalPayment"
                  value={formatNumberInput(formData.additionalPayment)}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="0"
                />
              </div>
            </div>

            {Number(formData.additionalPayment) > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1.5">To'lov turi</label>
                <div className="grid grid-cols-3 gap-2">
                  {['cash', 'terminal', 'qrcode'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                      className={`py-2 rounded-xl text-sm font-medium transition-colors border ${
                        formData.paymentMethod === method
                          ? 'bg-primary-500/20 text-primary-400 border-primary-500/50'
                          : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100'
                      }`}
                    >
                      {method === 'cash' ? 'Naqd' : method === 'terminal' ? 'Terminal' : 'Click/Payme'}
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
              className="flex-1 py-2.5 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors font-medium"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Saqlanmoqda...' : 'Saqlash'}
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
