import ModalPortal from '../common/ModalPortal';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

function ReserveModal({ onClose, onSuccess, shift }) {
  const [rooms, setRooms] = useState([]);
  const [formData, setFormData] = useState({
    roomId: '',
    firstName: '',
    lastName: '',
    phone: '',
    passportNumber: '',
    checkIn: '',
    checkOutExpected: '',
    totalPrice: '',
    advanceAmount: '',
    paymentMethod: 'cash'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/rooms').then(res => setRooms(res.data.data.filter(r => r.status === 'available')));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.roomId || !formData.checkIn || !formData.checkOutExpected) {
      toast.error("Barcha maydonlarni to'ldiring");
      return;
    }

    setLoading(true);
    try {
      await api.post('/bookings/reserve', {
        ...formData,
        shiftId: shift ? shift.id : null
      });
      toast.success("Xona muvaffaqiyatli bron qilindi!");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Oldindan Bron qilish</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Xona tanlang</label>
              <select required className="input-field" value={formData.roomId} onChange={e => setFormData({...formData, roomId: e.target.value})}>
                <option value="">-- Tanlang --</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.roomNumber} - {r.roomType.replace('_', ' ')} (Kuniga: {r.pricePerNight} so'm)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Passport / ID</label>
              <input type="text" className="input-field" value={formData.passportNumber} onChange={e => setFormData({...formData, passportNumber: e.target.value})} placeholder="AA1234567" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Ism</label>
              <input type="text" className="input-field" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Familiya</label>
              <input type="text" className="input-field" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Telefon</label>
              <input type="text" className="input-field" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+998" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Kelish kuni</label>
              <input type="datetime-local" className="input-field" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Ketish kuni</label>
              <input type="datetime-local" className="input-field" value={formData.checkOutExpected} onChange={e => setFormData({...formData, checkOutExpected: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Kelishilgan umumiy narx</label>
              <input type="number" className="input-field" value={formData.totalPrice} onChange={e => setFormData({...formData, totalPrice: e.target.value})} required placeholder="Masalan: 500000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Zaklad summasi (Oldindan to'lov)</label>
              <input type="number" className="input-field" value={formData.advanceAmount} onChange={e => setFormData({...formData, advanceAmount: e.target.value})} placeholder="Masalan: 100000" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-2">Zaklad to'lov usuli</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: 'Naqd pul' },
                { id: 'terminal', label: 'Terminal' },
                { id: 'qrcode', label: 'QR Code / Click' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: m.id})}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    formData.paymentMethod === m.id
                      ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                      : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-300">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-slate-800 hover:bg-slate-100">Bekor qilish</button>
            <button type="submit" disabled={loading} className="btn-primary px-8">
              {loading ? 'Kuting...' : 'Bron qilish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReserveModalWrapper(props) {
  return <ModalPortal><ReserveModal {...props} /></ModalPortal>;
}
