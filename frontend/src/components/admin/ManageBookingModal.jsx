import ModalPortal from '../common/ModalPortal';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../lib/api';
import { formatNumberInput, parseNumberInput } from '../../lib/formatters';
import { DoorOpen, ArrowRightLeft, CreditCard, Banknote, Smartphone, Plus, Trash2 , Loader2 } from 'lucide-react';

const paymentMethods = [
  { value: 'cash', label: 'Naqd' },
  { value: 'terminal', label: 'Terminal' },
  { value: 'qrcode', label: 'QR' },
  { value: 'transfer', label: "Kartadan kartaga" },
];

function ManageBookingModal({ bookingId, onClose, onSuccess }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('checkout'); // checkout, payment, transfer, companion, extend

  // Payment state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  // Transfer state
  const [freeRooms, setFreeRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [additionalPrice, setAdditionalPrice] = useState('');
  const [transferPaymentMethod, setTransferPaymentMethod] = useState('cash');

  // Extend state
  const [extendDate, setExtendDate] = useState('');
  const [extendAmount, setExtendAmount] = useState('');
  const [extendIsPaid, setExtendIsPaid] = useState(true);
  const [extendPaymentMethod, setExtendPaymentMethod] = useState('cash');

  // Companion state
  const [companion, setCompanion] = useState({ firstName: '', lastName: '', phone: '', passportNumber: '' });

  // Penalty state
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [penaltyDescription, setPenaltyDescription] = useState('');
  const [penaltyMethod, setPenaltyMethod] = useState('cash');

  // Button submitting states to prevent duplicate clicks
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submittingExtend, setSubmittingExtend] = useState(false);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [submittingCompanion, setSubmittingCompanion] = useState(false);
  const [submittingPenalty, setSubmittingPenalty] = useState(false);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      setBooking(res.data.data);
        const roomsRes = await api.get('/rooms');
        const currentBookingRoomId = res.data.data.roomId;
        const currentBranchId = res.data.data.branchId;

        const availableRoomsForTransfer = roomsRes.data.data.filter(r => {
          if (r.branchId !== currentBranchId) return false;
          if (r.id === currentBookingRoomId) return false;
          if (r.status === 'maintenance' || r.status === 'cleaning') return false;
          const totalBeds = r.capacity || r.totalBeds || 1;
          const occupied = r.occupiedBeds !== undefined ? r.occupiedBeds : (r.status === 'occupied' ? totalBeds : 0);
          return r.status === 'available' || occupied < totalBeds;
        });

        setFreeRooms(availableRoomsForTransfer);
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
    if (submittingCheckout) return;
    setSubmittingCheckout(true);
    try {
      await api.put(`/bookings/${bookingId}/checkout`);
      toast.success('Check-out muvaffaqiyatli');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setSubmittingCheckout(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (submittingPayment) return;
    const parsedAmount = parseFloat(parseNumberInput(paymentAmount));
    if (!parsedAmount || parsedAmount <= 0) return;
    setSubmittingPayment(true);
    try {
      await api.post(`/bookings/${bookingId}/payments`, {
        amount: parsedAmount,
        method: paymentMethod
      });
      toast.success('To\'lov qabul qilindi');
      fetchBooking();
      setPaymentAmount('');
      onSuccess();
    } catch (err) {
      toast.error('To\'lov qabul qilishda xato');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (submittingTransfer) return;
    if (!selectedRoomId) return;
    setSubmittingTransfer(true);
    try {
      await api.put(`/bookings/${bookingId}/transfer`, {
        newRoomId: selectedRoomId,
        additionalPrice: additionalPrice ? parseFloat(parseNumberInput(additionalPrice)) : 0,
        paymentMethod: transferPaymentMethod
      });
      toast.success('Xona ko\'chirildi');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleAddCompanion = async (e) => {
    e.preventDefault();
    if (submittingCompanion) return;
    if (!companion.firstName || !companion.lastName) return;
    setSubmittingCompanion(true);
    try {
      await api.post(`/bookings/${bookingId}/guests`, companion);
      toast.success('Hamroh qo\'shildi');
      setCompanion({ firstName: '', lastName: '', phone: '', passportNumber: '' });
      fetchBooking();
      onSuccess();
    } catch (err) {
      toast.error('Xato yuz berdi');
    } finally {
      setSubmittingCompanion(false);
    }
  };

  const handleRemoveCompanion = async (guestId) => {
    if (!window.confirm("Rostdan ham ushbu mehmonni ro'yxatdan o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`/bookings/${bookingId}/guests/${guestId}`);
      toast.success("Hamroh o'chirildi");
      fetchBooking();
    } catch (err) {
      toast.error('Xato yuz berdi');
    }
  };

  const handleExtend = async (e) => {
    e.preventDefault();
    if (submittingExtend) return;
    if (!extendDate) return;
    const parsedAmount = extendAmount ? parseFloat(parseNumberInput(extendAmount)) : 0;
    setSubmittingExtend(true);
    try {
      await api.post(`/bookings/${bookingId}/extend`, {
        newCheckOutDate: extendDate,
        additionalPrice: parsedAmount,
        paymentAmount: extendIsPaid ? parsedAmount : 0,
        paymentMethod: extendPaymentMethod,
      });
      toast.success('Muddat muvaffaqiyatli uzaytirildi');
      fetchBooking();
      onSuccess();
    } catch (err) {
      toast.error('Xato yuz berdi');
    } finally {
      setSubmittingExtend(false);
    }
  };

  const handlePenalty = async (e) => {
    e.preventDefault();
    if (submittingPenalty) return;
    const parsedPenalty = parseFloat(parseNumberInput(penaltyAmount));
    if (!parsedPenalty || parsedPenalty <= 0) return;
    setSubmittingPenalty(true);
    try {
      await api.post(`/bookings/${bookingId}/penalty`, {
        amount: parsedPenalty,
        description: penaltyDescription,
        method: penaltyMethod
      });
      toast.success('Jarima qabul qilindi');
      setPenaltyAmount('');
      setPenaltyDescription('');
      fetchBooking();
      onSuccess();
    } catch (err) {
      toast.error('Xatolik');
    } finally {
      setSubmittingPenalty(false);
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
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-1">
              Xona #{booking.room?.roomNumber} Boshqaruvi
            </h2>
            <div className="flex flex-col text-sm text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg inline-block">
              <span className="font-semibold text-slate-800">{booking.primaryGuest?.firstName} {booking.primaryGuest?.lastName}</span>
              {booking.primaryGuest?.phone && (
                <span className="flex items-center gap-1.5 mt-0.5"><Smartphone size={14} className="text-primary-500" /> {booking.primaryGuest.phone}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 text-2xl leading-none bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors">&times;</button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-slate-300 pb-2 overflow-x-auto">
          <button onClick={() => setActiveTab('checkout')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'checkout' ? 'bg-primary-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Check-out</button>
          <button onClick={() => setActiveTab('payment')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'payment' ? 'bg-primary-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>To'lov qo'shish</button>
          <button onClick={() => setActiveTab('extend')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'extend' ? 'bg-primary-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Muddatni uzaytirish</button>
          <button onClick={() => setActiveTab('transfer')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'transfer' ? 'bg-primary-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Xona ko'chirish</button>
          {booking.bookingType !== 'monthly' && (
            <button onClick={() => setActiveTab('companion')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'companion' ? 'bg-primary-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Hamroh qo'shish</button>
          )}
          <button onClick={() => setActiveTab('penalty')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'penalty' ? 'bg-red-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Jarima / Qo'shimcha</button>
        </div>

        {/* Tab Content */}
        {activeTab === 'checkout' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-slate-600 mb-1">Mehmon:</p>
                <p className="text-slate-900 font-medium">{booking.primaryGuest?.firstName} {booking.primaryGuest?.lastName}</p>
              </div>
              {booking.bookingType === 'monthly' ? (
                <div className={`p-3 border rounded-lg ${new Date() > new Date(booking.checkOutExpected) ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                  <p className="text-sm font-medium mb-1 text-slate-600">To'langan muddat (Paid Until):</p>
                  <p className={`font-bold ${new Date() > new Date(booking.checkOutExpected) ? 'text-red-400' : 'text-emerald-400'}`}>
                    {format(new Date(booking.checkOutExpected), 'dd.MM.yyyy')}
                    {new Date() > new Date(booking.checkOutExpected) && ' (To\'lov muddati o\'tgan!)'}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-600 mb-1">Qarz (Qoldiq):</p>
                  <p className={`font-bold ${remaining > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {remaining > 0 ? remaining.toLocaleString() + " so'm" : "Yo\'q"}
                  </p>
                </div>
              )}
            </div>
            {booking.bookingType !== 'monthly' && remaining > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mt-2">
                <p className="text-red-400 text-sm font-medium mb-2">Mehmon {remaining.toLocaleString()} so'm qarz. "To'lov qo'shish" bo'limidan pulni qabul qiling.</p>
              </div>
            )}
            <button 
              onClick={handleCheckOut} 
              disabled={submittingCheckout}
              className="w-full btn-primary py-3 flex justify-center items-center gap-2 mt-4 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingCheckout ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : <><DoorOpen /> Check-out (Xonadan chiqarish)</>}
            </button>
          </div>
        )}

        {activeTab === 'payment' && (
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center text-sm">
              <span className="text-slate-600">Jami hisob: {booking.totalPrice?.toLocaleString()}</span>
              <span className="text-slate-600">To'langan: {booking.paidAmount?.toLocaleString()}</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-slate-600">Summa</label>
              <input type="text" inputMode="decimal" value={formatNumberInput(paymentAmount)} onChange={(e) => setPaymentAmount(parseNumberInput(e.target.value))} className="input-field" placeholder="Masalan: 100000" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-600">To'lov usuli</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field">
                {paymentMethods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <button 
              type="submit" 
              disabled={submittingPayment}
              className="w-full btn-primary py-2 mt-4 flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingPayment ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "To'lovni qabul qilish"}
            </button>

            {booking.payments && booking.payments.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Qilingan to'lovlar tarixi:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {booking.payments.map(p => {
                    const isPenalty = p.type === 'penalty';
                    return (
                      <div key={p.id} className="flex flex-col bg-slate-50 px-3 py-2 rounded-lg border border-slate-300 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-700 font-medium capitalize">
                              {paymentMethods.find(m => m.value === p.method)?.label || p.method}
                            </span>
                            {isPenalty && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold text-[10px] uppercase">
                                Jarima
                              </span>
                            )}
                          </div>
                          <span className={`font-semibold ${isPenalty ? 'text-rose-500' : 'text-emerald-500'}`}>
                            +{p.amount?.toLocaleString()} so'm
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span>
                            {p.createdAt ? format(new Date(p.createdAt), 'dd.MM.yyyy HH:mm') : '—'}
                          </span>
                          {p.periodStart && p.periodEnd && (
                            <span className="text-[11px] text-slate-600">
                              Davr: {format(new Date(p.periodStart), 'dd.MM.yy')} dan {format(new Date(p.periodEnd), 'dd.MM.yy')} gacha
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <div className="text-xs text-slate-500 mt-0.5 italic">
                            Izoh: {p.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        )}

        {activeTab === 'extend' && (
          <form onSubmit={handleExtend} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg text-sm mb-4 border border-slate-200">
              <span className="text-slate-500 block mb-0.5 text-xs">Joriy chiqish vaqti:</span>
              <span className="text-slate-900 font-bold">{format(new Date(booking.checkOutExpected), 'dd.MM.yyyy HH:mm')}</span>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Yangi chiqish vaqti</label>
              <input type="datetime-local" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} className="input-field" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Uzaytirish summasi (so'm)</label>
              <input
                type="text"
                inputMode="decimal"
                value={formatNumberInput(extendAmount)}
                onChange={(e) => setExtendAmount(parseNumberInput(e.target.value))}
                className="input-field font-bold text-base text-primary-700"
                placeholder="Masalan: 300000"
                required
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={extendIsPaid}
                  onChange={(e) => setExtendIsPaid(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-900 block">
                    To'lov hozir qabul qilindi
                  </span>
                  <span className="text-xs text-slate-500 block">
                    {extendIsPaid
                      ? (extendAmount ? `Kassaga ${parseFloat(parseNumberInput(extendAmount) || 0).toLocaleString()} so'm kirim qilinadi` : 'Kassaga kirim qilinadi')
                      : 'To\'lov olinmadi (Qarzdorlik sifatida saqlanadi)'}
                  </span>
                </div>
              </label>
            </div>

            {extendIsPaid && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">To'lov usuli</label>
                <select value={extendPaymentMethod} onChange={(e) => setExtendPaymentMethod(e.target.value)} className="input-field">
                  {paymentMethods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            )}

            <button 
              type="submit" 
              disabled={submittingExtend}
              className="w-full btn-primary py-2.5 mt-4 font-semibold text-sm shadow-md shadow-primary-500/20 flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingExtend ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Muddatni uzaytirishni saqlash"}
            </button>
          </form>
        )}

        {activeTab === 'transfer' && (
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-600 font-medium">Qaysi xonaga ko'chiriladi?</label>
              <select value={selectedRoomId} onChange={e => setSelectedRoomId(e.target.value)} className="input-field" required>
                <option value="">Tanlang...</option>
                {freeRooms.map(r => {
                  const totalBeds = r.capacity || r.totalBeds || 1;
                  const availBeds = r.availableBeds !== undefined ? r.availableBeds : (r.status === 'available' ? totalBeds : 0);
                  const spaceLabel = r.status === 'available' ? "Bo'sh" : `${availBeds}/${totalBeds} ta bo'sh o'rin`;
                  return (
                    <option key={r.id} value={r.id}>
                      Xona #{r.roomNumber} ({r.roomType}) - {spaceLabel} ({r.pricePerNight.toLocaleString()} so'm)
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-slate-600 font-medium">Qo'shimcha ustama to'lov (agar bo'lsa)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Summa (so'm)</label>
                  <input type="text" inputMode="decimal" placeholder="0" value={formatNumberInput(additionalPrice)} onChange={e => setAdditionalPrice(parseNumberInput(e.target.value))} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">To'lov turi</label>
                  <select value={transferPaymentMethod} onChange={e => setTransferPaymentMethod(e.target.value)} className="input-field">
                    {paymentMethods.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500">Agar xona narxlari farq qilsa, hisobga va faol smenaga tanlangan to'lov turi bo'yicha summa qo'shiladi.</p>
            </div>

            <button 
              type="submit" 
              disabled={submittingTransfer}
              className="w-full btn-primary py-2 mt-4 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingTransfer ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><ArrowRightLeft size={18} /> Ko'chirish</>}
            </button>
          </form>
        )}

        {activeTab === 'companion' && (
          <form onSubmit={handleAddCompanion} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-600">Ismi</label>
              <input type="text" value={companion.firstName} onChange={e => setCompanion({...companion, firstName: e.target.value})} className="input-field" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-600">Familiyasi</label>
              <input type="text" value={companion.lastName} onChange={e => setCompanion({...companion, lastName: e.target.value})} className="input-field" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-600">Pasport / JSHSHIR</label>
              <input type="text" value={companion.passportNumber} onChange={e => setCompanion({...companion, passportNumber: e.target.value})} className="input-field" />
            </div>
            <button 
              type="submit" 
              className="w-full btn-primary py-2 mt-4 flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed" 
              disabled={submittingCompanion}
            >
              {submittingCompanion ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Qo'shish"}
            </button>
            
            {booking.additionalGuests && booking.additionalGuests.length > 0 && (
              <div className="mt-4 border-t border-slate-300 pt-4">
                <p className="text-sm text-slate-600 mb-2">Oldin qo'shilgan hamrohlar:</p>
                {booking.additionalGuests.map(ag => (
                  <div key={ag.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg mb-2">
                    <span className="text-sm text-slate-900 font-medium">• {ag.guest.firstName} {ag.guest.lastName}</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveCompanion(ag.guest.id)} 
                      className="text-red-500 hover:text-red-700 bg-red-500/10 hover:bg-red-500/20 p-1.5 rounded transition-colors"
                      title="O'chirish (Check-out)"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </form>
        )}

        {activeTab === 'penalty' && (
          <form onSubmit={handlePenalty} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Jarima / Xizmat summasi</label>
              <input type="text" inputMode="decimal" required value={formatNumberInput(penaltyAmount)} onChange={e => setPenaltyAmount(parseNumberInput(e.target.value))} className="input-field" placeholder="Masalan: 50000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Sabab / Izoh (Ixtiyoriy)</label>
              <input type="text" value={penaltyDescription} onChange={e => setPenaltyDescription(e.target.value)} className="input-field" placeholder="Masalan: Choynak sindirdi" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">To'lov usuli</label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map(m => (
                  <button key={m.value} type="button" onClick={() => setPenaltyMethod(m.value)} className={`p-2 rounded-lg border text-sm font-medium transition-colors ${penaltyMethod === m.value ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-700'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <button 
              type="submit" 
              disabled={submittingPenalty}
              className="w-full btn-primary bg-red-500 hover:bg-red-600 shadow-red-500/20 py-3 mt-4 flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingPenalty ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Jarimani kiritish"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ManageBookingModalWrapper(props) {
  return <ModalPortal><ManageBookingModal {...props} /></ModalPortal>;
}
