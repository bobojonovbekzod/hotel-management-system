import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  BellRing, 
  Sparkles, 
  BedDouble, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Play, 
  ExternalLink, 
  MessageSquare,
  X,
  Volume2,
  VolumeX,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

import { io } from 'socket.io-client';

export default function PendingGuestRequestsBanner() {
  const { user } = useAuth();
  const location = useLocation();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  const knownIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  // Play crisp hotel concierge bell chime
  const playChimeSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;

      // Primary Chime (E5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Higher Harmonious Bell (B5)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(987.77, now + 0.08);
      gain2.gain.setValueAtTime(0.35, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 1.1);
    } catch (e) {
      console.warn('Audio chime warning:', e);
    }
  };

  const fetchPendingGuestRequests = async (isRealtime = false) => {
    if (!user) return;
    const allowedRoles = ['admin', 'supervisor', 'director', 'owner', 'superadmin'];
    if (!allowedRoles.includes(user.role)) return;

    try {
      const params = {
        status: 'pending'
      };
      if (user.branchId && user.role !== 'owner' && user.role !== 'superadmin') {
        params.branchId = user.branchId;
      }

      const res = await api.get('/guest-requests/admin/requests', { params });
      if (res.data?.success) {
        const list = (res.data.data || []).filter(r => r.status === 'pending');
        setPendingRequests(list);

        if (!isFirstLoadRef.current && isRealtime) {
          const hasNew = list.some(r => !knownIdsRef.current.has(r.id));
          if (hasNew) {
            playChimeSound();
            toast('Xonadan yangi so‘rov keldi! 🛎️', {
              icon: '🔔',
              duration: 4000
            });
          }
        }

        isFirstLoadRef.current = false;
        knownIdsRef.current = new Set(list.map(r => r.id));
      }
    } catch (err) {
      // Quiet fail on network issues
    }
  };

  useEffect(() => {
    fetchPendingGuestRequests();

    // 1. Real-time WebSocket connection
    const socket = io();
    socket.on('new_guest_request', (data) => {
      const isMyBranch = !user?.branchId || user?.role === 'owner' || user?.role === 'superadmin' || data?.branchId === user.branchId;
      if (isMyBranch) {
        fetchPendingGuestRequests(true);
      }
    });

    // Refresh when switching back to this tab
    const handleFocus = () => {
      if (!document.hidden) {
        fetchPendingGuestRequests(false);
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      socket.disconnect();
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, user?.branchId]);

  // If currently on the dedicated guest requests page, hide banner to avoid visual duplication
  if (location.pathname === '/admin/guest-requests') {
    return null;
  }

  const activeVisibleRequests = pendingRequests.filter(r => !dismissedIds.has(r.id));
  if (!user || activeVisibleRequests.length === 0) return null;

  const currentReq = activeVisibleRequests[0];

  const handleStartRequest = async (id) => {
    setLoading(true);
    try {
      const res = await api.patch(`/guest-requests/admin/requests/${id}/status`, {
        status: 'in_progress'
      });
      if (res.data?.success) {
        toast.success("So'rov qabul qilindi va 'Jarayonda' holatiga o'tkazildi! 🔄");
        fetchPendingGuestRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRequest = async (id) => {
    setLoading(true);
    try {
      const res = await api.patch(`/guest-requests/admin/requests/${id}/status`, {
        status: 'resolved'
      });
      if (res.data?.success) {
        toast.success("So'rov muvaffaqiyatli bajarildi deb belgilandi! ✅");
        fetchPendingGuestRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleDismissCurrent = (id) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const categoryIcons = {
    housekeeping: '🧹 Tozalash',
    amenities: '🧴 Sochiq / Buyumlar',
    ac_heating: '❄️ Konditsioner',
    plumbing: '🔧 Suv / Santexnika',
    water: '💧 Ichimlik suvi',
    tv: '📺 Televizor',
    chat: '💬 Xabar / Savol',
    other: '🛎️ So‘rov'
  };

  return (
    <div className="mb-6 w-full animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="rounded-2xl p-4 sm:p-5 text-white shadow-xl border relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-800 border-teal-500/50 shadow-teal-950/25">
        
        {/* Subtle background glow effect */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-0 right-0 p-3 flex items-center gap-1 z-20">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-white/80 hover:text-white transition-colors"
            title={soundEnabled ? "Ovozni o'chirish" : "Ovozni yoqish"}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button
            onClick={() => handleDismissCurrent(currentReq.id)}
            className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-white/80 hover:text-white transition-colors"
            title="Yashirish"
          >
            <X size={15} />
          </button>
        </div>

        {/* Left Info Area */}
        <div className="flex items-start gap-3.5 z-10 pr-12 md:pr-0">
          <div className="p-3 rounded-2xl shrink-0 bg-white/20 border border-white/30 text-white shadow-inner flex items-center justify-center">
            <BellRing className="w-6 h-6 animate-bounce" />
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-emerald-900 border border-white/30 shadow-xs flex items-center gap-1">
                <Sparkles size={12} className="text-emerald-600" />
                XONADAN YANGI SO'ROV (MEHMON)
              </span>
              
              <span className="text-xs font-black bg-emerald-950/40 text-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                🚪 {currentReq.roomNumber}-xona
              </span>

              {currentReq.branch?.name && (
                <span className="text-[11px] bg-black/25 text-white/90 font-bold px-2 py-0.5 rounded-full border border-white/20">
                  {currentReq.branch.name}
                </span>
              )}

              {activeVisibleRequests.length > 1 && (
                <span className="text-[11px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full shadow-xs">
                  +{activeVisibleRequests.length - 1} ta boshqa so'rov
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-snug">
              {currentReq.translatedMessageUz || currentReq.originalMessage || 'Yangi xizmat so‘rovi'}
            </h3>

            <p className="text-xs text-white/85 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Turi: <strong>{categoryIcons[currentReq.category] || currentReq.category || 'Umumiy'}</strong></span>
              <span>Vaqt: <strong>{new Date(currentReq.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tashkent' })}</strong></span>
              {currentReq.guestLanguage && (
                <span>Mehmon tili: <strong className="uppercase">{currentReq.guestLanguage}</strong></span>
              )}
            </p>
          </div>
        </div>

        {/* Right Action Buttons Area */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0 z-10 pt-2 md:pt-0 border-t md:border-t-0 border-white/15">
          <button
            onClick={() => handleStartRequest(currentReq.id)}
            disabled={loading}
            className="btn bg-white hover:bg-slate-100 text-teal-900 font-extrabold text-xs py-2 px-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current text-teal-700" />
            Qabul qilish (Jarayonda)
          </button>

          <button
            onClick={() => handleCompleteRequest(currentReq.id)}
            disabled={loading}
            className="btn bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl shadow-md border border-emerald-400/50 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Bajarildi ✅
          </button>

          <Link
            to="/admin/guest-requests"
            className="btn bg-black/30 hover:bg-black/40 text-white font-bold text-xs py-2 px-3 rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4" />
            Javob yozish
          </Link>
        </div>
      </div>
    </div>
  );
}
