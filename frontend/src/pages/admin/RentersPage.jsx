import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { io } from 'socket.io-client';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { CalendarDays, AlertTriangle, Clock, CheckCircle, User, Search, Loader2, Sparkles } from 'lucide-react';
import ManageBookingModal from '../../components/admin/ManageBookingModal';

export default function RentersPage() {
  const { user } = useAuth();
  const [renters, setRenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manageBookingId, setManageBookingId] = useState(null);
  const [filterTab, setFilterTab] = useState('all'); // all, overdue, approaching, active
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCleaningRoomIds, setActiveCleaningRoomIds] = useState(new Set());
  const [cleaningLoadingRoomId, setCleaningLoadingRoomId] = useState(null);

  useEffect(() => {
    fetchRenters();
    fetchActiveCleaningRooms();

    const s = io();
    if (user?.branchId) s.emit('join-branch', user.branchId);

    s.on('cleaning-task-created', ({ roomId }) => {
      if (roomId) {
        setActiveCleaningRoomIds(prev => new Set([...prev, roomId]));
      }
    });

    s.on('cleaning-task-completed', ({ roomId }) => {
      if (roomId) {
        setActiveCleaningRoomIds(prev => {
          const next = new Set(prev);
          next.delete(roomId);
          return next;
        });
      }
    });

    s.on('cleaning-task-cancelled', ({ roomId }) => {
      if (roomId) {
        setActiveCleaningRoomIds(prev => {
          const next = new Set(prev);
          next.delete(roomId);
          return next;
        });
      }
    });

    return () => s.disconnect();
  }, [user]);

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

  const fetchActiveCleaningRooms = async () => {
    try {
      const res = await api.get('/cleaning-tasks/active-rooms');
      if (res.data.success && Array.isArray(res.data.activeRoomIds)) {
        setActiveCleaningRoomIds(new Set(res.data.activeRoomIds));
      }
    } catch { }
  };

  const handleRequestCleaning = async (roomId, roomNumber) => {
    if (!roomId) return;
    setCleaningLoadingRoomId(roomId);
    try {
      const res = await api.post('/cleaning-tasks/request', { roomId });
      toast.success(res.data?.message || `${roomNumber}-xona tozalash navbatiga qo'shildi`);
      setActiveCleaningRoomIds(prev => new Set([...prev, roomId]));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tozalashga yuborishda xatolik');
    } finally {
      setCleaningLoadingRoomId(null);
    }
  };

  const handleManage = (id) => {
    setManageBookingId(id);
  };

  // Process and decorate renters with status & days remaining
  const processedRenters = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return renters.map(r => {
      const expectedAmount = Number(r.totalPrice || r.monthlyFee || (r.room?.pricePerNight * 30 || 0));
      const paid = Number(r.paidAmount || 0);
      const debt = Math.max(0, expectedAmount - paid);

      const dueDate = r.checkOutExpected ? new Date(r.checkOutExpected) : null;
      let daysRemaining = null;
      if (dueDate) {
        const d = new Date(dueDate);
        d.setHours(0, 0, 0, 0);
        daysRemaining = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      const isOverdue = r.isOverstay || (daysRemaining !== null && daysRemaining < 0) || debt > 0;
      const isApproaching = !isOverdue && daysRemaining !== null && daysRemaining <= 3;
      const isActive = !isOverdue && !isApproaching;

      return {
        ...r,
        expectedAmount,
        paid,
        debt,
        daysRemaining,
        isOverdue,
        isApproaching,
        isActive
      };
    });
  }, [renters]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: processedRenters.length,
      overdue: processedRenters.filter(r => r.isOverdue).length,
      approaching: processedRenters.filter(r => r.isApproaching).length,
      active: processedRenters.filter(r => r.isActive).length
    };
  }, [processedRenters]);

  // Filter and sort by room number
  const filteredRenters = useMemo(() => {
    return processedRenters
      .filter(r => {
        if (filterTab === 'overdue') return r.isOverdue;
        if (filterTab === 'approaching') return r.isApproaching;
        if (filterTab === 'active') return r.isActive;
        return true;
      })
      .filter(r => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const roomNum = r.room?.roomNumber?.toLowerCase() || '';
        const guestName = `${r.primaryGuest?.firstName || ''} ${r.primaryGuest?.lastName || ''}`.toLowerCase();
        const phone = r.primaryGuest?.phone?.toLowerCase() || '';
        return roomNum.includes(q) || guestName.includes(q) || phone.includes(q);
      })
      .sort((a, b) => {
        const roomA = a.room?.roomNumber || '';
        const roomB = b.room?.roomNumber || '';
        return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [processedRenters, filterTab, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-400">
            <CalendarDays size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Oylik Ijarachilar</h1>
            <p className="text-slate-600">Uzoq muddatli yashovchi mijozlar va to'lov muddatlari nazorati</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Xona yoki ism bo'yicha..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Barchasi ({counts.all})
        </button>
        <button
          onClick={() => setFilterTab('overdue')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filterTab === 'overdue'
              ? 'bg-red-600 text-white shadow-sm shadow-red-200'
              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
          }`}
        >
          <AlertTriangle size={13} />
          Muddati o'tgan / Qarzdor ({counts.overdue})
        </button>
        <button
          onClick={() => setFilterTab('approaching')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filterTab === 'approaching'
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <Clock size={13} />
          Yaqinlashmoqda (1–3 kun) ({counts.approaching})
        </button>
        <button
          onClick={() => setFilterTab('active')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filterTab === 'active'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <CheckCircle size={13} />
          To'langan / Vaqti bor ({counts.active})
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-600"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>
        ) : filteredRenters.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center">
            <User size={48} className="text-slate-400 mb-3" />
            <p className="text-slate-600 font-medium">Ushbu filtr bo'yicha ijarachilar topilmadi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="table-th w-12 text-center">№</th>
                  <th className="table-th">Xona / Mijoz</th>
                  <th className="table-th">Keyingi to'lov kuni</th>
                  <th className="table-th text-right">Oylik ijara narxi</th>
                  <th className="table-th text-right">Qarz</th>
                  <th className="table-th text-center">Holat</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRenters.map((r, index) => {
                  let rowClass = "border-b transition-colors duration-150";
                  if (r.isOverdue) {
                    rowClass += " bg-red-400/20 hover:bg-red-400/30 border-red-300 text-slate-900";
                  } else if (r.isApproaching) {
                    rowClass += " bg-amber-400/20 hover:bg-amber-400/30 border-amber-300 text-slate-900";
                  } else {
                    rowClass += " border-slate-200 hover:bg-slate-50 text-slate-900";
                  }

                  let roomBadgeClass = "w-10 h-10 rounded-lg flex items-center justify-center font-bold border ";
                  if (r.isOverdue) {
                    roomBadgeClass += "bg-red-100 text-red-900 border-red-300";
                  } else if (r.isApproaching) {
                    roomBadgeClass += "bg-amber-100 text-amber-900 border-amber-300";
                  } else {
                    roomBadgeClass += "bg-slate-100 text-slate-900 border-slate-300";
                  }

                  return (
                    <tr key={r.id} className={rowClass}>
                      {/* Sequence Order Number */}
                      <td className="table-td text-center font-bold text-slate-400 text-xs">
                        {index + 1}
                      </td>

                      {/* Room & Guest */}
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className={roomBadgeClass}>
                            {r.room?.roomNumber}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{r.primaryGuest?.firstName} {r.primaryGuest?.lastName}</p>
                            <p className="text-xs text-slate-600">{r.primaryGuest?.phone || '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Due Date & Remaining days */}
                      <td className="table-td">
                        <div className="flex flex-col">
                          <span className={`text-sm font-semibold ${
                            r.isOverdue ? 'text-red-600' : r.isApproaching ? 'text-amber-800' : 'text-slate-800'
                          }`}>
                            {r.checkOutExpected ? format(new Date(r.checkOutExpected), 'dd.MM.yyyy') : '—'}
                          </span>
                          {r.daysRemaining !== null && (
                            <span className={`text-xs font-medium ${
                              r.daysRemaining < 0 
                                ? 'text-red-600 font-bold' 
                                : r.daysRemaining === 0 
                                ? 'text-amber-700 font-bold' 
                                : r.daysRemaining <= 3 
                                ? 'text-amber-700 font-semibold' 
                                : 'text-slate-500'
                            }`}>
                              {r.daysRemaining < 0 
                                ? `${Math.abs(r.daysRemaining)} kun kechikkan` 
                                : r.daysRemaining === 0 
                                ? 'Bugun to\'lov kuni!' 
                                : r.daysRemaining === 1 
                                ? 'Ertaga (1 kun qoldi)' 
                                : `${r.daysRemaining} kun qoldi`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Monthly Fee */}
                      <td className="table-td text-right font-medium text-slate-800">
                        {r.monthlyFee ? r.monthlyFee.toLocaleString() : (r.room?.pricePerNight * 30 || 0).toLocaleString()} <span className="text-xs text-slate-500">so'm</span>
                      </td>

                      {/* Debt */}
                      <td className="table-td text-right font-bold">
                        {r.debt > 0 ? (
                          <span className="text-red-600">+{r.debt.toLocaleString()} so'm</span>
                        ) : (
                          <span className="text-slate-400 font-normal">0 so'm</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="table-td text-center">
                        {r.debt > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-600 border border-red-500/30">
                            <AlertTriangle size={12} /> Qarzdor
                          </span>
                        ) : r.daysRemaining !== null && r.daysRemaining < 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-600 border border-red-500/30">
                            <AlertTriangle size={12} /> Muddati o'tgan
                          </span>
                        ) : r.isApproaching ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-800 border border-amber-500/30">
                            <Clock size={12} /> Yaqinlashmoqda
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                            Aktiv
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Tozalash tugmasi (Direktor va Owner uchun) */}
                          {['director', 'owner'].includes(user?.role) && (
                            activeCleaningRoomIds.has(r.roomId) ? (
                              <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                <Sparkles size={13} className="text-amber-500 animate-pulse" />
                                Tozalanmoqda
                              </span>
                            ) : (
                              <button 
                                onClick={() => handleRequestCleaning(r.roomId, r.room?.roomNumber)}
                                disabled={cleaningLoadingRoomId === r.roomId}
                                className="btn-secondary py-1.5 px-3 text-xs text-primary-700 hover:text-primary-800 hover:bg-primary-50 font-bold flex items-center gap-1.5 border-primary-200 transition-all active:scale-95 cursor-pointer"
                                title={`${r.room?.roomNumber}-xonani tozalashga yuborish`}
                              >
                                {cleaningLoadingRoomId === r.roomId ? (
                                  <Loader2 size={13} className="animate-spin text-primary-600" />
                                ) : (
                                  <Sparkles size={13} className="text-primary-500" />
                                )}
                                Tozalashga berish
                              </button>
                            )
                          )}

                          <button 
                            onClick={() => handleManage(r.id)}
                            className="btn-secondary py-1.5 px-3 text-xs font-semibold"
                          >
                            Boshqarish
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
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
