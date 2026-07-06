import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import CheckInModal from '../../components/admin/CheckInModal';
import CheckOutModal from '../../components/admin/CheckOutModal';
import { BedDouble, CheckCircle2, Clock, PlayCircle, Sparkles, User, Wrench } from 'lucide-react';
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error.toString() };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[100] bg-red-900/90 flex flex-col items-center justify-center p-8 text-white">
          <h2 className="text-3xl font-bold mb-4">Modal xatosi (Crash)</h2>
          <pre className="bg-black/50 p-6 rounded-xl w-full max-w-2xl overflow-auto text-sm">{this.state.errorMsg}</pre>
          <button onClick={this.props.onClose} className="mt-6 px-6 py-2 bg-white text-red-900 font-bold rounded-lg hover:bg-slate-200">Yopish</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const statusConfig = {
  available: { label: 'Bo\'sh', color: 'room-card-available', dot: 'bg-emerald-400', icon: CheckCircle2 },
  occupied: { label: 'Band', color: 'room-card-occupied', dot: 'bg-red-400 animate-pulse', icon: User },
  cleaning: { label: 'Tozalanmoqda', color: 'room-card-cleaning', dot: 'bg-yellow-400', icon: Sparkles },
  maintenance: { label: 'Ta\'mirlashda', color: 'room-card-maintenance', dot: 'bg-slate-400', icon: Wrench },
};



