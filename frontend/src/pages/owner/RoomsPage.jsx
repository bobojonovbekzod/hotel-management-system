import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  BedDouble, Building2, Search, Filter, RefreshCw, 
  User, CheckCircle2, AlertCircle, Sparkles, Clock, Layers
} from 'lucide-react';
import { io } from 'socket.io-client';

export default function RoomsPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filterBranch, setFilterBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'available', 'partial', 'occupied', 'cleaning'

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data?.data) {
        setBranches(res.data.data);
      }
    } catch (error) {
      toast.error('Filiallarni yuklashda xatolik');
    }
  };

  useEffect(() => {
    if (filterBranch) {
      fetchRooms();
    } else {
      setRooms([]);
    }
  }, [filterBranch]);

  // Real-time Socket.io listener for instant updates
  useEffect(() => {
    if (!filterBranch) return;
    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    
    socket.on('room_updated', () => fetchRooms());
    socket.on('booking_created', () => fetchRooms());
    socket.on('check_in', () => fetchRooms());
    socket.on('check_out', () => fetchRooms());

    return () => socket.disconnect();
  }, [filterBranch]);

  const fetchRooms = async () => {
    if (!filterBranch) return;
    setLoading(true);
    try {
      const res = await api.get('/rooms', { params: { branchId: filterBranch } });
      if (res.data?.success) {
        setRooms(res.data.data || []);
      }
    } catch (error) {
      toast.error('Xonalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // Filter rooms
  const filteredRooms = rooms.filter(room => {
    const matchSearch = room.roomNumber.toString().includes(searchQuery.trim());
    
    const total = room.totalBeds || room.capacity || 1;
    const occupied = room.occupiedBeds || 0;
    const computedStatus = room.computedStatus || room.status;

    let matchStatus = true;
    if (statusFilter === 'available') {
      matchStatus = computedStatus === 'available' || room.status === 'available';
    } else if (statusFilter === 'partial') {
      matchStatus = computedStatus === 'partial';
    } else if (statusFilter === 'occupied') {
      matchStatus = computedStatus === 'occupied' || room.status === 'occupied';
    } else if (statusFilter === 'cleaning') {
      matchStatus = room.status === 'cleaning';
    }

    return matchSearch && matchStatus;
  });

  // Calculate statistics
  const totalRoomsCount = rooms.length;
  let availableRoomsCount = 0;
  let occupiedRoomsCount = 0;
  let cleaningRoomsCount = 0;

  rooms.forEach(r => {
    const st = r.computedStatus || r.status;
    if (st === 'available') availableRoomsCount++;
    else if (st === 'occupied' || st === 'partial') occupiedRoomsCount++;
    if (r.status === 'cleaning') cleaningRoomsCount++;
  });

  const selectedBranchObj = branches.find(b => b.id.toString() === filterBranch.toString());

  // Create Room Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    branchId: '',
    roomNumber: '',
    roomType: 'Standard',
    floor: '1',
    capacity: '2',
    pricePerNight: '300000',
    description: ''
  });
  const [submittingRoom, setSubmittingRoom] = useState(false);

  const openAddModal = () => {
    setNewRoomForm({
      branchId: filterBranch || (branches[0]?.id?.toString() || ''),
      roomNumber: '',
      roomType: 'Standard',
      floor: '1',
      capacity: '2',
      pricePerNight: '300000',
      description: ''
    });
    setShowAddModal(true);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomForm.branchId || !newRoomForm.roomNumber || !newRoomForm.pricePerNight) {
      return toast.error("Barcha majburiy maydonlarni to'ldiring");
    }

    setSubmittingRoom(true);
    try {
      const res = await api.post('/rooms', {
        branchId: parseInt(newRoomForm.branchId),
        roomNumber: newRoomForm.roomNumber.trim(),
        roomType: newRoomForm.roomType,
        floor: parseInt(newRoomForm.floor) || 1,
        capacity: parseInt(newRoomForm.capacity) || 1,
        pricePerNight: parseFloat(newRoomForm.pricePerNight) || 0,
        description: newRoomForm.description || ''
      });

      if (res.data?.success) {
        toast.success(`Xona #${newRoomForm.roomNumber} muvaffaqiyatli qo'shildi! 🎉`);
        setShowAddModal(false);
        if (filterBranch === newRoomForm.branchId.toString()) {
          fetchRooms();
        } else {
          setFilterBranch(newRoomForm.branchId.toString());
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Xona qo'shishda xatolik");
    } finally {
      setSubmittingRoom(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BedDouble className="text-primary-500" /> Real-Vaqtdagi Xonalar Dashboardi
          </h1>
          <p className="text-slate-600 text-sm mt-1">Filiallardagi xonalarning hozirgi bandlik va tozalik holati</p>
        </div>

        {/* Branch Selector & Add Room Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <select
            className="input-field text-sm font-bold bg-white shadow-xs border-primary-300 min-w-[200px]"
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
          >
            <option value="" disabled>🏢 Filialni tanlang...</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {user?.role === 'owner' && (
            <button
              onClick={openAddModal}
              className="btn-primary flex items-center gap-2 whitespace-nowrap py-2.5 px-4 font-bold shadow-md cursor-pointer"
            >
              <span>+ Yangi xona</span>
            </button>
          )}
        </div>
      </div>

      {/* When NO Branch is Selected */}
      {!filterBranch ? (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-3">
          <Building2 className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-base font-extrabold text-slate-800">
            🏢 Xonalarning real-vaqtdagi holatini ko'rish uchun avval filialni tanlang
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Yuqoridagi o'ng burchakdagi menyudan filialni tanlasangiz, ushbu filialdagi barcha xonalarning real-vaqtdagi bandlik holati chiqadi.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <BedDouble className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Jami Xonalar</p>
                <h3 className="text-lg font-black text-slate-900 font-mono">{totalRoomsCount} ta</h3>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-emerald-700 font-medium">Bo'sh Xonalar</p>
                <h3 className="text-lg font-black text-emerald-700 font-mono">{availableRoomsCount} ta</h3>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-rose-700 font-medium">Band Xonalar</p>
                <h3 className="text-lg font-black text-rose-700 font-mono">{occupiedRoomsCount} ta</h3>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-amber-700 font-medium">Tozalanmoqda</p>
                <h3 className="text-lg font-black text-amber-700 font-mono">{cleaningRoomsCount} ta</h3>
              </div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Xona raqami bo'yicha..."
                className="input-field pl-9 text-xs"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {[
                { id: 'all', label: 'Barchasi' },
                { id: 'available', label: '🟢 Bo\'sh' },
                { id: 'partial', label: '🟡 Qisman band' },
                { id: 'occupied', label: '🔴 To\'liq band' },
                { id: 'cleaning', label: '🧹 Tozalanmoqda' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rooms Cards Grid */}
          {loading ? (
            <div className="py-20 text-center text-slate-500 space-y-3 flex flex-col items-center">
              <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-600 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-700">Filial xonalari yuklanmoqda...</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
              <BedDouble className="w-10 h-10 mx-auto text-slate-300" />
              <h3 className="text-base font-extrabold text-slate-700">Hech narsa topilmadi</h3>
              <p className="text-xs text-slate-400">Tanlangan filtr yoki qidiruv bo'yicha xona mavjud emas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredRooms.map(room => {
                const total = room.totalBeds || room.capacity || 1;
                const occupied = room.occupiedBeds || 0;
                const free = room.availableBeds !== undefined ? room.availableBeds : Math.max(0, total - occupied);
                const status = room.computedStatus || room.status;

                const isAvailable = status === 'available';
                const isPartial = status === 'partial';
                const isCleaning = room.status === 'cleaning';

                return (
                  <div
                    key={room.id}
                    className={`bg-white rounded-3xl border p-5 shadow-xs transition-all space-y-4 relative overflow-hidden ${
                      isAvailable ? 'border-emerald-200' :
                      isPartial ? 'border-amber-200' :
                      isCleaning ? 'border-orange-200' :
                      'border-rose-200'
                    }`}
                  >
                    {/* Top Status Stripe */}
                    <div className={`h-1.5 absolute top-0 left-0 right-0 ${
                      isAvailable ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                      isPartial ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                      isCleaning ? 'bg-gradient-to-r from-orange-400 to-amber-500' :
                      'bg-gradient-to-r from-rose-500 to-pink-500'
                    }`} />

                    {/* Room Number & Floor */}
                    <div className="flex items-start justify-between gap-2 pt-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-slate-900">
                            #{room.roomNumber}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200">
                            {room.floor}-qavat
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 capitalize font-medium mt-0.5">
                          {room.roomType ? room.roomType.replace(/_/g, ' ') : 'Standart'}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border shrink-0 ${
                        isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        isPartial ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        isCleaning ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {isAvailable ? '🟢 Bo\'sh' :
                         isPartial ? '🟡 Qisman band' :
                         isCleaning ? '🧹 Tozalanmoqda' :
                         '🔴 To\'liq band'}
                      </span>
                    </div>

                    {/* Kravatlar / Joylar Sig'imi */}
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                          <BedDouble className="w-3.5 h-3.5 text-blue-500" />
                          Sig'imi: {total} ta joy
                        </span>
                        <span className="font-black text-xs">
                          {free > 0 ? (
                            <strong className="text-emerald-600 font-extrabold">{free} ta bo'sh</strong>
                          ) : (
                            <strong className="text-rose-600 font-extrabold">Bo'sh joy yo'q</strong>
                          )}
                        </span>
                      </div>

                      {/* Visual Beds Indicator Pills */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {Array.from({ length: total }).map((_, idx) => {
                          const isBedOccupied = idx < occupied;
                          return (
                            <div
                              key={idx}
                              className={`flex-1 h-3 rounded-full transition-all ${
                                isBedOccupied
                                  ? 'bg-rose-500 shadow-2xs'
                                  : 'bg-emerald-400 shadow-2xs'
                              }`}
                              title={isBedOccupied ? `${idx + 1}-kravat band` : `${idx + 1}-kravat bo'sh`}
                            />
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold pt-0.5">
                        <span>Band: <strong className="text-slate-800">{occupied}</strong> ta</span>
                        <span>Bo'sh: <strong className="text-emerald-600">{free}</strong> ta</span>
                      </div>
                    </div>

                    {/* Price & Active Guests Preview */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="font-black text-slate-900">
                        {Number(room.pricePerNight || 0).toLocaleString()} <span className="text-[10px] font-normal text-slate-500">so'm/tun</span>
                      </span>

                      {room.activeGuests && room.activeGuests.length > 0 ? (
                        <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1 truncate max-w-[140px]" title={room.activeGuests.map(g => g.name).join(', ')}>
                          <User className="w-3 h-3 shrink-0" /> {room.activeGuests[0]?.name || `${room.activeGuests.length} kishi`}
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-bold">
                          Tayyor xona ✨
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ADD ROOM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <BedDouble className="text-primary-500" /> Yangi Xona Qo'shish
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="p-6 space-y-4">
              <div>
                <label className="label">Filial *</label>
                <select
                  className="input-field font-semibold"
                  value={newRoomForm.branchId}
                  onChange={e => setNewRoomForm({ ...newRoomForm, branchId: e.target.value })}
                  required
                >
                  <option value="" disabled>Filial tanlang...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Xona raqami *</label>
                  <input
                    type="text"
                    placeholder="Masalan: 105"
                    className="input-field font-bold"
                    value={newRoomForm.roomNumber}
                    onChange={e => setNewRoomForm({ ...newRoomForm, roomNumber: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Xona tipi *</label>
                  <select
                    className="input-field"
                    value={newRoomForm.roomType}
                    onChange={e => setNewRoomForm({ ...newRoomForm, roomType: e.target.value })}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Lux">Lux</option>
                    <option value="VIP">VIP</option>
                    <option value="Family">Family</option>
                    <option value="Deluxe">Deluxe</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Qavat *</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={newRoomForm.floor}
                    onChange={e => setNewRoomForm({ ...newRoomForm, floor: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Kravatlar (Sig'im) *</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={newRoomForm.capacity}
                    onChange={e => setNewRoomForm({ ...newRoomForm, capacity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Bir kunlik narxi (so'm) *</label>
                <input
                  type="number"
                  step="1000"
                  placeholder="300000"
                  className="input-field font-mono font-bold"
                  value={newRoomForm.pricePerNight}
                  onChange={e => setNewRoomForm({ ...newRoomForm, pricePerNight: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Tavsif (ixtiyoriy)</label>
                <textarea
                  placeholder="Masalan: Balkonli, konditsioner bor..."
                  className="input-field min-h-[60px]"
                  value={newRoomForm.description}
                  onChange={e => setNewRoomForm({ ...newRoomForm, description: e.target.value })}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Bekor qilish
                </button>

                <button
                  type="submit"
                  disabled={submittingRoom}
                  className="btn-primary flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingRoom ? "Saqlanmoqda..." : "Saqlash va qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
