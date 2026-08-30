import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Play, 
  CheckSquare, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export default function PendingTasksBanner() {
  const { user } = useAuth();
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMyPendingTasks = async () => {
    if (!user) return;
    try {
      const res = await api.get('/tasks');
      if (res.data?.success) {
        // Filter tasks assigned to current logged-in user that are TODO or IN_PROGRESS
        const myTasks = (res.data.data || []).filter(
          t => t.assigneeId === user.id && (t.status === 'TODO' || t.status === 'IN_PROGRESS')
        );
        setPendingTasks(myTasks);
      }
    } catch (err) {
      console.error('Error fetching pending tasks banner:', err);
    }
  };

  useEffect(() => {
    fetchMyPendingTasks();
    const interval = setInterval(fetchMyPendingTasks, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [user?.id]);

  if (!user || pendingTasks.length === 0) return null;

  // Priority item: first IN_PROGRESS, or first TODO
  const currentTask = pendingTasks.find(t => t.status === 'IN_PROGRESS') || pendingTasks[0];
  const isTodo = currentTask.status === 'TODO';

  const handleStartTask = async (taskId) => {
    setLoading(true);
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: 'IN_PROGRESS' });
      if (res.data?.success) {
        toast.success("Vazifa 'Jarayonda' holatiga o'tkazildi! 🔄");
        fetchMyPendingTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    setLoading(true);
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: 'DONE' });
      if (res.data?.success) {
        toast.success("Vazifa bajarildi va yakunlandi! 🎉");
        fetchMyPendingTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 w-full animate-in fade-in slide-in-from-top-4 duration-300">
      <div 
        className={`rounded-2xl p-4 sm:p-5 text-white shadow-lg border relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isTodo 
            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 border-red-500/50 shadow-red-950/20' 
            : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 border-amber-500/50 shadow-amber-950/20'
        }`}
      >
        {/* Subtle background glow element */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        {/* Left Info Area */}
        <div className="flex items-start gap-3.5 z-10">
          <div className={`p-2.5 rounded-xl shrink-0 border ${
            isTodo ? 'bg-white/15 border-white/20' : 'bg-white/20 border-white/30'
          }`}>
            {isTodo ? (
              <ShieldAlert className="w-6 h-6 text-white animate-bounce" />
            ) : (
              <Clock className="w-6 h-6 text-white animate-spin-slow" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isTodo ? 'bg-white text-rose-700 border-white/30' : 'bg-white text-amber-800 border-white/30'
              }`}>
                {isTodo ? '🚨 SIZGA YANGI VAZIFA BIRIKTIRILGAN' : '🔄 VAZIFA JARAYONDA'}
              </span>
              {pendingTasks.length > 1 && (
                <span className="text-[11px] bg-black/25 text-white font-bold px-2 py-0.5 rounded-full border border-white/20">
                  +{pendingTasks.length - 1} ta boshqa vazifa bor
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-snug">
              {currentTask.title}
            </h3>

            <p className="text-xs text-white/90 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Kimdan: <strong>{currentTask.creator?.name || 'Rahbariyat'}</strong></span>
              {currentTask.branch?.name && (
                <span>Filial: <strong>{currentTask.branch.name}</strong></span>
              )}
              {currentTask.dueDate && (
                <span>Muddat: <strong>{new Date(currentTask.dueDate).toLocaleDateString('uz-UZ')}</strong></span>
              )}
            </p>
          </div>
        </div>

        {/* Right Action Buttons Area */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0 z-10 pt-2 md:pt-0 border-t md:border-t-0 border-white/15">
          {isTodo ? (
            <button
              onClick={() => handleStartTask(currentTask.id)}
              disabled={loading}
              className="btn bg-white hover:bg-slate-100 text-rose-700 font-extrabold text-xs py-2 px-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              Ishni boshlash (Jarayonga o'tkazish)
            </button>
          ) : (
            <button
              onClick={() => handleCompleteTask(currentTask.id)}
              disabled={loading}
              className="btn bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-md border border-emerald-400 transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              ✅ Bajarildi deb yakunlash
            </button>
          )}

          <Link
            to="/tasks"
            className="btn bg-black/30 hover:bg-black/40 text-white font-bold text-xs py-2 px-3 rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
          >
            <CheckSquare className="w-4 h-4" />
            Vazifalarga o'tish
          </Link>
        </div>
      </div>
    </div>
  );
}
