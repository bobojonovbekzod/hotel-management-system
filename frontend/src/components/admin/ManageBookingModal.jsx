import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../lib/api';
import { DoorOpen, ArrowRightLeft, CreditCard, Banknote, Smartphone, Plus } from 'lucide-react';

const paymentMethods = [
  { value: 'cash', label: 'Naqd' },
  { value: 'terminal', label: 'Terminal' },
  { value: 'qrcode', label: 'QR' },
];

export default function ManageBookingModal({ bookingId, onClose, onSuccess }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('checkout'); // checkout, payment, transfer, companion, extend

  // Payment state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentPeriodStart, setPaymentPeriodStart] = useState('');
  const [paymentPeriodEnd, setPaymentPeriodEnd] = useState('');
  
  // Transfer state
  const [freeRooms, setFreeRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [additionalPrice, setAdditionalPrice] = useState('');
  // Extend state
  const [extendDate, setExtendDate] = useState('');
  const [extendPrice, setExtendPrice] = useState('');
  const [extendPaymentAmount, setExtendPaymentAmount] = useState('');
  const [extendPaymentMethod, setExtendPaymentMethod] = useState('cash');

  // Companion state
  const [companion, setCompanion] = useState({ firstName: '', lastName: '', phone: '', passportNumber: '' });

  // Penalty state
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [penaltyDescription, setPenaltyDescription] = useState('');
  const [penaltyMethod, setPenaltyMethod] = useState('cash');

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      setBooking(res.data.data);
      if (res.data.data.branchId) {
        const roomsRes = await api.get('/rooms');
        setFreeRooms(roomsRes.data.data.filter(r => r.status === 'available' && r.branchId === res.data.data.branchId));
      }
      if (res.data.data.checkOutExpected) {
        const d = new Date(res.data.data.checkOutExpected);
        d.setDate(d.getDate() + 1);
        setExtendDate(d.toISOString().slice(0, 16));
      }
    } catch (err) {
      toast.error('Ma\'lumot yuklanmadi');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.put(`/bookings/${bookingId}/checkout`);
      toast.success('Check-out muvaffaqiyatli');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
    try {
      await api.post(`/bookings/${bookingId}/payments`, {
        amount: paymentAmount,
        method: paymentMethod,
        periodStart: paymentPeriodStart || undefined,
        periodEnd: paymentPeriodEnd || undefined
      });
      toast.success('To\'lov qabul qilindi');
      fetchBooking();
      setPaymentAmount('');
    } catch (err) {
      toast.error('To\'lov qabul qilishda xato');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedRoomId) return;
    try {
      await api.put(`/bookings/${bookingId}/transfer`, {
        newRoomId: selectedRoomId,
        additionalPrice
      });
      toast.success('Xona ko\'chirildi');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    }
  };

  const handleAddCompanion = async (e) => {
    e.preventDefault();
    if (!companion.firstName || !companion.lastName) return;
    try {
      await api.post(`/bookings/${bookingId}/guests`, companion);
      toast.success('Hamroh qo\'shildi');
      setCompanion({ firstName: '', lastName: '', phone: '', passportNumber: '' });
      fetchBooking();
    } catch (err) {
      toast.error('Xato yuz berdi');
    }
  };

  const handleExtend = async (e) => {
    e.preventDefault();
    if (!extendDate) return;
    try {
      await api.post(`/bookings/${bookingId}/extend`, {
        newCheckOutDate: extendDate,
        additionalPrice: extendPrice,
        paymentAmount: extendPaymentAmount,
        paymentMethod: extendPaymentMethod,
      });
      toast.success('Muddat uzaytirildi');
      fetchBooking();
    } catch (err) {
      toast.error('Xato yuz berdi');
    }
  };

  const handlePenalty = async (e) => {
    e.preventDefault();
    if (!penaltyAmount) return;
    try {
      await api.post(`/bookings/${bookingId}/penalty`, {
        amount: penaltyAmount,
        description: penaltyDescription,
        method: penaltyMethod
      });
      toast.success('Jarima qabul qilindi');
      setPenaltyAmount('');
      setPenaltyDescription('');
      fetchBooking();
    } catch (err) {
      toast.error('Xatolik');
    }
  };

  if (loading || !booking) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
    </div>
  );

  const remaining = booking.totalPrice - booking.paidAmount;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Xona #{booking.room?.roomNumber} Boshqaruvi
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-slate-700/50 pb-2 overflow-x-auto">
          <button onClick={() => setActiveTab('checkout')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'checkout' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Check-out</button>
          <button onClick={() => setActiveTab('payment')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'payment' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>To'lov qo'shish</button>
          <button onClick={() => setActiveTab('extend')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'extend' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Muddatni uzaytirish</button>
          <button onClick={() => setActiveTab('transfer')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'transfer' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Xona ko'chirish</button>
          <button onClick={() => setActiveTab('companion')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'companion' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Hamroh qo'shish</button>
          <button onClick={() => setActiveTab('penalty')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'penalty' ? 'bg-red-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Jarima / Qo'shimcha</button>
        </div>

        {/* Tab Content */}
        {activeTab === 'checkout' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-slate-400 mb-1">Mehmon:</p>
                <p className="text-white font-medium">{booking.primaryGuest?.firstName} {booking.primaryGuest?.lastName}</p>
              </div>
              {booking.bookingType === 'monthly' ? (
                <div className={`p-3 border rounded-lg ${new Date() > new Date(booking.checkOutExpected) ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                  <p className="text-sm font-medium mb-1 text-slate-400">To'langan muddat (Paid Until):</p>
                  <p className={`font-bold ${new Date() > new Date(booking.checkOutExpected) ? 'text-red-400' : 'text-emerald-400'}`}>
                    {format(new Date(booking.checkOutExpected), 'dd.MM.yyyy')}
                    {new Date() > new Date(booking.checkOutExpected) && ' (To\'lov muddati o\'tgan!)'}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-slate-400 mb-1">Qarz (Qoldiq):</p>
                  <p className={`font-bold ${remaining > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {remaining > 0 ? remaining.toLocaleString() + " so'm" : 'Yo\'q'}
                  </p>
                </div>
              )}
            </div>
            {booking.bookingType !== 'monthly' && remaining > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mt-2">
                <p className="text-red-400 text-sm font-medium mb-2">Mehmon {remaining.toLocaleString()} so'm qarz. "To'lov qo'shish" bo'limidan pulni qabul qiling.</p>
              </div>
            )}
            <button onClick={handleCheckOut} className="w-full btn-primary py-3 flex justify-center items-center gap-2 mt-4 text-lg">
              <DoorOpen /> Check-out (Xonadan chiqarish)
            </button>
          </div>
        )}

        {activeTab === 'payment' && (
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center text-sm">
              <span className="text-slate-400">Jami hisob: {booking.totalPrice?.toLocaleString()}</span>
              <span className="text-slate-400">To'langan: {booking.paidAmount?.toLocaleString()}</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Summa</label>
              <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="input-field" placeholder="Masalan: 100000" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">To'lov usuli</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field">
                {paymentMethods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            
            {booking.bookingType === 'monthly' && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-1">
                  <label className="text-sm text-slate-400">Qaysi sanadan (Period Start)</label>
                  <input type="date" value={paymentPeriodStart} onChange={(e) => setPaymentPeriodStart(e.target.value)} className="input-field" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-400">Qaysi sanagacha (Period End)</label>
                  <input type="date" value={paymentPeriodEnd} onChange={(e) => setPaymentPeriodEnd(e.target.value)} className="input-field" />
                </div>
              </div>
            )}

            <button type="submit" className="w-full btn-primary py-2 mt-4">To'lovni qabul qilish</button>

            {booking.payments && booking.payments.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Qilingan to'lovlar tarixi:</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                  {booking.payments.map(p => (
                    <div key={p.id} className="flex flex-col bg-slate-800/30 px-3 py-2 rounded border border-slate-700/30 text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400 capitalize">{p.method}</span>
                        <span className="text-emerald-400 font-medium">+{p.amount.toLocaleString()} so'm</span>
                      </div>
                      {p.periodStart && p.periodEnd && (
                        <div className="text-xs text-slate-500">
                          Davr: {format(new Date(p.periodStart), 'dd.MM.yy')} dan {format(new Date(p.periodEnd), 'dd.MM.yy')} gacha
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {activeTab === 'extend' && (
          <form onSubmit={handleExtend} className="space-y-4">
            <div className="bg-slate-800/50 p-3 rounded-lg text-sm mb-4">
              <span className="text-slate-400 block mb-1">Joriy chiqish vaqti:</span>
              <span className="text-white font-medium">{format(new Date(booking.checkOutExpected), 'dd.MM.yyyy HH:mm')}</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Yangi chiqish vaqti</label>
              <input type="datetime-local" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} className="input-field" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Qo'shiladigan hisob (so'm)</label>
                <input type="number" value={extendPrice} onChange={(e) => setExtendPrice(e.target.value)} className="input-field" placeholder="Masalan: 500000" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Hozir to'lanadigan summa</label>
                <input type="number" value={extendPaymentAmount} onChange={(e) => setExtendPaymentAmount(e.target.value)} className="input-field" placeholder="Masalan: 500000" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">To'lov usuli</label>
              <select value={extendPaymentMethod} onChange={(e) => setExtendPaymentMethod(e.target.value)} className="input-field">
                {paymentMethods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <button type="submit" className="w-full btn-primary py-2 mt-4">Muddatni uzaytirish</button>
          </form>
        )}

        {activeTab === 'transfer' && (
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Qaysi xonaga ko'chiriladi?</label>
              <select value={selectedRoomId} onChange={e => setSelectedRoomId(e.target.value)} className="input-field" required>
                <option value="">Tanlang...</option>
                {freeRooms.map(r => (
                  <option key={r.id} value={r.id}>Xona #{r.roomNumber} ({r.roomType}) - {r.pricePerNight.toLocaleString()} so'm</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Qo'shimcha ustama to'lov (agar bo'lsa)</label>
              <input type="number" value={additionalPrice} onChange={e => setAdditionalPrice(e.target.value)} className="input-field" />
              <p className="text-xs text-slate-500">Agar xona narxlari farq qilsa, hisobga shuncha summa qo'shiladi.</p>
            </div>
            <button type="submit" className="w-full btn-primary py-2 mt-4 flex items-center justify-center gap-2">
              <ArrowRightLeft size={18} /> Ko'chirish
            </button>
          </form>
        )}

        {activeTab === 'companion' && (
          <form onSubmit={handleAddCompanion} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Ismi</label>
              <input type="text" value={companion.firstName} onChange={e => setCompanion({...companion, firstName: e.target.value})} className="input-field" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Familiyasi</label>
              <input type="text" value={companion.lastName} onChange={e => setCompanion({...companion, lastName: e.target.value})} className="input-field" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Pasport / JSHSHIR</label>
              <input type="text" value={companion.passportNumber} onChange={e => setCompanion({...companion, passportNumber: e.target.value})} className="input-field" />
            </div>
            <button type="submit" className="w-full btn-primary py-2 mt-4 flex justify-center items-center gap-2">
              <Plus size={18} /> Qo'shish
            </button>
            
            {booking.additionalGuests && booking.additionalGuests.length > 0 && (
              <div className="mt-4 border-t border-slate-700/50 pt-4">
                <p className="text-sm text-slate-400 mb-2">Oldin qo'shilgan hamrohlar:</p>
                {booking.additionalGuests.map(ag => (
                  <div key={ag.id} className="text-sm text-white mb-1">• {ag.guest.firstName} {ag.guest.lastName}</div>
                ))}
              </div>
            )}
          </form>
        )}

        {activeTab === 'penalty' && (
          <form onSubmit={handlePenalty} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Jarima / Xizmat summasi</label>
              <input type="number" required value={penaltyAmount} onChange={e => setPenaltyAmount(e.target.value)} className="input-field" placeholder="Masalan: 50000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Sabab / Izoh (Ixtiyoriy)</label>
              <input type="text" value={penaltyDescription} onChange={e => setPenaltyDescription(e.target.value)} className="input-field" placeholder="Masalan: Choynak sindirdi" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">To'lov usuli</label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map(m => (
                  <button key={m.value} type="button" onClick={() => setPenaltyMethod(m.value)} className={`p-2 rounded-lg border text-sm font-medium transition-colors ${penaltyMethod === m.value ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full btn-primary bg-red-500 hover:bg-red-600 shadow-red-500/20 py-3 mt-4">Jarimani kiritish</button>
          </form>
        )}
      </div>
    </div>
  );
}
