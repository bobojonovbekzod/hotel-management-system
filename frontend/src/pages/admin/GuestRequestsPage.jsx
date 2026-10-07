import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import {
  Sparkles,
  BedDouble,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Send,
  Printer,
  ChevronRight,
  ExternalLink,
  Volume2,
  VolumeX,
  User,
  ShieldCheck,
  Check,
  Building2,
  ImageIcon,
  Languages
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import RoomQrGeneratorModal from '../../components/admin/RoomQrGeneratorModal';
import { io } from 'socket.io-client';

export default function GuestRequestsPage() {
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | in_progress | resolved
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branchId || '');
  const [branches, setBranches] = useState([]);
  
  const isSuperOrOwner = user?.role === 'superadmin' || user?.role === 'owner';

  useEffect(() => {
    if (isSuperOrOwner) {
      api.get('/branches').then(res => {
        if (res.data?.success) {
          setBranches(res.data.data || []);
        }
      }).catch(err => console.error(err));
    }
  }, [isSuperOrOwner]);

  // Reply Drawer / Modal State
  const [activeChatRequest, setActiveChatRequest] = useState(null);
  const [chatThread, setChatThread] = useState([]);
  const [replyTextUz, setReplyTextUz] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [chatTargetLang, setChatTargetLang] = useState('en');
  const [previewImage, setPreviewImage] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const prevPendingCountRef = useRef(-1);
  const knownRequestIdsRef = useRef(new Set());
  const chatEndRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Initialize or resume Web Audio Context on user action
  const initAudio = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch (e) {
      console.warn('AudioContext init failed:', e);
    }
  };

  // Synthesize pleasant hotel concierge bell chime (F5 -> A5 -> C6)
  const playChimeSound = () => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const audioCtx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      
      const now = audioCtx.currentTime;
      
      // Tone 1 (Ding)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Tone 2 (Dong)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.15); // B5
      gain2.gain.setValueAtTime(0.5, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.8);
    } catch (e) {
      console.warn('Play chime error:', e);
    }
  };

  const fetchRequests = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const params = {
        branchId: selectedBranchId || undefined
      };

      const res = await api.get('/guest-requests/admin/requests', { params });
      if (res.data?.success) {
        const data = res.data.data || [];
        setRequests(data);

        // Check if any new pending request arrived
        const currentPendingIds = new Set(data.filter((r) => r.status === 'pending').map((r) => r.id));
        
        if (prevPendingCountRef.current !== -1) {
          // Check if there are newly added pending requests
          let hasNewPending = false;
          for (const id of currentPendingIds) {
            if (!knownRequestIdsRef.current.has(id)) {
              hasNewPending = true;
              break;
            }
          }

          if (hasNewPending) {
            playChimeSound();
            toast('Yangi xona xabari keldi! 🛎️', {
              icon: '🔔',
              position: 'top-right',
              duration: 5000
            });
          }
        }

        prevPendingCountRef.current = currentPendingIds.size;
        knownRequestIdsRef.current = new Set(data.map((r) => r.id));
      }
    } catch (err) {
      if (err.code !== 'ERR_NETWORK' && err.message !== 'Network Error') {
        console.warn('Guest requests update:', err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Real-time WebSocket connection
    const socket = io();
    socket.on('new_guest_request', (data) => {
      const isTargetBranch = !selectedBranchId || data?.branchId === Number(selectedBranchId);
      if (isTargetBranch) {
        playChimeSound();
        toast('Yangi xona xabari keldi! 🛎️', {
          icon: '🔔',
          position: 'top-right',
          duration: 5000
        });
        fetchRequests();
      }
    });

    socket.on('guest_request_status_updated', () => {
      fetchRequests();
    });

    socket.on('guest_chat_message', (data) => {
      if (activeChatRequest && activeChatRequest.branchId === data.branchId && activeChatRequest.roomNumber === data.roomNumber) {
        setChatThread((prev) => [...prev, data]);
      }
      fetchRequests();
    });

    // Refresh when switching back to tab
    const handleFocus = () => {
      if (!document.hidden) {
        fetchRequests();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      socket.disconnect();
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedBranchId, activeChatRequest]);

  // Load chat thread when replying
  const handleOpenChat = async (reqItem) => {
    setActiveChatRequest(reqItem);
    const sessionId = `session_${reqItem.branchId}_${reqItem.roomNumber}_${new Date(reqItem.createdAt).toISOString().slice(0, 10)}`;

    // 1. Fetch live active language from guest's phone screen
    try {
      const liveLangRes = await api.get(`/guest/active-lang/${reqItem.branchId}/${reqItem.roomNumber}`);
      if (liveLangRes.data?.success && liveLangRes.data.language) {
        setChatTargetLang(liveLangRes.data.language);
      } else {
        setChatTargetLang(reqItem.guestLanguage || 'en');
      }
    } catch (e) {
      setChatTargetLang(reqItem.guestLanguage || 'en');
    }

    // 2. Fetch existing chat thread
    try {
      const res = await api.get(`/guest-requests/admin/chat/${sessionId}`);
      if (res.data?.success) {
        const list = res.data.data || [];
        setChatThread(list);
      }
    } catch (err) {
      setChatThread([]);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    if (activeChatRequest) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatThread, activeChatRequest]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await api.patch(`/guest-requests/admin/requests/${id}/status`, {
        status: newStatus
      });
      if (res.data?.success) {
        const statusLabels = {
          in_progress: 'So‘rov qabul qilindi (Jarayonda) ⏳',
          resolved: 'So‘rov bajarildi deb belgilandi ✅',
          cancelled: 'So‘rov bekor qilindi ❌',
          pending: 'Yangi holatiga o‘tkazildi 🕒'
        };
        toast.success(statusLabels[newStatus] || `Holat: ${newStatus}`, { position: 'top-center' });
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus, resolvedAt: new Date() } : r))
        );
        if (activeChatRequest?.id === id) {
          setActiveChatRequest((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      toast.error('Holatni o\'zgartirishda xatolik');
    }
  };

  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!replyTextUz.trim() || sendingReply || !activeChatRequest) return;

    try {
      setSendingReply(true);
      const sessionId = `session_${activeChatRequest.branchId}_${activeChatRequest.roomNumber}_${new Date(activeChatRequest.createdAt).toISOString().slice(0, 10)}`;
      
      const targetLang = chatTargetLang || activeChatRequest.guestLanguage || 'en';
      const res = await api.post('/guest-requests/admin/reply', {
        sessionId,
        branchId: activeChatRequest.branchId,
        roomNumber: activeChatRequest.roomNumber,
        replyTextUz: replyTextUz.trim(),
        overrideLang: targetLang,
        guestLanguage: targetLang
      });

      if (res.data?.success) {
        toast.success('Javob yuborildi va AI orqali tarjima qilindi! ✅', { position: 'top-center' });
        setChatThread((prev) => [...prev, res.data.data]);
        setReplyTextUz('');
        if (activeChatRequest.status === 'pending') {
          handleUpdateStatus(activeChatRequest.id, 'in_progress');
        }
      }
    } catch (err) {
      toast.error('Javob yuborishda xatolik yuz berdi');
    } finally {
      setSendingReply(false);
    }
  };

  // Counts calculated from full requests state
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;
  const resolvedCount = requests.filter((r) => r.status === 'resolved').length;
  const todayResolvedCount = requests.filter((r) => {
    if (r.status !== 'resolved' || !r.resolvedAt) return false;
    const today = new Date().toISOString().slice(0, 10);
    return new Date(r.resolvedAt).toISOString().slice(0, 10) === today;
  }).length;

  // Periodic alert chime until receptionist clicks "Olish"
  useEffect(() => {
    if (!soundEnabled || pendingCount === 0) return;

    const alertInterval = setInterval(() => {
      playChimeSound();
    }, 12000); // Repeats every 12 seconds as long as pending requests exist

    return () => clearInterval(alertInterval);
  }, [pendingCount, soundEnabled]);

  // Client-side Filtered list (Never loses count when switching tabs!)
  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        r.roomNumber?.toLowerCase().includes(q) ||
        r.originalMessage?.toLowerCase().includes(q) ||
        r.translatedMessageUz?.toLowerCase().includes(q) ||
        r.branch?.name?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 space-y-5">
      <Toaster />



      {/* 2. TOP HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            Xona so'rovlari
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Xonalardagi QR-kod orqali kelgan xabarlar, nosozliklar va 2 tomonlama sinxron AI tarjimon
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Sound Toggle & Test */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button
              onClick={() => {
                initAudio();
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) {
                  playChimeSound();
                }
              }}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                soundEnabled
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-transparent text-slate-400 hover:text-slate-600'
              }`}
              title={soundEnabled ? "Ovoz yoqilgan (O'chirish)" : "Ovoz o'chirilgan (Yoqish)"}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span className="hidden md:inline">{soundEnabled ? 'Ovoz yoqilgan' : "Ovoz o'chiq"}</span>
            </button>

            {soundEnabled && (
              <button
                onClick={() => {
                  initAudio();
                  playChimeSound();
                  toast('Qo‘ng‘iroq ovozi sinab ko‘rildi 🛎️', { icon: '🔔', position: 'top-right' });
                }}
                className="px-2 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100/60 rounded-lg transition-colors"
                title="Qo'ng'iroq ovozini sinash"
              >
                Sinash 🔔
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchRequests(true)}
            disabled={refreshing}
            className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-amber-600' : ''} />
            <span>Yangilash</span>
          </button>

          {/* QR Code Generator Modal */}
          <button
            onClick={() => setShowQrModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <Printer size={16} />
            <span>QR Kodlarni Chiqarish</span>
          </button>
        </div>
      </div>

      {/* 3. KPI STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-1">Yangi (Kutilmoqda)</p>
            <p className="text-2xl font-black text-rose-600">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-1">Jarayonda</p>
            <p className="text-2xl font-black text-amber-600">{inProgressCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <RefreshCw size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-1">Bugun Bajarildi</p>
            <p className="text-2xl font-black text-emerald-600">{resolvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-1">Jami So'rovlar</p>
            <p className="text-2xl font-black text-slate-800">{requests.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <BedDouble size={20} />
          </div>
        </div>
      </div>

      {/* 4. FILTER BAR & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Status Tabs with Permanent Badge Counts */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100 rounded-xl border border-slate-200">
          {[
            { key: 'all', label: 'Barchasi', badge: requests.length },
            { key: 'pending', label: 'Yangi', badge: pendingCount },
            { key: 'in_progress', label: 'Jarayonda', badge: inProgressCount },
            { key: 'resolved', label: 'Bajarildi', badge: resolvedCount }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === tab.key
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  statusFilter === tab.key
                    ? 'bg-white text-amber-600'
                    : tab.key === 'pending' && tab.badge > 0
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Category Filter & Search Input */}
        <div className="flex items-center gap-2">
          {isSuperOrOwner && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="">Barcha Filiallar</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="all">Barcha Turlar</option>
            <option value="housekeeping">🧹 Tozalash (Housekeeping)</option>
            <option value="maintenance">❄️ Texnik nosozlik</option>
            <option value="amenities">🧴 Sochiq / Buyumlar</option>
            <option value="dining">🍽️ Suv / Restoran</option>
            <option value="chat">💬 Xabar / Savol</option>
          </select>

          <div className="relative flex-1 sm:w-60">
            <Search size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Xona raqami yoki xabar..."
              className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* 5. MAIN REQUEST CARDS GRID */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500">
          <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium">So'rovlar yuklanmoqda...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="h-64 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <BedDouble size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">Hech qanday so'rov topilmadi</h3>
          <p className="text-xs text-slate-500">Ushbu parametrlar bo'yicha yangi xabarlar mavjud emas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'pending';
            const isInProgress = req.status === 'in_progress';
            const isResolved = req.status === 'resolved';

            const categoryEmoji = {
              housekeeping: '🧹',
              maintenance: '❄️',
              amenities: '🧴',
              dining: '💧',
              chat: '💬',
              general: '🛎️'
            }[req.category] || '🛎️';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                  isPending
                    ? 'border-rose-300 ring-2 ring-rose-100'
                    : isInProgress
                    ? 'border-amber-300 ring-2 ring-amber-50'
                    : 'border-slate-200 opacity-90'
                }`}
              >
                {/* Top Card Info */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{categoryEmoji}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">
                            Xona {req.roomNumber}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600">
                            {req.branch?.name || 'HotelBase'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isPending
                          ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse'
                          : isInProgress
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}
                    >
                      {isPending ? 'Yangi' : isInProgress ? 'Jarayonda' : 'Bajarildi'}
                    </span>
                  </div>

                  {/* Uzbek Translation Highlight */}
                  <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/80 mb-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-800">
                      <span className="flex items-center gap-1">
                        <Sparkles size={11} /> O'zbekcha tarjima (AI):
                      </span>
                      <span className="text-slate-500 uppercase">{req.guestLanguage || 'en'}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                      "{req.translatedMessageUz || req.originalMessage}"
                    </p>
                  </div>

                  {/* Original Guest Message */}
                  {req.originalMessage && req.originalMessage !== req.translatedMessageUz && (
                    <div className="px-1 mb-2">
                      <p className="text-[10px] text-slate-500 italic line-clamp-2">
                        Mehmon yozgan asl matn: "{req.originalMessage}"
                      </p>
                    </div>
                  )}

                  {/* Attached Photo */}
                  {req.photoUrl && (
                    <div className="mb-2.5">
                      <button
                        onClick={() => setPreviewImage(req.photoUrl)}
                        className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg w-full justify-center transition-colors font-semibold"
                      >
                        <ImageIcon size={14} />
                        <span>Biriktirilgan rasmni ko'rish</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Footer & Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                  <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    {new Date(req.createdAt).toLocaleTimeString('uz-UZ', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                      timeZone: 'Asia/Tashkent'
                    })}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Open Live Chat / Reply */}
                    <button
                      onClick={() => handleOpenChat(req)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 border border-slate-200 active:scale-95 transition-all"
                    >
                      <MessageSquare size={12} className="text-amber-600" />
                      <span>Javob yozish</span>
                    </button>

                    {/* Status Action Buttons */}
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'in_progress')}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold active:scale-95 transition-all shadow-sm"
                      >
                        Olish
                      </button>
                    )}
                    {isInProgress && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'resolved')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold active:scale-95 transition-all shadow-sm"
                      >
                        Bajarildi
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* CHAT / REPLY MODAL (Light Mode) */}
      {/* ======================================================== */}
      {activeChatRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col h-[560px] overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-amber-600 font-black">Xona {activeChatRequest.roomNumber}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-xs text-slate-600">{activeChatRequest.branch?.name}</span>
                </h3>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                  <Sparkles size={11} className="text-amber-600" />
                  Siz o'zbekcha yozasiz, AI mehmonga avtomatik tarjima qilib yetkazadi
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 shadow-sm">
                  <Languages size={13} className="text-amber-600 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">Tarjima:</span>
                  <select
                    value={chatTargetLang}
                    onChange={(e) => setChatTargetLang(e.target.value)}
                    className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="de">🇩🇪 Deutsch (Nemis)</option>
                    <option value="en">🇬🇧 English (Ingliz)</option>
                    <option value="ru">🇷🇺 Русский (Rus)</option>
                    <option value="zh">🇨🇳 中文 (Xitoy)</option>
                    <option value="tr">🇹🇷 Türkçe (Turk)</option>
                    <option value="ar">🇸🇦 العربية (Arab)</option>
                    <option value="fr">🇫🇷 Français (Fransuz)</option>
                    <option value="hi">🇮🇳 हिन्दी (Hind)</option>
                    <option value="ur">🇵🇰 اردو (Urdu)</option>
                    <option value="uz">🇺🇿 O'zbekcha</option>
                  </select>
                </div>
                <button
                  onClick={() => setActiveChatRequest(null)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Chat Thread Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70">
              {chatThread.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Xabarlar tarixi bo'sh. Birinchi javobni yuboring.
                </div>
              ) : (
                chatThread.map((msg, idx) => {
                  const isStaff = msg.sender === 'staff';
                  const isAI = msg.sender === 'ai';

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 font-medium">
                        {isStaff ? (
                          <span className="text-emerald-600 font-bold">Siz (Reseption)</span>
                        ) : isAI ? (
                          <span className="text-amber-600 font-bold">AI Concierge</span>
                        ) : (
                          <span className="text-slate-700 font-bold">Mehmon ({activeChatRequest.roomNumber}-xona)</span>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(msg.createdAt || Date.now()).toLocaleTimeString('uz-UZ', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            timeZone: 'Asia/Tashkent'
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                          isStaff
                            ? 'bg-amber-500 text-white font-semibold rounded-tr-none'
                            : isAI
                            ? 'bg-amber-50 border border-amber-200 text-slate-800 rounded-tl-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                        }`}
                      >
                        {isStaff ? (
                          <div>
                            <p>{msg.originalText}</p>
                            {msg.translatedText && msg.translatedText !== msg.originalText && (
                              <div className="text-[10px] text-amber-100 font-normal mt-1 pt-1 border-t border-white/20 flex items-center gap-1">
                                <Sparkles size={10} className="text-amber-200 shrink-0" />
                                <span>{msg.targetLang?.toUpperCase() || 'EN'} (Mehmonga):</span>
                                <span className="font-semibold italic">"{msg.translatedText}"</span>
                              </div>
                            )}
                          </div>
                        ) : isAI ? (
                          <p>{msg.translatedText || msg.originalText}</p>
                        ) : (
                          <div>
                            {msg.translatedText && (
                              <div className="font-bold text-amber-900 mb-1">
                                🇺🇿 "{msg.translatedText}"
                              </div>
                            )}
                            <p className={msg.translatedText ? 'text-slate-500 text-[11px] italic' : ''}>
                              {msg.originalText}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Reply Input Bar */}
            <form onSubmit={handleSendAdminReply} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={replyTextUz}
                onChange={(e) => setReplyTextUz(e.target.value)}
                placeholder="O'zbek tilida javob yozing (masalan: Hozir yetkazamiz)..."
                maxLength={600}
                className="flex-1 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!replyTextUz.trim() || sendingReply}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                {sendingReply ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={14} />
                    <span>Yuborish</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={previewImage}
            alt="Guest Attachment"
            className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white"
          />
        </div>
      )}

      {/* Room QR Code Generator Modal */}
      {showQrModal && (
        <RoomQrGeneratorModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          defaultBranchId={selectedBranchId || user?.branchId || 1}
        />
      )}
    </div>
  );
}
