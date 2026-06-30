import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../lib/api';
import { CalendarClock, PlusCircle, AlertTriangle } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import ReserveModal from '../../components/admin/ReserveModal';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReserveModal, setShowReserveModal] = useState(false);
  
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, message: '', title: '' });

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const res = await api.get('/bookings', { params: { status: 'reserved' } });
      setReservations(res.data.data);
    } catch {
      toast.error("Bronlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  const cancelReservation = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: "Bronni bekor qilish",
      message: "Rostdan ham bu bronni bekor qilmoqchimisiz?",
      action: async () => {
        try {
          await api.put(`/bookings/${id}/cancel`);
          toast.success("Bron bekor qilindi!");
          fetchReservations();
        } catch {
          toast.error("Xatolik yuz berdi");
        } finally {
          setConfirmDialog({ isOpen: false });
        }
      }
    });
  };

  const confirmCheckIn = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: "Tasdiqlash",
      message: "Mehmon haqiqatda yetib kelganini va xonaga kiritishni tasdiqlaysizmi?",
      action: async () => {
        try {
          await api.put(`/bookings/${id}/confirm-reservation`);
          toast.success("Xonaga kiritildi!");
          fetchReservations();
        } catch {
          toast.error("Xatolik yuz berdi");
        } finally {
          setConfirmDialog({ isOpen: false });
        }
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-400">
            <CalendarClock size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Oldindan Bron qilinganlar</h1>
            <p className="text-slate-400">Kutilayotgan mehmonlar va zakladlar ro'yxati</p>
          </div>
        </div>
        
        <button onClick={() => setShowReserveModal(true)} className="btn-primary flex items-center gap-2">
          <PlusCircle size={20} /> Yangi Bron Qilish
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="py-10 text-center text-slate-400">Yuklanmoqda...</div>
        ) : reservations.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center">
            <CalendarClock size={48} className="text-slate-600 mb-4" />
            <p className="text-slate-400">Hozircha oldindan bron qilingan xonalar yo'q.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Mehmon</th>
                  <th className="table-th text-center">Xona</th>
                  <th className="table-th">Kelish / Ketish</th>
                  <th className="table-th text-right">Kelishilgan narx</th>
                  <th className="table-th text-right">Zaklad</th>
                  <th className="table-th text-center">Holat</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => {
                  const today = new Date().toDateString() === new Date(r.checkIn).toDateString();
                  
                  return (
                    <tr key={r.id} className="table-row">
                      <td className="table-td">
                        <p className="font-semibold text-white">{r.primaryGuest?.firstName} {r.primaryGuest?.lastName}</p>
                        <p className="text-xs text-slate-400">{r.primaryGuest?.phone}</p>
                      </td>
                      <td className="table-td text-center">
                        <span className="px-3 py-1 bg-slate-800 rounded-lg text-white font-bold border border-slate-700">
                          {r.room?.roomNumber}
                        </span>
                      </td>
                      <td className="table-td text-sm text-slate-300">
                        <div className="flex flex-col">
                          <span className={today ? 'text-orange-400 font-bold' : ''}>K: {format(new Date(r.checkIn), 'dd.MM.yyyy')}</span>
                          <span>Ch: {format(new Date(r.checkOutExpected), 'dd.MM.yyyy')}</span>
                        </div>
                      </td>
                      <td className="table-td text-right font-medium text-slate-300">
                        {r.totalPrice.toLocaleString()} <span className="text-xs text-slate-500">so'm</span>
                      </td>
                      <td className="table-td text-right font-medium text-emerald-400">
                        {r.paidAmount.toLocaleString()} <span className="text-xs text-slate-500 text-emerald-400/50">so'm</span>
                      </td>
                      <td className="table-td text-center">
                        {today ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            <AlertTriangle size={12} /> Bugun keladi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Kutilmoqda
                          </span>
                        )}
                      </td>
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-2">
                          {today && (
                            <button onClick={() => confirmCheckIn(r.id)} className="btn-primary px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 shadow-none">
                              Xonaga kiritish
                            </button>
                          )}
                          <button onClick={() => cancelReservation(r.id)} className="btn-secondary px-3 py-1.5 text-xs text-red-400 hover:text-white hover:bg-red-500/20">
                            Bekor qilish
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDialog.isOpen && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.action}
          onCancel={() => setConfirmDialog({ isOpen: false })}
        />
      )}

      {showReserveModal && (
        <ReserveModal
          onClose={() => setShowReserveModal(false)}
          onSuccess={() => { setShowReserveModal(false); fetchReservations(); }}
        />
      )}
    </div>
  );
}
