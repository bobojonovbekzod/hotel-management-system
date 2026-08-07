import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ClipboardList, DoorOpen, XCircle, CheckCircle, List, Wallet, CreditCard, Smartphone } from 'lucide-react';

const statusBadge = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  checked_out: 'bg-slate-500/20 text-slate-600 border-slate-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
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
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let params = {};
      if (filter === 'overdue') {
        params = { status: 'active', overdue: true };
      } else if (filter !== 'all') {
        params = { status: filter };
      }
      const res = await api.get('/bookings', { params });
      setBookings(res.data.data);
    } catch {
      toast.error('Bronlarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="text-primary-400" /> Mijozlar (Tarix)
          </h1>
          <p className="text-slate-600 text-sm mt-1">Barcha kelib-ketgan va joriy mijozlar ro'yxati</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'active', label: 'Faol', icon: <CheckCircle size={16} /> },
          { key: 'checked_out', label: 'Chiqdi', icon: <DoorOpen size={16} /> },
          { key: 'overdue', label: "Vaqti o'tganlar", icon: <XCircle size={16} /> },
          { key: 'all', label: 'Hammasi', icon: <List size={16} /> },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              filter === f.key
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bookings Table */}
      <div className="card">
        {loading ? (
          <div className="py-12 text-center text-slate-600">Yuklanmoqda...</div>
        ) : bookings.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-slate-600">Bron topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Mehmon</th>
                  <th className="table-th">Xona</th>
                  <th className="table-th">Kirish</th>
                  <th className="table-th">Chiqish</th>
                  <th className="table-th">To'lov</th>
                  <th className="table-th text-right">Summa</th>
                  <th className="table-th">Holat</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const isOverdue = b.status === 'active' && new Date(b.checkOutExpected) < new Date();
                  return (
                  <tr key={b.id} className={`table-row cursor-pointer ${isOverdue ? 'bg-red-500/5 hover:bg-red-500/10' : ''}`} onClick={() => setSelected(b)}>
                    <td className="table-td">
                      <div>
                        <p className="font-medium text-slate-900">{b.primaryGuest?.firstName} {b.primaryGuest?.lastName}</p>
                        <p className="text-xs text-slate-600">{b.primaryGuest?.phone}</p>
                        {b.additionalGuests?.length > 0 && (
                          <p className="text-xs text-primary-400">+{b.additionalGuests.length} mehmon</p>
                        )}
                      </div>
                    </td>
                    <td className="table-td">
                      <span className="font-bold text-slate-900">#{b.room?.roomNumber}</span>
                      <p className="text-xs text-slate-600">{b.room?.roomType}</p>
                    </td>
                    <td className="table-td text-xs">{format(new Date(b.checkIn), 'dd.MM HH:mm')}</td>
                    <td className="table-td text-xs">
                      {b.checkOutActual
                        ? format(new Date(b.checkOutActual), 'dd.MM HH:mm')
                        : <span className={isOverdue ? "text-red-500 font-bold" : "text-yellow-500"}>
                            {format(new Date(b.checkOutExpected), 'dd.MM HH:mm')} {isOverdue ? '⚠️' : '⏳'}
                          </span>}
                    </td>
                    <td className="table-td">
                      <span className="flex justify-center items-center">{paymentIcon[b.paymentMethod] || <span className="text-slate-400 text-xs">-</span>}</span>
                    </td>
                    <td className="table-td text-right">
                      <p className="font-bold text-slate-900">{b.paidAmount?.toLocaleString()}</p>
                      {b.paidAmount < b.totalPrice && (
                        <p className="text-xs text-red-400">Jami: {b.totalPrice?.toLocaleString()}</p>
                      )}
                    </td>
                    <td className="table-td">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${statusBadge[b.status]}`}>
                        {statusLabel[b.status]}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-content p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">Bron #{selected.id}</h2>
              <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-slate-900 text-2xl">&times;</button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-600 text-xs mb-1">Asosiy mehmon</p>
                  <p className="text-slate-900 font-semibold">{selected.primaryGuest?.firstName} {selected.primaryGuest?.lastName}</p>
                  <p className="text-slate-600">{selected.primaryGuest?.phone}</p>
                  <p className="text-slate-600">{selected.primaryGuest?.passportNumber}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-600 text-xs mb-1">Xona</p>
                  <p className="text-slate-900 font-bold text-xl">#{selected.room?.roomNumber}</p>
                  <p className="text-slate-600">{selected.room?.roomType} | {selected.room?.floor}-qavat</p>
                </div>
              </div>
              {selected.additionalGuests?.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-600 text-xs mb-2">Qo'shimcha mehmonlar:</p>
                  {selected.additionalGuests.map((ag, i) => (
                    <p key={i} className="text-slate-900 text-sm">
                      {i + 1}. {ag.guest?.firstName} {ag.guest?.lastName}
                    </p>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-600 text-xs">Kirish</p>
                  <p className="text-slate-900">{format(new Date(selected.checkIn), 'dd.MM.yyyy HH:mm')}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-600 text-xs">Chiqish</p>
                  <p className="text-slate-900">
                    {selected.checkOutActual
                      ? format(new Date(selected.checkOutActual), 'dd.MM.yyyy HH:mm')
                      : `${format(new Date(selected.checkOutExpected), 'dd.MM.yyyy HH:mm')} (taxminiy)`}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-600 text-xs">To'langan</p>
                  <p className="text-emerald-400 font-bold">{selected.paidAmount?.toLocaleString()} so'm</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-600 text-xs">Jami narx</p>
                  <p className="text-slate-900 font-bold">{selected.totalPrice?.toLocaleString()} so'm</p>
                </div>
              </div>
              {selected.notes && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-600 text-xs mb-1">Izoh:</p>
                  <p className="text-slate-800">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
