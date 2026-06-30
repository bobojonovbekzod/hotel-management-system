import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../lib/api';
import { CalendarDays, AlertTriangle, ArrowRight, User } from 'lucide-react';
import ManageBookingModal from '../../components/admin/ManageBookingModal';

export default function RentersPage() {
  const [renters, setRenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manageBookingId, setManageBookingId] = useState(null);

  useEffect(() => {
    fetchRenters();
  }, []);

  const fetchRenters = async () => {
    try {
      const res = await api.get('/bookings', { params: { bookingType: 'monthly', status: 'active' } });
      setRenters(res.data.data);
    } catch {
      toast.error("Ijarachilarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  const handleManage = (id) => {
    setManageBookingId(id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-400">
          <CalendarDays size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Oylik Ijarachilar</h1>
          <p className="text-slate-400">Uzoq muddatli yashovchi mijozlar ro'yxati</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="py-10 text-center text-slate-400">Yuklanmoqda...</div>
        ) : renters.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center">
            <User size={48} className="text-slate-600 mb-4" />
            <p className="text-slate-400">Joriy filialda oylik ijarachilar yo'q.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Xona / Mijoz</th>
                  <th className="table-th">Yashash davri</th>
                  <th className="table-th text-right">Umumiy hisob</th>
                  <th className="table-th text-right">To'langan</th>
                  <th className="table-th text-right">Qarz</th>
                  <th className="table-th text-center">Holat</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {renters.map(r => {
                  const remaining = r.totalPrice - r.paidAmount;
                  return (
                    <tr key={r.id} className="table-row">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold border border-slate-700">
                            {r.room?.roomNumber}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{r.primaryGuest?.firstName} {r.primaryGuest?.lastName}</p>
                            <p className="text-xs text-slate-400">{r.primaryGuest?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <span>{format(new Date(r.checkIn), 'dd.MM.yy')}</span>
                          <ArrowRight size={14} className="text-slate-500" />
                          <span className={r.isOverstay ? 'text-red-400 font-bold' : ''}>
                            {format(new Date(r.checkOutExpected), 'dd.MM.yy')}
                          </span>
                        </div>
                      </td>
                      <td className="table-td text-right font-medium text-slate-300">
                        {r.totalPrice.toLocaleString()} <span className="text-xs text-slate-500">so'm</span>
                      </td>
                      <td className="table-td text-right font-medium text-emerald-400">
                        {r.paidAmount.toLocaleString()} <span className="text-xs text-slate-500 text-emerald-400/50">so'm</span>
                      </td>
                      <td className="table-td text-right font-bold">
                        {remaining > 0 ? (
                          <span className="text-red-400">{remaining.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="table-td text-center">
                        {r.isOverstay ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                            <AlertTriangle size={12} /> Vaqti o'tdi
                          </span>
                        ) : remaining > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            Qarzdor
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Aktiv
                          </span>
                        )}
                      </td>
                      <td className="table-td text-right">
                        <button 
                          onClick={() => handleManage(r.id)}
                          className="btn-secondary py-1.5 px-3 text-xs"
                        >
                          Boshqarish
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {manageBookingId && (
        <ManageBookingModal
          bookingId={manageBookingId}
          onClose={() => setManageBookingId(null)}
          onSuccess={() => { setManageBookingId(null); fetchRenters(); }}
        />
      )}
    </div>
  );
}
