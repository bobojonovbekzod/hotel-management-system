import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Sparkles, Image as ImageIcon, MapPin, CheckCircle2 } from 'lucide-react';

export default function CleaningTasksPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(isOwner ? 'all' : user?.branchId);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (isOwner) fetchBranches();
  }, [isOwner]);

  useEffect(() => {
    fetchTasks();
  }, [selectedBranch, date]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data.success) {
        setBranches(res.data.data);
        if (res.data.data.length > 0 && selectedBranch === 'all') {
          setSelectedBranch(res.data.data[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      let query = `?date=${date}`;
      if (isOwner && selectedBranch !== 'all') {
        query += `&branchId=${selectedBranch}`;
      }
      const res = await api.get(`/cleaning-tasks${query}`);
      if (res.data.success) {
        setTasks(res.data.tasks);
      }
    } catch (error) {
      toast.error("Tarixni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const getTaskTypeName = (type) => {
    if (type === 'corridor') return 'Koridor';
    if (type === 'street') return "Ko'cha";
    return 'Xona';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-500" />
            Tozalash Tarixi
          </h1>
          <p className="text-slate-500 text-sm mt-1">Farroshlar tomonidan tozalangan xonalar, koridorlar va ko'chalar tarixi</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          {isOwner && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-slate-50 border-none text-sm rounded-lg focus:ring-0 py-2 pl-3 pr-8 text-slate-700 font-medium cursor-pointer"
            >
              <option value="all">Barcha filiallar</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
          
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-50 border-none text-sm rounded-lg focus:ring-0 py-2 px-3 text-slate-700 font-medium cursor-pointer"
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-600">Yuklanmoqda...</div>
        ) : tasks.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">Ma'lumot topilmadi</h3>
            <p className="text-slate-500">Ushbu sanada tozalangan xonalar yo'q.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-800">
              <thead className="bg-slate-50 shadow-sm text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Vaqt</th>
                  <th className="px-6 py-4">Farrosh</th>
                  <th className="px-6 py-4">Vazifa (Xona)</th>
                  <th className="px-6 py-4 text-center">Oldingi holati</th>
                  <th className="px-6 py-4 text-center">Tozalangandan keyin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {format(new Date(task.updatedAt), 'HH:mm')}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {format(new Date(task.updatedAt), 'dd.MM.yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{task.cleaner?.name || "Noma'lum"}</div>
                      {isOwner && (
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {task.branch?.name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                        task.taskType === 'room' ? 'bg-blue-50 text-blue-700' :
                        task.taskType === 'corridor' ? 'bg-amber-50 text-amber-700' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>
                        {getTaskTypeName(task.taskType)} {task.taskType === 'room' && task.room?.roomNumber ? `#${task.room.roomNumber}` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {task.beforeImage ? (
                        <button
                          onClick={() => setSelectedPhoto(task.beforeImage)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Ko'rish
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {task.afterImage ? (
                        <button
                          onClick={() => setSelectedPhoto(task.afterImage)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition-colors"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Ko'rish
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <img 
              src={`/api${selectedPhoto}`} 
              alt="Tozalash rasmi" 
              className="w-full h-auto rounded-xl shadow-2xl border-4 border-white/10 max-h-[90vh] object-contain" 
            />
            <button 
              className="absolute -top-4 -right-4 md:-top-6 md:-right-6 w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-xl hover:bg-red-50 hover:text-red-600 transition-colors text-xl font-bold"
              onClick={() => setSelectedPhoto(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
