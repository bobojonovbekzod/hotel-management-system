import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Activity, Search, Clock, Table, BarChart3, 
  TrendingUp, DollarSign, BedDouble, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Cell 
} from 'recharts';

export default function RoomAnalyticsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState([]);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [viewMode, setViewMode] = useState('chart'); // 'table' or 'chart'

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data?.data) {
        setBranches(res.data.data);
        if (res.data.data.length > 0) {
          setBranchFilter(res.data.data[0].name);
        }
      }
    } catch (err) {
      toast.error("Filiallarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchFilter && branches.length > 0) {
      fetchRooms();
    }
  }, [branchFilter, filterMonth]);

  const fetchRooms = async () => {
    if (!branchFilter) return;
    
    setLoading(true);
    try {
      const branch = branches.find(b => b.name === branchFilter);
      const resRooms = await api.get('/reports/rooms-activity', { 
        params: { 
          month: filterMonth,
          branchId: branch?.id 
        } 
      });
      setRooms(resRooms.data.data || []);
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

  // Calculate summary metrics
  const totalIncomeAll = filteredRooms.reduce((sum, r) => sum + (r.totalIncome || 0), 0);
  const totalBookingsAll = filteredRooms.reduce((sum, r) => sum + (r.totalBookings || 0), 0);
  const topEarningRoom = [...filteredRooms].sort((a, b) => (b.totalIncome || 0) - (a.totalIncome || 0))[0];

  // Chart data format
  const chartData = filteredRooms.map(r => ({
    roomNumber: `${r.roomNumber}-xona`,
    rawNumber: r.roomNumber,
    totalIncome: r.totalIncome || 0,
    totalBookings: r.totalBookings || 0,
    branchName: r.branchName
  }));

  // Custom Tooltip for Chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
          <p className="font-extrabold text-sm text-primary-400">{data.roomNumber}</p>
          <p className="text-slate-300">Filial: <strong className="text-white">{data.branchName}</strong></p>
          <p className="text-slate-300">Jami tushum: <strong className="text-emerald-400 font-mono text-sm">{data.totalIncome.toLocaleString()} so'm</strong></p>
          <p className="text-slate-300">Foydalanishlar: <strong className="text-white font-mono">{data.totalBookings} marta</strong></p>
        </div>
      );
    }
    return null;
  };

  if (loading) return <FullScreenLoader />;

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="text-primary-500" /> Xonalar Tahlili
          </h1>
          <p className="text-slate-600 text-sm mt-1">Xonalarning oylik tushum daromadi va foydalanish statistikasi</p>
        </div>
      </div>

      {/* Filter Bar & View Mode Switcher Icons */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Xona raqami bo'yicha qidiruv..."
              className="input-field pl-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Branch Select */}
          <div className="w-full sm:w-52">
            <select 
              className="input-field text-xs font-semibold" 
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="" disabled>Filialni tanlang...</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Month Select */}
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 border border-slate-200 text-xs">
            <Clock size={15} className="text-slate-500" />
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-transparent border-none text-slate-900 font-semibold py-2 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* View Mode Switcher Icons (Dual View Switcher) */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'chart'
                ? 'bg-white text-primary-600 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Diagramma ko'rinishi"
          >
            <BarChart3 size={16} />
            <span>Diagramma</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-primary-600 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Jadval ko'rinishi"
          >
            <Table size={16} />
            <span>Jadval</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Jami Oylik Tushum</p>
            <h3 className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {totalIncomeAll.toLocaleString()} <span className="text-xs font-normal text-slate-500">so'm</span>
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <BedDouble className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Jami Foydalanishlar</p>
            <h3 className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {totalBookingsAll} <span className="text-xs font-normal text-slate-500">marta</span>
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Eng Ko'p Daromad Keltirgan</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">
              {topEarningRoom ? `#${topEarningRoom.roomNumber}-xona` : "Yo'q"}
              {topEarningRoom && (
                <span className="text-xs font-normal text-emerald-600 ml-2 font-mono">
                  ({topEarningRoom.totalIncome?.toLocaleString()} so'm)
                </span>
              )}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content Area: Chart or Table */}
      {viewMode === 'chart' ? (
        /* DIAGRAMMA KO'RINISHI (BAR CHART VIEW) */
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-500" />
                Xonalar bo'yicha tushum diagrammasi
              </h3>
              <p className="text-xs text-slate-500">X-o'qida: Xona raqami | Y-o'qida: Tushum summasi (so'mda)</p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
              {filteredRooms.length} ta xona
            </span>
          </div>

          {chartData.length === 0 ? (
            <div className="py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              Diagramma chiqarish uchun filial va oy bo'yicha ma'lumotlar topilmadi
            </div>
          ) : (
            <div className="w-full h-[400px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="roomNumber" 
                    tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis 
                    tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}k`}
                    tick={{ fill: '#475569', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalIncome" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index % 2 === 0 ? '#4f46e5' : '#06b6d4'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        /* JADVAL KO'RINISHI (TABLE VIEW) */
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Table className="w-4 h-4 text-slate-500" /> Xonalar jadvali
            </h3>
            <span className="text-xs text-slate-500">Jami {filteredRooms.length} ta xona</span>
          </div>

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
                      <span className="font-mono text-slate-900 text-lg font-bold">{room.totalBookings}</span> marta
                    </td>
                    <td className="table-td text-center">
                      <span className="font-mono text-emerald-600 font-extrabold text-lg">{room.totalIncome?.toLocaleString()}</span> <span className="text-xs text-slate-600">so'm</span>
                    </td>
                    <td className="table-td text-slate-800">
                      {room.lastOccupiedDate ? (
                        format(new Date(room.lastOccupiedDate), 'dd MMM, yyyy HH:mm', { locale: uz })
                      ) : (
                        <span className="text-slate-500 italic">Ma'lumot yo'q</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRooms.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500 border-dashed">
                      {branchFilter ? "Ma'lumot topilmadi" : "Filialni tanlang"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
