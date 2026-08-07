import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import CheckInModal from '../../components/admin/CheckInModal';
import ManageBookingModal from '../../components/admin/ManageBookingModal';
import RoomBedMenuModal from '../../components/admin/RoomBedMenuModal';
import ConfirmModal from '../../components/ConfirmModal';
import ActiveIssuesBar from '../../components/admin/ActiveIssuesBar';
import { Key, User, CheckCircle2, Sparkles, Wrench, Clock, PlusCircle, ScanFace } from 'lucide-react';

const statusConfig = {
  available: { label: "Bo'sh", border: 'border-green-500/50', bg: 'bg-green-500/10', dot: 'bg-green-500', icon: CheckCircle2 },
  occupied: { label: "Band", border: 'border-blue-500/50', bg: 'bg-blue-500/10', dot: 'bg-blue-400', icon: User },
  overstay: { label: "Vaqti o'tgan", border: 'border-red-500/80', bg: 'bg-red-500/20', dot: 'bg-red-500 animate-pulse', icon: Clock },
  reserved: { label: "Bron qilingan", border: 'border-orange-500/50', bg: 'bg-orange-500/10', dot: 'bg-orange-500', icon: Clock },
  cleaning: { label: "Tozalanmoqda", border: 'border-yellow-600/50', bg: 'bg-yellow-600/10', dot: 'bg-yellow-600', icon: Sparkles },
  maintenance: { label: "Ta'mirlashda", border: 'border-slate-500/50', bg: 'bg-slate-500/10', dot: 'bg-slate-400', icon: Wrench },
};

export default function FrontDeskPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState(null);

  const [checkInRoom, setCheckInRoom] = useState(null);
  const [manageBookingId, setManageBookingId] = useState(null);
  const [hostelMenuRoom, setHostelMenuRoom] = useState(null);
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
    } catch { }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchActiveShift();

    // Check if there are any registered cleaners
    api.get('/attendance/cleaners-faces').then(res => {
      setHasCleaners(res.data.data && res.data.data.length > 0);
    }).catch(() => {});

    const s = io();
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
    const basePath = user?.role === 'owner' ? '/director' : `/${user?.role || 'admin'}`;
    navigate(`${basePath}/shifts`);
  };

  const handleRoomClick = async (room) => {
    if (!activeShift) {
      toast.error('Avval smenani boshlang!');
      return;
    }

    const roomActiveBookings = activeBookings.filter(b => b.roomId === room.id);

    if (room.status === 'reserved') {
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
      return;
    }

    if (room.status === 'cleaning' || room.status === 'maintenance') {
      setConfirmDialog({
        isOpen: true,
        title: "Xona holatini o'zgartirish",
        message: `Xona hozir "${room.status === 'cleaning' ? 'Tozalanmoqda' : 'Ta\'mirda'}" holatida. Uni "Bo'sh" (tayyor) deb belgilaysizmi?`,
        action: async () => {
          try {
            const targetStatus = (roomActiveBookings.length >= room.capacity) ? 'occupied' : 'available';
            await api.put(`/rooms/${room.id}/status`, { status: targetStatus });
            toast.success("Xona tayyor!");
            fetchRooms();
          } catch (error) {
            if (error.response?.data?.message === 'SMART_CONTROL_ERROR') {
              toast.error("Ruxsat etilmaydi! Filialingizda farrosh mavjud. Xonani farrosh o'z boti orqali toza qilib belgilashi shart!");
            } else {
              toast.error("Xatolik yuz berdi");
            }
          } finally {
            setConfirmDialog({ isOpen: false });
          }
        }
      });
      return;
    }

    if (roomActiveBookings.length === 0) {
      if (room.status === 'available') {
        setCheckInRoom(room);
      }
    } else if (roomActiveBookings.length === 1 && room.status === 'occupied') {
      setManageBookingId(roomActiveBookings[0].id);
    } else {
      setHostelMenuRoom(room);
    }
  };

  return (
    <div className="space-y-6">
      <ActiveIssuesBar />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Key className="text-primary-400" /> Qabulxona
            </h1>
          </div>
          <p className="text-slate-600 text-sm">Mehmonlarni kutib olish va xonalarni boshqarish</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-300">
          {activeShift ? (
            <>
              <div className="px-4 py-2">
                <p className="text-xs text-slate-600">Smena daromadi</p>
                <p className="font-bold text-emerald-400">{activeShift.totalIncome.toLocaleString()} so'm</p>
              </div>
            </>
          ) : user?.role !== 'director' ? (
            <button
              onClick={startShift}
              className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm shadow-primary-500/20"
            >
              Smenalar sahifasiga o'tish
            </button>
          ) : (
            <div className="px-4 py-2 text-slate-500 font-medium">Hozircha faol smena yo'q</div>
          )}
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="py-10 text-center text-slate-600">Xonalar yuklanmoqda...</div>
      ) : (
        <div className="space-y-8">
          {(() => {
            const roomsByFloor = rooms.reduce((acc, room) => {
              const f = room.floor || 'Boshqa';
              if (!acc[f]) acc[f] = [];
              acc[f].push(room);
              return acc;
            }, {});

            const sortedFloors = Object.keys(roomsByFloor).sort((a, b) => {
              if (a === 'Boshqa') return 1;
              if (b === 'Boshqa') return -1;
              return Number(a) - Number(b);
            });

            return sortedFloors.map(floor => (
              <div key={floor}>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                    {floor === 'Boshqa' ? '*' : floor}
                  </div>
                  {floor === 'Boshqa' ? 'Boshqa qavat' : `${floor}-qavat xonalari`}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {roomsByFloor[floor].map(room => {
                    let statusKey = room.status;
                    let blinkClass = '';

                    if (room.status === 'occupied') {
                      const b = activeBookings.find(bk => bk.roomId === room.id);
                      if (b && b.isOverstay) {
                        const expected = Number(b.totalPrice || 0);
                        const paid = Number(b.paidAmount || 0);
                        if (paid < expected) {
                          statusKey = 'overstay';
                          blinkClass = 'animate-pulse';
                        }
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

                    const roomActiveBookingsCount = activeBookings.filter(b => b.roomId === room.id).length;
                    const isPartiallyOccupied = room.status === 'available' && roomActiveBookingsCount > 0;

                    return (
                      <button
                        key={room.id}
                        onClick={() => handleRoomClick(room)}
                        className={`relative overflow-hidden group flex flex-col items-center justify-center p-6 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${status.border} ${status.bg} backdrop-blur-sm ${blinkClass}`}
                      >
                        <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${status.dot}`} />
                        <Icon size={40} className={`mb-3 ${statusKey === 'available' ? 'text-green-500' : statusKey === 'overstay' ? 'text-red-500' : statusKey === 'reserved' ? 'text-orange-400' : statusKey === 'occupied' ? 'text-blue-400' : statusKey === 'cleaning' ? 'text-yellow-600' : 'text-slate-600'}`} />
                        <span className="text-2xl font-black text-slate-900">{room.roomNumber}</span>
                        <span className="text-xs font-medium text-slate-600 mt-1 capitalize">
                          {isPartiallyOccupied ? `${roomActiveBookingsCount}/${room.capacity || 2} band` : room.roomType.replace('_', ' ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
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

      {hostelMenuRoom && (
        <RoomBedMenuModal
          room={hostelMenuRoom}
          activeBookings={activeBookings}
          onClose={() => setHostelMenuRoom(null)}
          onCheckIn={(r) => { setHostelMenuRoom(null); setCheckInRoom(r); }}
          onManage={(bookingId) => { setHostelMenuRoom(null); setManageBookingId(bookingId); }}
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
