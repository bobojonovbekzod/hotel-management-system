import ModalPortal from '../common/ModalPortal';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../lib/api';
import { formatNumberInput, parseNumberInput } from '../../lib/formatters';
import { DoorOpen, CheckCircle2, Banknote, CreditCard, Smartphone, ArrowRightLeft } from 'lucide-react';

const paymentMethods = [
  { value: 'cash', label: 'Naqd', icon: <Banknote size={16} /> },
  { value: 'terminal', label: 'Terminal', icon: <CreditCard size={16} /> },
  { value: 'qrcode', label: 'QR', icon: <Smartphone size={16} /> },
  { value: 'transfer', label: 'O\'tkazma', icon: <ArrowRightLeft size={16} /> },
];

function CheckOutModal({ booking, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [additionalPayment, setAdditionalPayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(booking.paymentMethod || 'cash');

  const remaining = booking.totalPrice - booking.paidAmount;
  const stayDays = booking.checkOutActual
    ? Math.ceil((new Date() - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))
    : Math.ceil((new Date() - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      await api.put(`/bookings/${booking.id}/checkout`, {
        additionalPayment: parseFloat(parseNumberInput(additionalPayment)) || 0,
        paymentMethod,
      });
      toast.success('Mehmon muvaffaqiyatli chiqdi! 👋');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">🚪 Check-out</h2>
            <p className="text-slate-600 text-sm">Xona #{booking.room?.roomNumber}</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 text-2xl">&times;</button>
        </div>

        {/* Guest info */}
        <div className="card mb-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Mehmon ma'lumotlari</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-lg">
              👤
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {booking.primaryGuest?.firstName} {booking.primaryGuest?.lastName}
              </p>
              <p className="text-sm text-slate-600">{booking.primaryGuest?.phone}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-600 text-xs mb-1">Kirish</p>
              <p className="text-slate-900 font-medium">{format(new Date(booking.checkIn), 'dd.MM.yyyy HH:mm')}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-600 text-xs mb-1">Chiqish (taxminiy)</p>
              <p className="text-slate-900 font-medium">{format(new Date(booking.checkOutExpected), 'dd.MM.yyyy HH:mm')}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-600 text-xs mb-1">Tunalar</p>
              <p className="text-slate-900 font-bold text-lg">{stayDays} kun</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-600 text-xs mb-1">To'lov usuli</p>
              <p className="text-slate-900 font-medium capitalize">{booking.paymentMethod || '—'}</p>
            </div>
          </div>
        </div>

        {/* Payment summary */}
        <div className="card mb-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">To'lov</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Jami summa:</span>
              <span className="text-slate-900 font-semibold">{booking.totalPrice?.toLocaleString()} so'm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">To'langan:</span>
              <span className="text-emerald-400 font-semibold">{booking.paidAmount?.toLocaleString()} so'm</span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between pt-2 border-t border-slate-300">
                <span className="text-red-400 font-medium">Qoldiq:</span>
                <span className="text-red-400 font-bold">{remaining.toLocaleString()} so'm</span>
              </div>
            )}
            {remaining <= 0 && (
              <div className="flex items-center gap-2 text-emerald-400 pt-2 border-t border-slate-300">
                <CheckCircle2 size={18} />
                <span className="font-medium">To'liq to'langan</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional payment */}
        {remaining > 0 && (
          <div className="space-y-3 mb-5">
            <div>
              <label className="label">Qo'shimcha to'lov</label>
              <div className="relative">
                <input
                  id="checkout-payment"
                  type="text"
                  inputMode="decimal"
                  className="input-field pr-16"
                  placeholder={remaining.toString()}
                  value={formatNumberInput(additionalPayment)}
                  onChange={(e) => setAdditionalPayment(parseNumberInput(e.target.value))}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 text-sm">so'm</span>
              </div>
            </div>
            <div>
              <label className="label">To'lov usuli</label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((pm) => (
                  <button key={pm.value} type="button"
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                      paymentMethod === pm.value
                        ? 'bg-primary-600/30 border-primary-500 text-primary-400'
                        : 'bg-slate-50 border-slate-600/50 text-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => setPaymentMethod(pm.value)}>
                    <span className="text-lg">{pm.icon}</span>
                    <span>{pm.label.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Bekor qilish</button>
          <button
            id="checkout-submit-btn"
            onClick={handleCheckOut}
            disabled={loading}
            className="btn-danger flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : '🚪'}
            {loading ? 'Chiqarilmoqda...' : 'Check-out qilish'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckOutModalWrapper(props) {
  return <ModalPortal><CheckOutModal {...props} /></ModalPortal>;
}
