import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import CheckInModal from '../../components/admin/CheckInModal';
import ManageBookingModal from '../../components/admin/ManageBookingModal';
import ConfirmModal from '../../components/ConfirmModal';
import { Key, User, CheckCircle2, Sparkles, Wrench, Clock, PlusCircle } from 'lucide-react';

const statusConfig = {
  available: { label: "Bo'sh", border: 'border-emerald-500/50', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400', icon: CheckCircle2 },
  occupied: { label: "Band", border: 'border-blue-500/50', bg: 'bg-blue-500/10', dot: 'bg-blue-400', icon: User },
  overstay: { label: "Vaqti o'tgan", border: 'border-red-500/80', bg: 'bg-red-500/20', dot: 'bg-red-500 animate-pulse', icon: Clock },
  reserved: { label: "Bron qilingan", border: 'border-orange-500/50', bg: 'bg-orange-500/10', dot: 'bg-orange-500', icon: Clock },
  cleaning: { label: "Tozalanmoqda", border: 'border-yellow-500/50', bg: 'bg-yellow-500/10', dot: 'bg-yellow-400', icon: Sparkles },
  maintenance: { label: "Ta'mirlashda", border: 'border-slate-500/50', bg: 'bg-slate-500/10', dot: 'bg-slate-400', icon: Wrench },
};

export default function FrontDeskPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState(null);
  
  const [checkInRoom, setCheckInRoom] = useState(null);
  const [manageBookingId, setManageBookingId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, message: '', title: '' });

  const [activeBookings, setActiveBookings] = useState([]);
  const [reservedBookings, setReservedBookings] = useState([]);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data.data);

      const bRes = await api.get('/bookings', { params: { status: 'active' } });
      const now = new Date();
      setActiveBookings(bRes.data.data.map(b => ({
        ...b,
        isOverstay: new Date(b.checkOutExpected) < now
      })));

      const rRes = await api.get('/bookings', { params: { status: 'reserved' } });
      setReservedBookings(rRes.data.data);
    } catch (err) {
      toast.error('Ma\'lumotlarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActiveShift = useCallback(async () => {
    try {
      const res = await api.get('/shifts/my/active');
      setActiveShift(res.data.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchActiveShift();

    const s = io(import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:5000`);
    setSocket(s);
    if (user?.branchId) s.emit('join-branch', user.branchId);

    s.on('room-status-changed', ({ roomId, status }) => {
      setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, status } : r)));
    });

    s.on('booking-created', () => { fetchRooms(); fetchActiveShift(); });
    s.on('booking-checked-out', () => { fetchRooms(); fetchActiveShift(); });

    return () => s.disconnect();
  }, [user, fetchRooms, fetchActiveShift]);

  const startShift = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Smenani boshlash",
      message: "Smenani boshlashga tayyormisiz?",
      action: async () => {
        try {
          await api.post('/shifts/start');
          toast.success("Smena boshlandi!");
          fetchActiveShift();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Xato yuz berdi');
        } finally {
          setConfirmDialog({ isOpen: false });
        }
      }
    });
  };

  const endShift = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Smenani yopish",
      message: "Smenani yopasizmi? Bu qaytarib bo'lmaydigan amal.",
      action: async () => {
        try {
          await api.put(`/shifts/${activeShift.id}/close`, { notes: 'Smena tugadi' });
          toast.success("Smena yopildi!");
          setActiveShift(null);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Xato yuz berdi');
        } finally {
          setConfirmDialog({ isOpen: false });
        }
      }
    });
  };

  const handleRoomClick = async (room) => {
    if (!activeShift) {
      toast.error('Avval smenani boshlang!');
      return;
    }
    
    if (room.status === 'available') {
      setCheckInRoom(room);
    } else if (room.status === 'occupied') {
      const activeBooking = activeBookings.find(b => b.roomId === room.id);
      if (activeBooking) {
        setManageBookingId(activeBooking.id);
      } else {
        toast.error("Aktiv bron topilmadi");
      }
    } else if (room.status === 'cleaning' || room.status === 'maintenance') {
      setConfirmDialog({
        isOpen: true,
        title: "Holatni o'zgartirish",
        message: `Xona hozir "${statusConfig[room.status].label}" holatida. Bo'sh holatga o'tkazasizmi?`,
        action: async () => {
          try {
            await api.put(`/rooms/${room.id}`, { status: 'available' });
            toast.success("Xona tayyor!");
            fetchRooms();
          } catch {
            toast.error("Xatolik");
          } finally {
            setConfirmDialog({ isOpen: false });
          }
        }
      });
    } else if (room.status === 'reserved') {
      // It's a mapped status for reservations
      const rb = reservedBookings.find(bk => bk.roomId === room.id);
      if (rb) {
        setConfirmDialog({
          isOpen: true,
          title: "Bronni tasdiqlash",
          message: "Mehmon keldimi? Xonani band qilishni tasdiqlaysizmi?",
          action: async () => {
            try {
              await api.put(`/bookings/${rb.id}/confirm-reservation`);
              toast.success("Xonaga kiritildi!");
              fetchRooms();
              fetchActiveShift();
            } catch (err) {
              toast.error("Xatolik");
            } finally {
              setConfirmDialog({ isOpen: false });
            }
          }
        });
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key className="text-primary-400" /> Qabul (Shahmatka)
          </h1>
          <p className="text-slate-400 text-sm">Mehmonlarni kutib olish va xonalarni boshqarish</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-800/50 p-2 rounded-xl border border-slate-700/50">
          {activeShift ? (
            <>
              <div className="px-4 py-2">
                <p className="text-xs text-slate-400">Smena daromadi</p>
                <p className="font-bold text-emerald-400">{activeShift.totalIncome.toLocaleString()} so'm</p>
              </div>
              <button onClick={endShift} className="px-6 py-2 bg-red-500/20 text-red-400 font-bold rounded-lg hover:bg-red-500/30 transition-colors">
                Smenani yopish
              </button>
            </>
          ) : (
            <button onClick={startShift} className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2">
              <Clock size={20} /> Smenani boshlash
            </button>
          )}
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="py-10 text-center text-slate-400">Xonalar yuklanmoqda...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {rooms.map(room => {
            let statusKey = room.status;
            let blinkClass = '';
            
            if (room.status === 'occupied') {
              const b = activeBookings.find(bk => bk.roomId === room.id);
              if (b && b.isOverstay) {
                statusKey = 'overstay';
                blinkClass = 'animate-pulse';
              }
            } else if (room.status === 'available') {
              // Check if there is a reservation for today
              const today = new Date().toDateString();
              const rb = reservedBookings.find(bk => bk.roomId === room.id && new Date(bk.checkIn).toDateString() === today);
              if (rb) {
                statusKey = 'reserved';
                room.status = 'reserved'; // fake status for handleRoomClick
                blinkClass = 'animate-pulse';
              }
            }

            const status = statusConfig[statusKey];
            const Icon = status.icon;
            
            return (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room)}
                className={`relative overflow-hidden group flex flex-col items-center justify-center p-6 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${status.border} ${status.bg} backdrop-blur-sm ${blinkClass}`}
              >
                <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${status.dot}`} />
                <Icon size={40} className={`mb-3 ${statusKey === 'available' ? 'text-emerald-400' : statusKey === 'overstay' ? 'text-red-500' : statusKey === 'reserved' ? 'text-orange-400' : statusKey === 'occupied' ? 'text-blue-400' : statusKey === 'cleaning' ? 'text-yellow-400' : 'text-slate-400'}`} />
                <span className="text-2xl font-black text-white">{room.roomNumber}</span>
                <span className="text-xs font-medium text-slate-400 mt-1 capitalize">{room.roomType.replace('_', ' ')}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {checkInRoom && (
        <CheckInModal
          room={checkInRoom}
          shift={activeShift}
          onClose={() => setCheckInRoom(null)}
          onSuccess={() => { setCheckInRoom(null); fetchRooms(); fetchActiveShift(); }}
        />
      )}

      {manageBookingId && (
        <ManageBookingModal
          bookingId={manageBookingId}
          onClose={() => setManageBookingId(null)}
          onSuccess={() => { setManageBookingId(null); fetchRooms(); fetchActiveShift(); }}
        />
      )}

      {confirmDialog.isOpen && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.action}
          onCancel={() => setConfirmDialog({ isOpen: false })}
        />
      )}
    </div>
  );
}
