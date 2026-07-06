import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { BedDouble, Plus, Edit2, X, Building2 } from 'lucide-react';

const statusLabels = {
  available: 'Bo\'sh',
  occupied: 'Band',
  cleaning: 'Tozalanmoqda',
  maintenance: 'Ta\'mirda',
};

const statusColors = {
  available: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  occupied: 'bg-red-500/10 text-red-400 border-red-500/20',
  cleaning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  maintenance: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function RoomsPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filterBranch, setFilterBranch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // Form states
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('');
  const [floor, setFloor] = useState('1');
  const [capacity, setCapacity] = useState('1');
  const [pricePerNight, setPricePerNight] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    fetchBranches();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [filterBranch]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.data);
      if (res.data.data.length > 0 && !filterBranch) {
        setFilterBranch(res.data.data[0].id.toString());
      }
    } catch (error) {
      toast.error('Filiallarni yuklashda xatolik');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/room-categories');
      setCategories(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRooms = async () => {
    if (!filterBranch && user?.role === 'owner') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/rooms${filterBranch ? `?branchId=${filterBranch}` : ''}`);
      setRooms(res.data.data);
    } catch (error) {
      toast.error('Xonalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setCreatingCategory(true);
    try {
      const res = await api.post('/room-categories', { name: newCategoryName });
      toast.success("Xona turi qo'shildi");
      setCategories([...categories, res.data.data]);
      setRoomType(res.data.data.name);
      setShowCategoryModal(false);
      setNewCategoryName('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setCreatingCategory(false);
    }
  };

  const openAddModal = () => {
    setEditingRoom(null);
    setRoomNumber('');
    setRoomType('');
    setFloor('1');
    setCapacity('1');
    setPricePerNight('');
    setDescription('');
    setShowModal(true);
  };

  const openEditModal = (room) => {
    setEditingRoom(room);
    setRoomNumber(room.roomNumber);
    setRoomType(room.roomType);
    setFloor(room.floor.toString());
    setCapacity(room.capacity.toString());
    setPricePerNight(room.pricePerNight.toString());
    setDescription(room.description || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        branchId: filterBranch || user?.branchId,
        roomNumber,
        roomType,
        floor: parseInt(floor),
        capacity: parseInt(capacity),
        pricePerNight: parseFloat(pricePerNight),
        description
      };

      if (editingRoom) {
        await api.put(`/rooms/${editingRoom.id}`, data);
        toast.success('Xona tahrirlandi');
      } else {
        await api.post('/rooms', data);
        toast.success('Yangi xona qo\'shildi');
      }
      setShowModal(false);
      fetchRooms();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BedDouble className="text-primary-400" /> Xonalar boshqaruvi
          </h1>
          <p className="text-slate-400 text-sm mt-1">Mehmonxona xonalari va ularning narxlari</p>
        </div>

        <div className="flex gap-3 items-center">
          {(user?.role === 'owner' || user?.role === 'supervisor') && (
            <select
              className="input-field max-w-[200px]"
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
            >
              <option value="" disabled>Filialni tanlang</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          {user?.role === 'owner' && (
            <button onClick={openAddModal} className="btn-primary h-11 px-4 whitespace-nowrap flex items-center gap-2">
              <Plus size={18} /> Yangi xona
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4" />
              Yuklanmoqda...
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <BedDouble size={48} className="mx-auto mb-4 opacity-20" />
              <p>Bu filialda xonalar topilmadi</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="table-th">Xona raqami</th>
                  <th className="table-th">Turi</th>
                  <th className="table-th">Qavat / Sig'im</th>
                  <th className="table-th">Narxi (1 kecha)</th>
                  <th className="table-th">Holati</th>
                  {user?.role === 'owner' && <th className="table-th text-center">Boshqaruv</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="table-td">
                      <div className="font-bold text-lg text-white">№ {room.roomNumber}</div>
                    </td>
                    <td className="table-td">
                      <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-sm border border-slate-700 capitalize">
                        {room.roomType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="table-td text-slate-300">
                      <div>{room.floor}-qavat</div>
                      <div className="text-sm text-slate-500">{room.capacity} kishilik</div>
                    </td>
                    <td className="table-td">
                      <div className="font-bold text-emerald-400">
                        {room.pricePerNight.toLocaleString()} so'm
                      </div>
                    </td>
                    <td className="table-td">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[room.status]}`}>
                        {statusLabels[room.status]}
                      </span>
                    </td>
                    {user?.role === 'owner' && (
                      <td className="table-td text-center">
                        <button
                          onClick={() => openEditModal(room)}
                          className="p-2 text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/30 rounded-lg transition-colors inline-block"
                        >
                          <Edit2 size={18} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content w-full max-w-md p-0 bg-slate-900 border border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900/80 shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BedDouble className="text-primary-400" />
                {editingRoom ? 'Xonani tahrirlash' : 'Yangi xona qo\'shish'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">

                <div>
                  <label className="label">Xona raqami</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Masalan: 101, 204A"
                    value={roomNumber}
                    onChange={e => setRoomNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Xona turi</label>
                  <div className="flex gap-2">
                    <select
                      required
                      className="input-field flex-1"
                      value={roomType}
                      onChange={e => setRoomType(e.target.value)}
                    >
                      <option value="" disabled>Tanlang...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => setShowCategoryModal(true)}
                      className="px-4 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center justify-center"
                      title="Yangi xona turi qo'shish"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Qavat</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="input-field"
                      value={floor}
                      onChange={e => setFloor(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Sig'im (kishi)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="input-field"
                      value={capacity}
                      onChange={e => setCapacity(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Narxi (1 kecha uchun)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="input-field"
                    placeholder="Masalan: 450000"
                    value={pricePerNight}
                    onChange={e => setPricePerNight(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Qo'shimcha ma'lumot (Ixtiyoriy)</label>
                  <textarea
                    className="input-field h-24 resize-none"
                    placeholder="Derazasi yo'q, televizor bor..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  ></textarea>
                </div>

              </div>

              <div className="p-5 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/80 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Bekor qilish
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Category Add Modal */}
      {showCategoryModal && (
        <div className="modal-overlay z-[60]" onClick={e => e.target === e.currentTarget && setShowCategoryModal(false)}>
          <div className="modal-content w-full max-w-sm p-0 bg-slate-900 border border-slate-800 flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900/80">
              <h2 className="text-lg font-bold text-white">Yangi xona turi</h2>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-6">
              <div className="mb-6">
                <label className="label">Nomi (masalan: VIP, Standart)</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn-secondary">Bekor qilish</button>
                <button type="submit" disabled={creatingCategory} className="btn-primary">
                  {creatingCategory ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
