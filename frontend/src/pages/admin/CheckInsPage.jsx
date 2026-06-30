import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, User, Clock, Calendar, DoorOpen, Plus, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import ExtendStayModal from '../../components/admin/ExtendStayModal';
import toast from 'react-hot-toast';

export default function CheckInsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchActiveBookings = async () => {
    try {
      const { data } = await api.get('/bookings', { params: { status: 'active' } });
      setBookings(data.data);
    } catch (error) {
      toast.error('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveBookings();

    const io = window.io;
    if (io) {
      io.on('booking-created', fetchActiveBookings);
      io.on('booking-checked-out', fetchActiveBookings);
      io.on('booking-extended', fetchActiveBookings);
    }

    return () => {
      if (io) {
        io.off('booking-created', fetchActiveBookings);
        io.off('booking-checked-out', fetchActiveBookings);
        io.off('booking-extended', fetchActiveBookings);
      }
    };
  }, []);

  const filteredBookings = bookings.filter(booking => {
    const guestName = `${booking.primaryGuest?.firstName} ${booking.primaryGuest?.lastName}`.toLowerCase();
    const roomNumber = booking.room?.roomNumber?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return guestName.includes(query) || roomNumber.includes(query);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
        <p className="text-slate-400 font-medium">Faol mehmonlar yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="text-primary-400" />
            Hozirgi mehmonlar
          </h1>
          <p className="text-slate-400 text-sm mt-1">Mehmonxonada yashayotganlar ro'yxati</p>
        </div>

        <div className="w-full sm:w-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Ism yoki xona qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full sm:w-64"
          />
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="card py-16 text-center">
          <DoorOpen className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 text-lg">Faol mehmonlar topilmadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="card p-5 border border-slate-800 hover:border-slate-700 transition-colors relative group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg">
                    {booking.primaryGuest?.firstName} {booking.primaryGuest?.lastName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-primary-500/20 text-primary-400">
                      Xona {booking.room?.roomNumber}
                    </span>
                    {booking.additionalGuests?.length > 0 && (
                      <span className="text-xs text-slate-500 font-medium">
                        +{booking.additionalGuests.length} kishi
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-slate-800/50 p-2 rounded-lg text-slate-400">
                  <User size={20} />
                </div>
              </div>

              <div className="space-y-3 mb-5 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5"><Calendar size={14} /> Kelgan:</span>
                  <span className="font-medium text-white">{format(new Date(booking.checkIn), 'dd.MM.yyyy HH:mm')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5"><Clock size={14} /> Ketishi:</span>
                  <span className="font-medium text-white">{format(new Date(booking.checkOutExpected), 'dd.MM.yyyy HH:mm')}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800/50 flex items-center justify-between">
                  <span className="text-slate-500">Umumiy qarz:</span>
                  <span className="font-bold text-red-400">
                    {(booking.totalPrice - booking.paidAmount).toLocaleString()} so'm
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedBooking(booking)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
              >
                <Plus size={16} />
                Muddatni uzaytirish
              </button>
            </div>
          ))}
        </div>
      )}

      <ExtendStayModal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        onSuccess={fetchActiveBookings}
      />
    </div>
  );
}
