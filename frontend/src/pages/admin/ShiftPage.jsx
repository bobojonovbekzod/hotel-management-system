import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Clock, Play, Lock, FileText, CheckCircle2 } from 'lucide-react';

export default function AdminShiftPage() {
  const [activeShift, setActiveShift] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);

  useEffect(() => {
    fetchActiveShift();
    fetchShifts();
  }, []);

  const fetchActiveShift = async () => {
    try {
      const res = await api.get('/shifts/my/active');
      setActiveShift(res.data.data);
    } catch {}
  };

  const fetchShifts = async () => {
    try {
      const now = new Date();
      const res = await api.get('/shifts', {
        params: { month: now.getMonth() + 1, year: now.getFullYear() },
      });
      setShifts(res.data.data);
    } catch {
      toast.error('Smenalarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      const res = await api.post('/shifts/start');
      setActiveShift(res.data.data);
      fetchShifts();
      toast.success('Smena boshlandi! 🎉');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const confirmClose = async () => {
    setClosing(true);
    try {
      await api.put(`/shifts/${activeShift.id}/close`, { notes: closeNotes });
      setActiveShift(null);
      setCloseNotes('');
      setShowCloseModal(false);
      fetchShifts();
      toast.success('Smena yopildi!');
    } catch {
      toast.error('Xato');
    } finally {
      setClosing(false);
    }
  };

  const handleClose = () => {
    setShowCloseModal(true);
  };

  const terminal = activeShift?.bookings?.filter(b => b.paymentMethod === 'terminal').reduce((sum, b) => sum + b.paidAmount, 0) || 0;
  const qrcode = activeShift?.bookings?.filter(b => b.paymentMethod === 'qrcode').reduce((sum, b) => sum + b.paidAmount, 0) || 0;
  const expenses = activeShift?.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const totalIncome = activeShift?.totalIncome || 0;
  const cashBalance = totalIncome - terminal - qrcode - expenses;

  const monthlyIncome = shifts.filter((s) => s.status === 'closed').reduce((sum, s) => sum + s.totalIncome, 0);
  const morningShifts = shifts.filter((s) => s.shiftType === 'morning');
  const nightShifts = shifts.filter((s) => s.shiftType === 'night');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="text-primary-400" /> Smena boshqaruvi
        </h1>
        <p className="text-slate-600 text-sm">Kunduzgi (08:00–19:00) | Tungi (19:00–08:00)</p>
      </div>

      {/* Active Shift Card */}
      {activeShift ? (
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 font-semibold text-lg">Faol smena</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeShift.shiftType === 'morning'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              {activeShift.shiftType === 'morning' ? 'Kunduzgi' : 'Tungi'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Boshlanish vaqti</p>
              <p className="font-bold text-slate-900">{format(new Date(activeShift.startTime), 'HH:mm')}</p>
              <p className="text-xs text-slate-600">{format(new Date(activeShift.startTime), 'dd.MM.yyyy')}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Smenada bronlar</p>
              <p className="text-3xl font-bold text-primary-400">{activeShift._count?.bookings || 0}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center col-span-2 md:col-span-1">
              <p className="text-xs text-slate-600 mb-1">Smenada tushum</p>
              <p className="text-xl font-bold text-emerald-400">{activeShift.totalIncome?.toLocaleString()}</p>
              <p className="text-xs text-slate-600">so'm</p>
            </div>
          </div>

          {/* Active bookings */}
          {activeShift.bookings?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">Faol bronlar:</p>
              <div className="space-y-2">
                {activeShift.bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">Xona {b.room?.roomNumber}</span>
                      <span className="text-xs text-slate-600">→ {b.primaryGuest?.firstName} {b.primaryGuest?.lastName}</span>
                      <span className="text-xs font-bold text-emerald-400 ml-2">{b.totalPrice?.toLocaleString()} so'm</span>
                    </div>
                    <span className="text-xs text-slate-600">{format(new Date(b.checkIn), 'HH:mm')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="label">Smena yopish izohi</label>
              <textarea
                className="input-field resize-none h-20"
                placeholder="Smena davomida eslatmalar, muammolar..."
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
            </div>
            <button
              id="close-shift-btn"
              onClick={handleClose}
              disabled={closing}
              className="btn-danger w-full flex items-center justify-center gap-2"
            >
              {closing ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock size={18} />}
              {closing ? 'Yopilmoqda...' : 'Smenani yopish'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card text-center py-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-300 text-slate-600">
            <Clock size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Faol smena yo'q</h3>
          <p className="text-slate-600 mb-6">Ishlashni boshlash uchun yangi smena oching</p>
          <button id="start-shift-btn" onClick={handleStart} className="btn-primary inline-flex items-center gap-2 px-8">
            <Play size={18} /> Smenani boshlash
          </button>
        </div>
      )}

      {/* Monthly stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs text-slate-600 mb-1">Oylik smenalar</p>
          <p className="text-3xl font-bold text-slate-900">{shifts.filter((s) => s.status === 'closed').length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-600 mb-1">Kunduzgi</p>
          <p className="text-3xl font-bold text-yellow-400">{morningShifts.filter((s) => s.status === 'closed').length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-600 mb-1">Tungi</p>
          <p className="text-3xl font-bold text-blue-400">{nightShifts.filter((s) => s.status === 'closed').length}</p>
        </div>
      </div>

      {/* Shifts history */}
      <div className="card">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-primary-400" /> Bu oylik smenalar
        </h3>
        {loading ? (
          <div className="py-8 text-center text-slate-600">Yuklanmoqda...</div>
        ) : shifts.length === 0 ? (
          <div className="py-8 text-center text-slate-600">Smena tarixi yo'q</div>
        ) : (
          <div className="space-y-2">
            {shifts.map((shift) => (
              <div key={shift.id}
                className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-300">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                    shift.shiftType === 'morning' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {shift.shiftType === 'morning' ? 'Kunduzgi' : 'Tungi'}
                  </span>
                  <div>
                    <p className="text-sm text-slate-900 font-medium">
                      {format(new Date(shift.startTime), 'dd.MM.yyyy HH:mm')}
                      {shift.endTime && ` → ${format(new Date(shift.endTime), 'HH:mm')}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-400">{shift.totalIncome.toLocaleString()} so'm</p>
                  <p className="text-xs text-slate-600">{shift._count?.bookings || 0} bron</p>
                </div>
              </div>
            ))}
          </div>
        )}
  
      {showCloseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-300 w-full max-w-md rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Smenani yopish tasdig'i</h3>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Jami tushum:</span>
                  <span className="font-bold text-slate-900">{totalIncome.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Terminal orqali:</span>
                  <span className="font-medium text-blue-600">-{terminal.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">QrCode orqali:</span>
                  <span className="font-medium text-orange-600">-{qrcode.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Xarajatlar:</span>
                  <span className="font-medium text-red-600">-{expenses.toLocaleString()} so'm</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between">
                  <span className="font-bold text-slate-900">Kassadagi naqd pul:</span>
                  <span className="font-bold text-emerald-600 text-lg">{cashBalance.toLocaleString()} so'm</span>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 mb-4">Haqiqatan ham ushbu smenani yopmoqchimisiz? Yopilgandan so'ng tahrirlab bo'lmaydi.</p>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={confirmClose}
                  disabled={closing}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  {closing ? 'Yopilmoqda...' : 'Ha, smenani yopish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
