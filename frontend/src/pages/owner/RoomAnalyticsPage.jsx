import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Activity, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import FullScreenLoader from '../FullScreenLoader';

export default function RoomAnalyticsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resRooms, resBranches] = await Promise.all([
        api.get('/reports/rooms-activity'),
        api.get('/branches')
      ]);
      setRooms(resRooms.data.data);
      setBranches(resBranches.data.data);
    } catch (err) {
      toast.error('Ma\\'lumotlarni yuklashda xatolik yuz berdi');
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-primary-400" /> Xonalar Tahlili
          </h1>
          <p className="text-slate-400 text-sm mt-1">Xonalarning oxirgi 30 kunlik faolligi va bandlik holati</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
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
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="">Barcha filiallar</option>
            {branches.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Xona / Filial</th>
                <th className="table-th text-center">So'nggi 30 kundagi bandlik</th>
                <th className="table-th text-center">So'nggi 30 kundagi daromadli kunlar</th>
                <th className="table-th">Oxirgi marta band qilingan sana</th>
                <th className="table-th text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => (
                <tr key={room.id} className="table-row">
                  <td className="table-td">
                    <div className="font-bold text-white text-base">#{room.roomNumber}</div>
                    <div className="text-xs text-slate-400">{room.branchName}</div>
                  </td>
                  <td className="table-td text-center">
                    <span className="font-mono text-white text-lg">{room.totalBookings30Days}</span> marta
                  </td>
                  <td className="table-td text-center">
                    <span className="font-mono text-white text-lg">{room.totalOccupiedDays30Days}</span> kun
                  </td>
                  <td className="table-td text-slate-300">
                    {room.lastOccupiedDate ? (
                      format(new Date(room.lastOccupiedDate), 'dd MMM, yyyy HH:mm', { locale: uz })
                    ) : (
                      <span className="text-slate-500">Ma'lumot yo'q</span>
                    )}
                  </td>
                  <td className="table-td text-center">
                    {room.status === 'Faol' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-400/20">
                        <CheckCircle size={14} /> Faol
                      </span>
                    ) : room.status === 'Kam ishlatilgan' ? (
                      <span className="inline-flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full text-xs font-semibold border border-yellow-400/20">
                        <Clock size={14} /> Kam ishlatilgan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400 bg-red-400/10 px-3 py-1 rounded-full text-xs font-semibold border border-red-400/20">
                        <AlertTriangle size={14} /> Shubhali
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRooms.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                    Ma'lumot topilmadi
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
