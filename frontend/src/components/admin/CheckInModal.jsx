import ModalPortal from '../common/ModalPortal';
import { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, CreditCard, Smartphone, Banknote, Search, Repeat, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { formatNumberInput, parseNumberInput } from '../../lib/formatters';

const paymentMethods = [
  { value: 'cash', label: 'Naqd', icon: <Banknote size={16} /> },
  { value: 'terminal', label: 'Terminal', icon: <CreditCard size={16} /> },
  { value: 'qrcode', label: 'QR kod', icon: <Smartphone size={16} /> },
  { value: 'transfer', label: 'Kartadan kartaga', icon: <Repeat size={16} /> },
];

const emptyGuest = { firstName: '', lastName: '', phone: '+998', passportNumber: '', nationality: 'UZ', relation: '' };

function CheckInModal({ room, shift, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [primaryGuest, setPrimaryGuest] = useState({ ...emptyGuest });
  const [additionalGuests, setAdditionalGuests] = useState([]);
  
  const [checkIn, setCheckIn] = useState(new Date().toISOString().slice(0, 16));
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });
  
  const [rentEntireRoom, setRentEntireRoom] = useState(true);
  const [bookingType, setBookingType] = useState('daily');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [customTotalPrice, setCustomTotalPrice] = useState('');
  const [payments, setPayments] = useState([{ method: 'cash', amount: '' }]);
  const [notes, setNotes] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeWarning, setActiveWarning] = useState(null);

  useEffect(() => {
    const q = primaryGuest.passportNumber || primaryGuest.phone;
    if (q && q.length > 4) {
      const delay = setTimeout(async () => {
        try {
          const res = await api.get(`/guests?search=${q}`);
          setSearchResults(res.data.data);
          setShowDropdown(res.data.data.length > 0);

          // Check active booking
          const activeRes = await api.get(`/guests/check-active?phone=${encodeURIComponent(primaryGuest.phone || '')}&passport=${encodeURIComponent(primaryGuest.passportNumber || '')}`);
          if (activeRes.data?.hasActiveBooking) {
            setActiveWarning(activeRes.data.activeBooking);
          } else {
            setActiveWarning(null);
          }
        } catch (e) { }
      }, 500);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setActiveWarning(null);
    }
  }, [primaryGuest.passportNumber, primaryGuest.phone]);

  const handleSelectGuest = (g) => {
    setPrimaryGuest({
      firstName: g.firstName,
      lastName: g.lastName,
      phone: g.phone || '+998',
      passportNumber: g.passportNumber || '',
      nationality: g.nationality || 'UZ'
    });
    setShowDropdown(false);
    if (g.hasActiveBooking && g.activeBooking) {
      setActiveWarning({
        roomNumber: g.activeBooking.roomNumber,
        guestName: `${g.firstName} ${g.lastName}`,
        debt: g.activeBooking.debt
      });
    }
  };

  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
  const parsedMonthlyFee = parseFloat(parseNumberInput(monthlyFee)) || 0;
  const parsedTotalPrice = parseFloat(parseNumberInput(customTotalPrice)) || 0;
  const totalPrice = bookingType === 'monthly' ? parsedMonthlyFee : parsedTotalPrice;
  
  const handleBookingTypeChange = (type) => {
    setBookingType(type);
    const d = new Date(checkIn);
    if (type === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCheckOut(d.toISOString().slice(0, 16));
  };
  
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(parseNumberInput(p.amount)) || 0), 0);

  const addGuest = () => {
    if (additionalGuests.length >= 5) {
      toast.error('Maksimal 5 ta qo\'shimcha mehmon');
      return;
    }
    setAdditionalGuests([...additionalGuests, { ...emptyGuest }]);
  };

  const updateGuest = (idx, field, value) => {
    const updated = [...additionalGuests];
    updated[idx] = { ...updated[idx], [field]: value };
    setAdditionalGuests(updated);
  };

  const removeGuest = (idx) => {
    setAdditionalGuests(additionalGuests.filter((_, i) => i !== idx));
  };

  const addPayment = () => {
    setPayments([...payments, { method: 'terminal', amount: '' }]);
  };

  const updatePayment = (idx, field, value) => {
    const updated = [...payments];
    updated[idx] = { ...updated[idx], [field]: value };
    setPayments(updated);
  };

  const removePayment = (idx) => {
    setPayments(payments.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const parsedMonthly = parseFloat(parseNumberInput(monthlyFee));
    if (bookingType === 'monthly' && (!parsedMonthly || parsedMonthly <= 0)) {
      toast.error('Oylik ijara summasi kiritilishi shart');
      return;
    }

    if (!primaryGuest.firstName || !primaryGuest.lastName) {
      toast.error('Asosiy mehmon ism va familiyasi kiritilishi shart!');
      return;
    }

    setLoading(true);
    try {
      await api.post('/bookings', {
        roomId: room.id,
        checkIn,
        checkOutExpected: checkOut,
        totalPrice,
        payments: payments.map(p => ({
          method: p.method,
          amount: parseFloat(parseNumberInput(p.amount)) || 0
        })).filter(p => p.amount > 0),
        notes,
        shiftId: shift?.id,
        primaryGuest,
        additionalGuests,
        bookingType,
        monthlyFee: bookingType === 'monthly' ? parsedMonthly : null,
        rentEntireRoom
      });
      toast.success('Mehmon muvaffaqiyatli ro\'yxatga olindi! 🎉');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="text-primary-400" /> Check-in
            </h2>
            <p className="text-slate-600 text-sm">
              Xona #{room.roomNumber}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-slate-900 font-medium cursor-pointer">
              <input type="radio" name="bookingType" value="daily" checked={bookingType === 'daily'} onChange={() => handleBookingTypeChange('daily')} className="text-primary-500" />
              Kunlik mijoz
            </label>
            <label className="flex items-center gap-2 text-slate-900 font-medium cursor-pointer">
              <input type="radio" name="bookingType" value="monthly" checked={bookingType === 'monthly'} onChange={() => {
                handleBookingTypeChange('monthly');
                setRentEntireRoom(false);
              }} className="text-primary-500" />
              Oylik ijarachi
            </label>
          </div>

          {bookingType !== 'monthly' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rentEntireRoom} 
                  onChange={(e) => setRentEntireRoom(e.target.checked)} 
                  className="w-5 h-5 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                />
                <div>
                  <p className="text-slate-900 font-bold">Butun xonani band qilish</p>
                  <p className="text-xs text-slate-500">Agar belgilansa, xonaga boshqa begona mehmon kiritib bo'lmaydi (Mehmonxona formati)</p>
                </div>
              </label>
            </div>
          )}

          {bookingType === 'daily' ? (
            <div className="bg-primary-600/10 border border-primary-500/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Jami kelishilgan summa (so'm)</p>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={formatNumberInput(customTotalPrice)} 
                  onChange={(e) => setCustomTotalPrice(parseNumberInput(e.target.value))} 
                  className="input-field w-full" 
                  placeholder={`Asl narx: ${(room?.pricePerNight * nights).toLocaleString()} so'm`}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="bg-primary-600/10 border border-primary-500/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Kelishilgan oylik ijara summasi (so'm)</p>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={formatNumberInput(monthlyFee)} 
                  onChange={(e) => setMonthlyFee(parseNumberInput(e.target.value))} 
                  className="input-field max-w-[200px]" 
                />
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Birinchi to'lov (avans)</p>
                <p className="text-xl font-bold text-primary-400">{totalPrice.toLocaleString()} so'm</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Kirish vaqti</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="date" 
                  value={checkIn.split('T')[0]} 
                  onChange={(e) => setCheckIn(`${e.target.value}T${checkIn.split('T')[1] || '12:00'}`)} 
                  className="input-field flex-1" 
                  required 
                />
                <select 
                  className="input-field w-16 px-1 text-center" 
                  value={checkIn.split('T')[1]?.split(':')[0] || '12'} 
                  onChange={(e) => setCheckIn(`${checkIn.split('T')[0]}T${e.target.value}:${checkIn.split('T')[1]?.split(':')[1] || '00'}`)}
                >
                  {Array.from({length: 24}).map((_, i) => <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>)}
                </select>
                <span className="font-bold text-slate-400">:</span>
                <select 
                  className="input-field w-16 px-1 text-center" 
                  value={checkIn.split('T')[1]?.split(':')[1] || '00'} 
                  onChange={(e) => setCheckIn(`${checkIn.split('T')[0]}T${checkIn.split('T')[1]?.split(':')[0] || '12'}:${e.target.value}`)}
                >
                  {Array.from({length: 60}).map((_, i) => <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Chiqish vaqti</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="date" 
                  value={checkOut.split('T')[0]} 
                  onChange={(e) => setCheckOut(`${e.target.value}T${checkOut.split('T')[1] || '12:00'}`)} 
                  className="input-field flex-1" 
                  required 
                />
                <select 
                  className="input-field w-16 px-1 text-center" 
                  value={checkOut.split('T')[1]?.split(':')[0] || '12'} 
                  onChange={(e) => setCheckOut(`${checkOut.split('T')[0]}T${e.target.value}:${checkOut.split('T')[1]?.split(':')[1] || '00'}`)}
                >
                  {Array.from({length: 24}).map((_, i) => <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>)}
                </select>
                <span className="font-bold text-slate-400">:</span>
                <select 
                  className="input-field w-16 px-1 text-center" 
                  value={checkOut.split('T')[1]?.split(':')[1] || '00'} 
                  onChange={(e) => setCheckOut(`${checkOut.split('T')[0]}T${checkOut.split('T')[1]?.split(':')[0] || '12'}:${e.target.value}`)}
                >
                  {Array.from({length: 60}).map((_, i) => <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 border-b border-slate-300 pb-2">Asosiy mehmon</h3>
            <div className="grid grid-cols-2 gap-3 relative">
              <input type="tel" placeholder="Telefon raqami (0 dan boshlab)" value={primaryGuest.phone} onChange={(e) => setPrimaryGuest({...primaryGuest, phone: e.target.value})} className="input-field" />
              <input type="text" placeholder="Ismi" value={primaryGuest.firstName} onChange={(e) => setPrimaryGuest({...primaryGuest, firstName: e.target.value})} className="input-field" required />
              <input type="text" placeholder="Familiyasi" value={primaryGuest.lastName} onChange={(e) => setPrimaryGuest({...primaryGuest, lastName: e.target.value})} className="input-field" required />
              <input type="text" placeholder="Pasport / JSHSHIR" value={primaryGuest.passportNumber} onChange={(e) => setPrimaryGuest({...primaryGuest, passportNumber: e.target.value})} className="input-field" />
              
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                  {searchResults.map(g => (
                    <div 
                      key={g.id} 
                      onClick={() => handleSelectGuest(g)}
                      className="p-3 hover:bg-slate-100 cursor-pointer border-b border-slate-200 last:border-0 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-900 font-medium">{g.firstName} {g.lastName}</p>
                          {g.hasActiveBooking && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                              #{g.activeBooking?.roomNumber}-xonada band
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">Tel: {g.phone || '-'} | Pasport: {g.passportNumber || '-'}</p>
                      </div>
                      <button type="button" className="text-xs bg-primary-50 text-primary-600 font-semibold px-2.5 py-1 rounded-lg border border-primary-200">Tanlash</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeWarning && (
              <div className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded-xl text-amber-900 text-xs flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                  <AlertTriangle size={18} className="shrink-0 text-amber-600" />
                  <span>DIQQAT: Mehmon hozirda {activeWarning.roomNumber}-xonada joylashgan!</span>
                </div>
                <p className="text-slate-700">
                  <strong>{activeWarning.guestName}</strong> ayni paytda faol bronga ega{activeWarning.debt > 0 ? ` (Qarz: ${activeWarning.debt.toLocaleString()} so'm)` : ''}.
                </p>
                <div className="bg-white/80 p-2 rounded-lg border border-amber-200 text-amber-900">
                  ⚠️ <strong>Admin eslatmasi:</strong> Agar mehmon qolgan to'lovni yoki qarzni to'layotgan bo'lsa, <u>boshqa xonaga yangi bron ochmang</u>! 
                  Mavjud <strong>#{activeWarning.roomNumber}-xona</strong> kartasiga kirib <strong>"To'lov qo'shish"</strong> tugmasidan foydalaning.
                </div>
              </div>
            )}
          </div>

          {additionalGuests.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 border-b border-slate-300 pb-2">Hamrohlar ({additionalGuests.length})</h3>
              {additionalGuests.map((g, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-300 relative">
                  <button type="button" onClick={() => removeGuest(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-300">
                    <Trash2 size={16} />
                  </button>
                  <div className="grid grid-cols-2 gap-3 pr-6 mt-1">
                    <select 
                      value={g.relation || ''} 
                      onChange={(e) => updateGuest(idx, 'relation', e.target.value)} 
                      className="input-field py-1.5 text-sm"
                    >
                      <option value="" disabled>Hamroh turi</option>
                      <option value="Do'sti">Do'sti</option>
                      <option value="Ayoli">Ayoli</option>
                      <option value="Eri">Eri</option>
                      <option value="Farzandi">Farzandi</option>
                      <option value="Ota-onasi">Ota-onasi</option>
                      <option value="Qarindoshi">Qarindoshi</option>
                      <option value="Hamkasbi">Hamkasbi</option>
                      <option value="Boshqa">Boshqa</option>
                    </select>
                    <input type="text" placeholder="Pasport / JSHSHIR" value={g.passportNumber || ''} onChange={(e) => updateGuest(idx, 'passportNumber', e.target.value)} className="input-field py-1.5 text-sm" />
                    <input type="text" placeholder="Ismi" value={g.firstName} onChange={(e) => updateGuest(idx, 'firstName', e.target.value)} className="input-field py-1.5 text-sm" required />
                    <input type="text" placeholder="Familiyasi" value={g.lastName} onChange={(e) => updateGuest(idx, 'lastName', e.target.value)} className="input-field py-1.5 text-sm" required />
                  </div>
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={addGuest} className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium">
            <Plus size={16} /> Hamroh qo'shish
          </button>

          <div className="space-y-3 pt-4 border-t border-slate-300">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-slate-900">To'lov qabul qilish (Split Payment)</h3>
              <p className="text-sm font-bold text-slate-800">Qabul qilingan: {totalPaid.toLocaleString()} so'm</p>
            </div>
            
            {payments.map((p, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg">
                <select value={p.method} onChange={(e) => updatePayment(idx, 'method', e.target.value)} className="input-field w-1/3">
                  {paymentMethods.map(pm => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                </select>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={formatNumberInput(p.amount)} 
                  onChange={(e) => updatePayment(idx, 'amount', parseNumberInput(e.target.value))} 
                  className="input-field flex-1" 
                  placeholder="Summa" 
                  required 
                />
                {payments.length > 1 && (
                  <button type="button" onClick={() => removePayment(idx)} className="text-red-400 px-2">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
            
            <button type="button" onClick={addPayment} className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 mt-2">
              <Plus size={16} /> Yana to'lov usuli qo'shish
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Bekor qilish</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Bajarilmoqda...' : 'Tasdiqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CheckInModalWrapper(props) {
  return <ModalPortal><CheckInModal {...props} /></ModalPortal>;
}
