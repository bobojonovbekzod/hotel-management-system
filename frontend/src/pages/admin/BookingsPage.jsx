import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ClipboardList, 
  DoorOpen, 
  XCircle, 
  CheckCircle, 
  List, 
  Wallet, 
  CreditCard, 
  Smartphone,
  Building2,
  Search,
  Users,
  Phone,
  Calendar as CalendarIcon,
  X,
  Loader2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { formatNumberInput, parseNumberInput } from '../../lib/formatters';


const statusBadge = {
  active: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  checked_out: 'bg-slate-500/15 text-slate-700 border-slate-300',
  cancelled: 'bg-red-500/15 text-red-700 border-red-300',
};

const statusLabel = {
  active: 'Faol',
  checked_out: 'Chiqdi',
  cancelled: 'Bekor',
};

const paymentIcon = { 
  cash: <Wallet size={16} className="text-emerald-500" title="Naqd" />, 
  terminal: <CreditCard size={16} className="text-blue-500" title="Terminal" />, 
  qrcode: <Smartphone size={16} className="text-orange-500" title="QR Code" />,
  mixed: <List size={16} className="text-purple-500" title="Aralash" />
};

export default function AdminBookingsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';

  const [bookings, setBookings] = useState([]);
  const [branches, setBranches] = useState([]);
  // Owner default: empty string (no branch selected by default)
  const [selectedBranch, setSelectedBranch] = useState(isOwner ? '' : 'all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [activeShift, setActiveShift] = useState(null);

  // Penalty Modal states
  const [penaltyBooking, setPenaltyBooking] = useState(null);
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [penaltyMethod, setPenaltyMethod] = useState('cash');
  const [penaltyDescription, setPenaltyDescription] = useState('');
  const [penaltySubmitting, setPenaltySubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/shifts/my/active')
        .then(res => setActiveShift(res.data?.data || null))
        .catch(() => setActiveShift(null));
    }
  }, [user]);

  const handlePenaltySubmit = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(parseNumberInput(penaltyAmount));
    if (!parsed || parsed <= 0) {
      toast.error("Iltimos, to'g'ri summa kiriting");
      return;
    }
    if (!penaltyDescription.trim()) {
      toast.error("Iltimos, jarima sababini (izoh) kiriting");
      return;
    }

    setPenaltySubmitting(true);
    try {
      const res = await api.post(`/bookings/${penaltyBooking.id}/penalty`, {
        amount: parsed,
        method: penaltyMethod,
        description: penaltyDescription.trim()
      });

      toast.success(res.data.message || "Jarima qabul qilindi va smenangiz kassasiga kiritildi!");
      
      const updated = res.data.data;
      if (selected && selected.id === updated.id) {
        setSelected(updated);
      }
      setBookings(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
      setPenaltyBooking(null);
      setPenaltyAmount('');
      setPenaltyDescription('');
    } catch (err) {
      const errMsg = err.response?.data?.message || "Xatolik yuz berdi";
      toast.error(errMsg);
    } finally {
      setPenaltySubmitting(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      api.get('/branches')
        .then(res => setBranches(res.data?.data || []))
        .catch(err => console.error('Filiallarni yuklashda xato:', err));
    }
  }, [isOwner]);

  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'all') {
      api.get(`/shifts/branch-active/${selectedBranch}`)
        .then(res => setActiveShift(res.data?.data || null))
        .catch(() => setActiveShift(null));
    } else if (user?.role !== 'admin') {
      setActiveShift(null);
    }
  }, [selectedBranch, user]);


  useEffect(() => {
    // For Owner, only fetch if a branch is selected
    if (isOwner && !selectedBranch) {
      setBookings([]);
      return;
    }
    fetchBookings();
  }, [filter, selectedBranch, startDate, endDate]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let params = {};
      if (isOwner && selectedBranch) {
        params.branchId = selectedBranch;
      }
      if (filter === 'overdue') {
        params.status = 'active';
        params.overdue = 'true';
      } else if (filter !== 'all') {
        params.status = filter;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/bookings', { params });
      setBookings(res.data?.data || []);
    } catch {
      toast.error('Bronlarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  };

  // Real-time search filter
  const filteredBookings = bookings.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const primaryName = `${b.primaryGuest?.firstName || ''} ${b.primaryGuest?.lastName || ''}`.toLowerCase();
    const phone = (b.primaryGuest?.phone || '').toLowerCase();
    const passport = (b.primaryGuest?.passportNumber || '').toLowerCase();
    const roomNum = (b.room?.roomNumber || '').toString().toLowerCase();
    const branchName = (b.branch?.name || '').toLowerCase();

    // Also search in additional guests
    const addGuestsMatch = b.additionalGuests?.some(ag => 
      `${ag.guest?.firstName || ''} ${ag.guest?.lastName || ''}`.toLowerCase().includes(q) ||
      (ag.guest?.passportNumber || '').toLowerCase().includes(q) ||
      (ag.guest?.phone || '').toLowerCase().includes(q)
    );

    return primaryName.includes(q) || phone.includes(q) || passport.includes(q) || roomNum.includes(q) || branchName.includes(q) || addGuestsMatch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="text-primary-500" size={28} /> Mehmonlar
          </h1>
        </div>

        {/* Branch selector for Owner */}
        {isOwner && (
          <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-indigo-200 shadow-sm">
            <Building2 size={18} className="text-indigo-600 flex-shrink-0" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-sm font-bold text-indigo-900 outline-none cursor-pointer pr-2"
            >
              <option value="">-- Filialni tanlang --</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>📍 {b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Active Shift Indicator if available */}
      {selectedBranch && activeShift && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Hozirgi faol smena: <strong>{activeShift.admin?.name || 'Admin'}</strong></span>
            <span className="text-emerald-600">({format(new Date(activeShift.startTime), 'HH:mm dd.MM.yyyy')} da boshlangan)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">
              Ushbu smenada kirganlar: {activeShift._count?.bookings || 0} ta
            </span>
            <span className="font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-lg shadow-sm">
              Xonadagi joriy mehmonlar: {bookings.filter(b => b.status === 'active').length} ta
            </span>
          </div>
        </div>
      )}

      {/* Filters Card: Status, Dates & Search */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Status Filters */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'active', label: 'Joriy mehmonlar (Xonada)', icon: <CheckCircle size={16} /> },
              { key: 'active_shift', label: 'Smenadagi barcha bronlar', icon: <ClipboardList size={16} /> },
              { key: 'checked_out', label: 'Chiqganlar', icon: <DoorOpen size={16} /> },
              { key: 'overdue', label: "Vaqti o'tganlar", icon: <XCircle size={16} /> },
              { key: 'all', label: 'Hammasi', icon: <List size={16} /> },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filter === f.key
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          {/* Date Range & Search */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Date filter inputs */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
              <CalendarIcon size={16} className="text-slate-400 ml-1 flex-shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-700 font-medium outline-none"
                title="Boshlanish sanasi"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-700 font-medium outline-none"
                title="Tugash sanasi"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-slate-400 hover:text-rose-500 p-1"
                  title="Sanani tozalash"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Live Search Input */}
            <div className="relative min-w-[240px] flex-1 lg:flex-initial">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ism, pasport, tel, xona..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-primary-500 shadow-sm"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Bookings Content / Table */}
      {isOwner && !selectedBranch ? (
        <div className="card p-16 text-center space-y-3 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 border-indigo-100">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Building2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Filial tanlanmagan</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Mehmonlar va ularning kelib-ketish tarixini ko'rish uchun iltimos yuqoridagi menyudan kerakli filialni tanlang.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" /><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-slate-600 font-medium">Ushbu k mezonlar bo'yicha hech qanday mehmon/bron topilmadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Mehmon</th>
                    <th className="py-3 px-4">Pasport / Hujjat</th>
                    <th className="py-3 px-4">Xona</th>
                    <th className="py-3 px-4">Kirish</th>
                    <th className="py-3 px-4">Chiqish</th>
                    <th className="py-3 px-4 text-center">To'lov</th>
                    <th className="py-3 px-4 text-right">Summa</th>
                    <th className="py-3 px-4 text-center">Holat</th>
                    <th className="py-3 px-4 text-center">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredBookings.map((b) => {
                    const isOverdue = b.status === 'active' && new Date(b.checkOutExpected) < new Date();
                    return (
                      <tr 
                        key={b.id} 
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${isOverdue ? 'bg-rose-50/60 hover:bg-rose-50' : ''}`}
                        onClick={() => setSelected(b)}
                      >
                        {/* Mehmon */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-semibold text-slate-900">{b.primaryGuest?.firstName} {b.primaryGuest?.lastName}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone size={12} className="text-slate-400" /> {b.primaryGuest?.phone || '-'}
                            </p>
                            {b.additionalGuests?.length > 0 && (
                              <span className="inline-block mt-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                +{b.additionalGuests.length} mehmon
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Pasport */}
                        <td className="py-3.5 px-4">
                          {b.primaryGuest?.passportNumber ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg">
                              <span className="text-xs font-mono font-bold text-slate-800">🪪 {b.primaryGuest.passportNumber}</span>
                              {b.primaryGuest.nationality && (
                                <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 px-1 rounded">
                                  {b.primaryGuest.nationality}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Mavjud emas</span>
                          )}
                        </td>

                        {/* Xona */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900">#{b.room?.roomNumber}</span>
                          <p className="text-xs text-slate-500">{b.room?.roomType}</p>
                        </td>

                        {/* Kirish */}
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                          {format(new Date(b.checkIn), 'dd.MM.yyyy HH:mm')}
                        </td>

                        {/* Chiqish */}
                        <td className="py-3.5 px-4 text-xs font-medium">
                          {b.checkOutActual ? (
                            <span className="text-slate-700">{format(new Date(b.checkOutActual), 'dd.MM.yyyy HH:mm')}</span>
                          ) : (
                            <span className={isOverdue ? "text-rose-600 font-bold flex items-center gap-1" : "text-amber-600 flex items-center gap-1"}>
                              {format(new Date(b.checkOutExpected), 'dd.MM.yyyy HH:mm')} {isOverdue ? '⚠️' : '⏳'}
                            </span>
                          )}
                        </td>

                        {/* To'lov */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex justify-center items-center p-1.5 rounded-lg bg-slate-100">
                            {paymentIcon[b.paymentMethod] || <span className="text-slate-400 text-xs">-</span>}
                          </span>
                        </td>

                        {/* Summa */}
                        <td className="py-3.5 px-4 text-right">
                          <p className="font-bold text-slate-900">{(b.paidAmount || 0).toLocaleString()} so'm</p>
                          {b.paidAmount < b.totalPrice && (
                            <p className="text-xs text-rose-500 font-medium">Jami: {(b.totalPrice || 0).toLocaleString()}</p>
                          )}
                        </td>

                        {/* Holat */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge[b.status] || 'bg-slate-100 text-slate-700'}`}>
                            {statusLabel[b.status] || b.status}
                          </span>
                        </td>

                        {/* Amal */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setPenaltyBooking(b);
                              setPenaltyAmount('');
                              setPenaltyDescription('');
                              setPenaltyMethod('cash');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg inline-flex items-center gap-1 transition-colors"
                            title="Jarima / Zarar to'lovi yozish"
                          >
                            <AlertTriangle size={13} /> Jarima
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Booking Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="w-full max-w-lg card p-6 bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="text-indigo-600" size={22} /> Bron #{selected.id}
                </h2>
                {selected.branch?.name && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Filial: {selected.branch.name}</p>
                )}
              </div>
              <button 
                onClick={() => setSelected(null)} 
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-xl transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {/* Asosiy mehmon va Pasport */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1">
                  <p className="text-slate-500 text-xs font-semibold uppercase">Asosiy mehmon</p>
                  <p className="text-slate-900 font-bold text-base">{selected.primaryGuest?.firstName} {selected.primaryGuest?.lastName}</p>
                  <p className="text-slate-600 text-xs">📞 {selected.primaryGuest?.phone || '-'}</p>
                  
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-slate-500 text-[11px] font-semibold uppercase">Pasport seriyasi / Raqami:</p>
                    <p className="text-indigo-700 font-mono font-bold text-sm bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded mt-0.5 inline-block">
                      🪪 {selected.primaryGuest?.passportNumber || 'Kiritilmagan'}
                    </p>
                    {selected.primaryGuest?.nationality && (
                      <p className="text-slate-500 text-xs mt-1">Fuqaroligi: <span className="font-semibold text-slate-800 uppercase">{selected.primaryGuest.nationality}</span></p>
                    )}
                  </div>
                </div>

                {/* Xona ma'lumoti */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 text-xs font-semibold mb-1 uppercase">Xona ma'lumoti</p>
                  <p className="text-indigo-700 font-extrabold text-2xl">#{selected.room?.roomNumber}</p>
                  <p className="text-slate-600 text-xs mt-1">{selected.room?.roomType} | {selected.room?.floor}-qavat</p>
                </div>
              </div>

              {/* Qo'shimcha mehmonlar */}
              {selected.additionalGuests?.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 text-xs font-semibold mb-2 uppercase flex items-center gap-1">
                    <Users size={14} className="text-indigo-600" /> Qo'shimcha mehmonlar ({selected.additionalGuests.length} ta):
                  </p>
                  <div className="space-y-2">
                    {selected.additionalGuests.map((ag, i) => (
                      <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{i + 1}. {ag.guest?.firstName} {ag.guest?.lastName}</p>
                          <p className="text-slate-500">📞 {ag.guest?.phone || '-'}</p>
                        </div>
                        <div>
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            🪪 {ag.guest?.passportNumber || 'Pasportsiz'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 text-xs font-semibold">Kirish sanasi</p>
                  <p className="text-slate-900 font-semibold mt-1">{format(new Date(selected.checkIn), 'dd.MM.yyyy HH:mm')}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 text-xs font-semibold">Chiqish sanasi</p>
                  <p className="text-slate-900 font-semibold mt-1">
                    {selected.checkOutActual
                      ? format(new Date(selected.checkOutActual), 'dd.MM.yyyy HH:mm')
                      : `${format(new Date(selected.checkOutExpected), 'dd.MM.yyyy HH:mm')} (kutilmoqda)`}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 text-xs font-semibold">To'langan summa</p>
                  <p className="text-emerald-600 font-bold text-base mt-1">{(selected.paidAmount || 0).toLocaleString()} so'm</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 text-xs font-semibold">Jami umumiy summa</p>
                  <p className="text-slate-900 font-bold text-base mt-1">{(selected.totalPrice || 0).toLocaleString()} so'm</p>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <p className="text-amber-800 text-xs font-semibold mb-1">Izoh / Eslatma:</p>
                  <p className="text-slate-800 text-xs">{selected.notes}</p>
                </div>
              )}

              {/* Qilingan to'lovlar va Jarimalar tarixi */}
              {selected.payments && selected.payments.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 text-xs font-semibold mb-2 uppercase flex items-center justify-between">
                    <span>To'lovlar tarixi ({selected.payments.length} ta):</span>
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {selected.payments.map((p) => {
                      const isPenalty = p.type === 'penalty';
                      return (
                        <div 
                          key={p.id} 
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                            isPenalty 
                              ? 'bg-rose-50/80 border-rose-200 text-rose-950' 
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 font-medium">
                              {isPenalty ? (
                                <span className="px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 font-bold text-[10px] uppercase">
                                  Jarima
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                                  Xona to'lovi
                                </span>
                              )}
                              <span className="capitalize text-slate-500 font-normal">({p.method})</span>
                            </div>
                            {p.description && (
                              <p className="text-[11px] text-slate-600 mt-0.5 italic">Sabab: {p.description}</p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-0.5">{format(new Date(p.createdAt), 'dd.MM.yyyy HH:mm')}</p>
                          </div>
                          <span className={`font-bold font-mono text-sm ${isPenalty ? 'text-rose-600' : 'text-emerald-600'}`}>
                            +{p.amount?.toLocaleString()} so'm
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setPenaltyBooking(selected);
                  setPenaltyAmount('');
                  setPenaltyDescription('');
                  setPenaltyMethod('cash');
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-rose-200 active:scale-95"
              >
                <AlertTriangle size={15} /> Jarima / Zarar yozish
              </button>
              <button
                onClick={() => setSelected(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Penalty Modal */}
      {penaltyBooking && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && !penaltySubmitting && setPenaltyBooking(null)}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle size={22} />
                <h3 className="text-lg font-bold text-slate-900">Jarima / Zarar to'lovi yozish</h3>
              </div>
              <button 
                type="button"
                onClick={() => setPenaltyBooking(null)}
                disabled={penaltySubmitting}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-lg transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Xona:</span>
                <span className="font-bold text-slate-800 font-mono">#{penaltyBooking.room?.roomNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mehmon:</span>
                <span className="font-semibold text-slate-800">{penaltyBooking.primaryGuest?.firstName} {penaltyBooking.primaryGuest?.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Holati:</span>
                <span className="font-medium text-slate-700 capitalize">{statusLabel[penaltyBooking.status] || penaltyBooking.status}</span>
              </div>
            </div>

            <form onSubmit={handlePenaltySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Jarima summasi (so'm) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Masalan: 50 000"
                  value={formatNumberInput(penaltyAmount)}
                  onChange={(e) => setPenaltyAmount(parseNumberInput(e.target.value))}
                  className="input-field text-base font-bold text-slate-900"
                  autoFocus
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['50000', '100000', '150000', '200000', '300000', '500000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPenaltyAmount(preset)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                    >
                      +{Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  To'lov usuli *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: 'Naqd', icon: Wallet },
                    { id: 'qrcode', label: 'QR Code', icon: Smartphone },
                    { id: 'terminal', label: 'Karta', icon: CreditCard },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = penaltyMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPenaltyMethod(m.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected 
                            ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={18} className="mb-1" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Sababi / Zarar izohi *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Masalan: Sochiq kuydirilgan, choyshab kirlangan, chashka singan..."
                  value={penaltyDescription}
                  onChange={(e) => setPenaltyDescription(e.target.value)}
                  className="input-field text-xs resize-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Kassaga kirim qilinadi:</p>
                  <p className="text-amber-700 mt-0.5">
                    Ushbu summa avtomatik ravishda <strong>sizning hozirgi faol smenangiz kassa daromadiga</strong> qo'shiladi.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={penaltySubmitting}
                  onClick={() => setPenaltyBooking(null)}
                  className="flex-1 btn-secondary text-xs py-2.5"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={penaltySubmitting || !penaltyAmount}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-rose-300 transition-colors"
                >
                  {penaltySubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Kassaga qabul qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
