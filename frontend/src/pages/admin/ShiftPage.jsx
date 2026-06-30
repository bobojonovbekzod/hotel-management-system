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

  const handleClose = async () => {
    if (!confirm('Smenani yopishga ishonchingiz komilmi?')) return;
    setClosing(true);
    try {
      await api.put(`/shifts/${activeShift.id}/close`, { notes: closeNotes });
      setActiveShift(null);
      setCloseNotes('');
      fetchShifts();
      toast.success('Smena yopildi!');
    } catch {
      toast.error('Xato');
    } finally {
      setClosing(false);
    }
  };

  const monthlyIncome = shifts.filter((s) => s.status === 'closed').reduce((sum, s) => sum + s.totalIncome, 0);
  const morningShifts = shifts.filter((s) => s.shiftType === 'morning');
  const nightShifts = shifts.filter((s) => s.shiftType === 'night');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="text-primary-400" /> Smena boshqaruvi
        </h1>
        <p className="text-slate-400 text-sm">Kunduzgi (08:00–19:00) | Tungi (19:00–08:00)</p>
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
            <div className="bg-slate-800/30 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">Boshlanish vaqti</p>
              <p className="font-bold text-white">{format(new Date(activeShift.startTime), 'HH:mm')}</p>
              <p className="text-xs text-slate-500">{format(new Date(activeShift.startTime), 'dd.MM.yyyy')}</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">Smenada bronlar</p>
              <p className="text-3xl font-bold text-primary-400">{activeShift._count?.bookings || 0}</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-4 text-center col-span-2 md:col-span-1">
              <p className="text-xs text-slate-400 mb-1">Smenada tushum</p>
              <p className="text-xl font-bold text-emerald-400">{activeShift.totalIncome?.toLocaleString()}</p>
              <p className="text-xs text-slate-500">so'm</p>
            </div>
          </div>

          {/* Active bookings */}
          {activeShift.bookings?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-slate-400 mb-2">Faol bronlar:</p>
              <div className="space-y-2">
                {activeShift.bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">Xona {b.room?.roomNumber}</span>
                      <span className="text-xs text-slate-400">→ {b.primaryGuest?.firstName} {b.primaryGuest?.lastName}</span>
                    </div>
                    <span className="text-xs text-slate-400">{format(new Date(b.checkIn), 'HH:mm')}</span>
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
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700/50 text-slate-500">
            <Clock size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Faol smena yo'q</h3>
          <p className="text-slate-400 mb-6">Ishlashni boshlash uchun yangi smena oching</p>
          <button id="start-shift-btn" onClick={handleStart} className="btn-primary inline-flex items-center gap-2 px-8">
            <Play size={18} /> Smenani boshlash
          </button>
        </div>
      )}

      {/* Monthly stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs text-slate-400 mb-1">Oylik smenalar</p>
          <p className="text-3xl font-bold text-white">{shifts.filter((s) => s.status === 'closed').length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-400 mb-1">Kunduzgi</p>
          <p className="text-3xl font-bold text-yellow-400">{morningShifts.filter((s) => s.status === 'closed').length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-400 mb-1">Tungi</p>
          <p className="text-3xl font-bold text-blue-400">{nightShifts.filter((s) => s.status === 'closed').length}</p>
        </div>
      </div>

      {/* Shifts history */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <FileText size={18} className="text-primary-400" /> Bu oylik smenalar
        </h3>
        {loading ? (
          <div className="py-8 text-center text-slate-400">Yuklanmoqda...</div>
        ) : shifts.length === 0 ? (
          <div className="py-8 text-center text-slate-400">Smena tarixi yo'q</div>
        ) : (
          <div className="space-y-2">
            {shifts.map((shift) => (
              <div key={shift.id}
                className="flex items-center justify-between bg-slate-800/30 rounded-xl px-4 py-3 border border-slate-700/30">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                    shift.shiftType === 'morning' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {shift.shiftType === 'morning' ? 'Kunduzgi' : 'Tungi'}
                  </span>
                  <div>
                    <p className="text-sm text-white font-medium">
                      {format(new Date(shift.startTime), 'dd.MM.yyyy HH:mm')}
                      {shift.endTime && ` → ${format(new Date(shift.endTime), 'HH:mm')}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-400">{shift.totalIncome.toLocaleString()} so'm</p>
                  <p className="text-xs text-slate-400">{shift._count?.bookings || 0} bron</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