export default function AdminRoomsPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [checkInRoom, setCheckInRoom] = useState(null);
  const [checkOutBooking, setCheckOutBooking] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [socket, setSocket] = useState(null);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data.data);
    } catch {
      toast.error('Xonalarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActiveShift = useCallback(async () => {
    if (user?.role === 'owner') return; // Owners don't need active shifts to view rooms
    try {
      const res = await api.get('/shifts/my/active');
      setActiveShift(res.data.data);
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchRooms();
    fetchActiveShift();

    // Socket ulash
    const s = io(import.meta.env.VITE_SOCKET_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin));
    setSocket(s);
    if (user?.branchId) s.emit('join-branch', user.branchId);

    s.on('room-status-changed', ({ roomId, status }) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, status } : r))
      );
    });

    s.on('booking-created', ({ roomId }) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, status: 'occupied' } : r))
      );
      fetchRooms();
    });

    s.on('booking-checked-out', ({ roomId }) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, status: 'cleaning' } : r))
      );
    });

    return () => s.disconnect();
  }, [user, fetchRooms, fetchActiveShift]);

  const handleRoomClick = (room) => {
    if (user?.role === 'owner') return; // Owner just views, doesn't interact

    if (room.status === 'maintenance') return;
    if (room.status === 'available') {
      if (!activeShift) {
        toast.error('Avval smena boshlang!');
        return;
      }
      setCheckInRoom(room);
    } else if (room.status === 'occupied') {
      const booking = room.bookings?.[0];
      if (booking) setCheckOutBooking(booking);
    } else if (room.status === 'cleaning') {
      handleRoomStatusChange(room.id, 'available');
    }
  };

  const handleRoomStatusChange = async (roomId, status) => {
    try {
      await api.put(`/rooms/${roomId}/status`, { status });
      toast.success('Xona holati yangilandi');
    } catch {
      toast.error('Xona holatini o\'zgartirishda xato');
    }
  };

  const handleStartShift = async () => {
    try {
      const res = await api.post('/shifts/start');
      setActiveShift(res.data.data);
      toast.success('Smena boshlandi! 🎉');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const filteredRooms = rooms.filter((r) => filter === 'all' || r.status === filter);

  const counts = {
    total: rooms.length,
    available: rooms.filter((r) => r.status === 'available').length,
    occupied: rooms.filter((r) => r.status === 'occupied').length,
    cleaning: rooms.filter((r) => r.status === 'cleaning').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-400">Xonalar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BedDouble className="text-primary-400" /> Xonalar holati
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Real vaqtda yangilanib turadi</p>
        </div>
        
        {user?.role !== 'owner' && (
          !activeShift ? (
            <button id="start-shift-btn" onClick={handleStartShift} className="btn-primary">
              <PlayCircle size={18} /> Smenani boshlash
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Smena faol • {activeShift.shiftType === 'morning' ? 'Kunduzgi' : 'Tungi'}
            </div>
          )
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Jami xonalar', count: counts.total, icon: BedDouble, color: 'text-slate-300' },
          { label: 'Bo\'sh', count: counts.available, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Band', count: counts.occupied, icon: User, color: 'text-red-400' },
          { label: 'Tozalanmoqda', count: counts.cleaning, icon: Sparkles, color: 'text-yellow-400' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card flex items-center justify-between p-5">
              <div>
                <p className="text-[13px] font-medium text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
                <div className={`text-3xl font-bold ${s.color}`}>{s.count}</div>
              </div>
              <div className={`w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center ${s.color}`}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap bg-slate-900/40 p-2 rounded-2xl border border-slate-800 w-fit">
        {[
          { key: 'all', label: `Hammasi (${counts.total})` },
          { key: 'available', label: `Bo'sh (${counts.available})` },
          { key: 'occupied', label: `Band (${counts.occupied})` },
          { key: 'cleaning', label: `Tozalanmoqda (${counts.cleaning})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
              filter === f.key
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredRooms.map((room) => {
          const cfg = statusConfig[room.status] || statusConfig.available;
          const booking = room.bookings?.[0];
          const StatusIcon = cfg.icon;
          return (
            <div
              key={room.id}
              id={`room-${room.id}`}
              className={cfg.color}
              onClick={() => handleRoomClick(room)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-2xl font-bold text-white tracking-tight">{room.roomNumber}</span>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{room.roomType.replace(/_/g, ' ')}</p>
                </div>
                <div className={`p-2 rounded-full bg-slate-900/50 ${cfg.color.replace('room-card-', 'text-').replace('-available', '-emerald-400').replace('-occupied', '-red-400').replace('-cleaning', '-yellow-400').replace('-maintenance', '-slate-400')}`}>
                  <StatusIcon size={16} />
                </div>
              </div>
              
              <div className="text-sm font-semibold text-slate-200 mb-3 bg-slate-900/40 inline-block px-2 py-1 rounded-md">
                {room.pricePerNight?.toLocaleString('uz-UZ')} so'm
              </div>
              
              <div className="flex items-center gap-2 text-sm font-medium">
                {room.status === 'available' && <span className="text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14}/> Bo'sh</span>}
                {room.status === 'occupied' && booking && (
                  <span className="text-red-400 flex items-center gap-1.5 truncate">
                    <User size={14} className="flex-shrink-0"/> <span className="truncate">{booking.primaryGuest?.firstName}</span>
                  </span>
                )}
                {room.status === 'cleaning' && <span className="text-yellow-400 flex items-center gap-1.5"><Sparkles size={14}/> Tozalanmoqda</span>}
                {room.status === 'maintenance' && <span className="text-slate-400 flex items-center gap-1.5"><Wrench size={14}/> Ta'mirlash</span>}
              </div>
              
              {user?.role === 'owner' && (
                <div className="mt-3 pt-3 border-t border-slate-700/30">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    {room.branch?.name?.split('-')[0] || 'Filial'}
                  </span>
                </div>
              )}

              {user?.role !== 'owner' && room.status === 'cleaning' && (
                <div className="mt-3 pt-2 text-[11px] font-medium text-yellow-500/80 text-center border-t border-yellow-500/20">
                  Bo'sh qilish uchun bosing
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredRooms.length === 0 && (
        <div className="card py-16 text-center border-slate-800">
          <BedDouble size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 font-medium">Bu holatda xona yo'q</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800 w-fit">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Ma'lumot:</p>
        {Object.entries(statusConfig).map(([key, val]) => {
          const Icon = val.icon;
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Icon size={14} className={val.dot.split(' ')[0].replace('bg-', 'text-')} />
              {val.label}
            </div>
          )
        })}
        {user?.role !== 'owner' && (
          <div className="text-xs font-medium text-slate-500 border-l border-slate-700 pl-4 ml-2">
            Bo'sh xonaga bosing → check-in | Band xonaga bosing → check-out
          </div>
        )}
      </div>

      {/* Modals */}
      {checkInRoom && (
        <ErrorBoundary onClose={() => setCheckInRoom(null)}>
          <CheckInModal
            room={checkInRoom}
            shift={activeShift}
            onClose={() => setCheckInRoom(null)}
            onSuccess={() => { fetchRooms(); setCheckInRoom(null); }}
          />
        </ErrorBoundary>
      )}
      {checkOutBooking && (
        <CheckOutModal
          booking={checkOutBooking}
          onClose={() => setCheckOutBooking(null)}
          onSuccess={() => { fetchRooms(); setCheckOutBooking(null); }}
        />
      )}
    </div>
  );
}
