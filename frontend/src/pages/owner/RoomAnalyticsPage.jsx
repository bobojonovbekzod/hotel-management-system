import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Activity, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import FullScreenLoader from '../../components/common/FullScreenLoader';

export default function RoomAnalyticsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState([]);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.data);
    } catch (err) {
      toast.error("Filiallarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    if (!branchFilter) {
      toast.error("Iltimos, avval bitta filialni tanlang!");
      return;
    }
    
    setLoading(true);
    try {
      const branch = branches.find(b => b.name === branchFilter);
      const resRooms = await api.get('/reports/rooms-activity', { 
        params: { 
          month: filterMonth,
          branchId: branch?.id 
        } 
      });
      setRooms(resRooms.data.data);
    } catch (err) {
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchSearch = room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBranch = branchFilter ? room.branchName === branchFilter : true;
    return matchSearch && matchBranch;
  });

  if (loading) return <FullScreenLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="text-primary-400" /> Xonalar Tahlili
          </h1>
          <p className="text-slate-600 text-sm mt-1">Xonalarning oylik faolligi va keltirgan daromadi</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input
            type="text"
            placeholder="Xona raqami bo'yicha qidiruv..."
            className="input-field pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <select 
            className="input-field" 
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setRooms([]); // Filial o'zgarganda jadvalni tozalash
            }}
          >
            <option value="" disabled>Filialni tanlang...</option>
            {branches.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2 bg-slate-100 rounded-xl px-3 border border-slate-300">
          <Clock size={18} className="text-slate-600" />
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-transparent border-none text-slate-900 focus:outline-none py-2 outline-none"
          />
        </div>
        <button
          onClick={fetchRooms}
          className="btn-primary w-full sm:w-auto flex items-center justify-center"
        >
          Filtrlash
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Xona / Filial</th>
                <th className="table-th text-center">Foydalanishlar soni</th>
                <th className="table-th text-center">Keltirgan daromadi</th>
                <th className="table-th">Oxirgi marta band qilingan sana</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => (
                <tr key={room.id} className="table-row">
                  <td className="table-td">
                    <div className="font-bold text-slate-900 text-base">#{room.roomNumber}</div>
                    <div className="text-xs text-slate-600">{room.branchName}</div>
                  </td>
                  <td className="table-td text-center">
                    <span className="font-mono text-slate-900 text-lg">{room.totalBookings}</span> marta
                  </td>
                  <td className="table-td text-center">
                    <span className="font-mono text-emerald-400 font-bold text-lg">{room.totalIncome?.toLocaleString()}</span> <span className="text-xs text-slate-600">so'm</span>
                  </td>
                  <td className="table-td text-slate-800">
                    {room.lastOccupiedDate ? (
                      format(new Date(room.lastOccupiedDate), 'dd MMM, yyyy HH:mm', { locale: uz })
                    ) : (
                      <span className="text-slate-600">Ma'lumot yo'q</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRooms.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-600 border-dashed">
                    {branchFilter ? "Ma'lumot topilmadi" : "Filialni tanlang va 'Filtrlash' tugmasini bosing"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
