import React, { useState, useEffect, useRef } from 'react';
import { 
  History, 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Volume2, 
  Clock, 
  Calendar, 
  User, 
  Headset, 
  PhoneOff, 
  Grid, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  FileAudio,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CalendarRange
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { UserAgent, Registerer, Inviter, SessionState } from 'sip.js';
import { SIP_AUDIO_CONSTRAINTS, SIP_SDH_OPTIONS } from '../../lib/sipAudioConfig';
import CustomAudioPlayer from '../../components/common/CustomAudioPlayer';

const cleanText = (str, fallback = '') => {
  if (!str) return fallback;
  if (typeof str !== 'string') return String(str);
  if (str.includes('<test lead:') || str.includes('dummy data for')) {
    if (str.includes('ism') || str.includes('name')) return 'Test Mijoz (Meta Test)';
    if (str.includes('phone') || str.includes('telefon') || str.includes('bog\'lanish')) return '+998 90 123 45 67';
    if (str.includes('filial') || str.includes('shaxar') || str.includes('city')) return 'Toshkent filiali';
    return str.replace(/<test lead: dummy data for |>/gi, '').trim();
  }
  return str.trim();
};

const formatPhone = (phone) => {
  const cleaned = cleanText(phone, '');
  if (!cleaned || cleaned === '+998') return '+998 (90) 123-45-67';
  return cleaned;
};

export default function OperatorCallsPage() {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all'); // 'all', 'incoming', 'outgoing', 'recorded'
  const [dateRange, setDateRange] = useState('all'); // 'all', 'today', 'yesterday', 'week', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [summary, setSummary] = useState({ totalCalls: 0, incoming: 0, outgoing: 0, answered: 0, recorded: 0 });

  // Softphone & SIP State
  const [sipConfig, setSipConfig] = useState({
    wsServer: typeof window !== 'undefined' && window.location.protocol === 'https:' ? `wss://${window.location.host}/sip-ws` : 'ws://89.126.208.59:8088/ws',
    sipUser: '1001w',
    sipPass: 'aa1001aa',
    sipDomain: '89.126.208.59'
  });
  const [sipRegistered, setSipRegistered] = useState(false);
  const [softphoneOpen, setSoftphoneOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [inCall, setInCall] = useState(false);
  const [callTimer, setCallTimer] = useState(0);

  const userAgentRef = useRef(null);
  const registererRef = useRef(null);
  const activeSessionRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: searchQuery,
        direction: directionFilter,
        dateRange,
        startDate: dateRange === 'custom' ? startDate : undefined,
        endDate: dateRange === 'custom' ? endDate : undefined
      };

      const res = await api.get('/leads/calls', { params });
      if (res.data?.success) {
        setCallLogs(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching calls:', err);
      toast.error('Qo\'ng\'iroqlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [page, limit, directionFilter, dateRange, startDate, endDate]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchCalls();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [incomingCall, setIncomingCall] = useState(null);
  const incomingRingAudioContextRef = useRef(null);
  const incomingRingTimerRef = useRef(null);

  const playIncomingRingTone = () => {
    try {
      if (!incomingRingAudioContextRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) incomingRingAudioContextRef.current = new AudioCtx();
      }
      const ctx = incomingRingAudioContextRef.current;
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (ctx) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(480, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.8);
        osc2.stop(ctx.currentTime + 1.8);
      }
    } catch (e) {
      console.log('Incoming ring error:', e);
    }
  };

  const startIncomingRing = () => {
    stopIncomingRing();
    playIncomingRingTone();
    incomingRingTimerRef.current = setInterval(playIncomingRingTone, 3000);
  };

  const stopIncomingRing = () => {
    if (incomingRingTimerRef.current) {
      clearInterval(incomingRingTimerRef.current);
      incomingRingTimerRef.current = null;
    }
  };

  const attachRemoteStream = (session) => {
    try {
      const sdh = session?.sessionDescriptionHandler;
      if (!sdh || !remoteAudioRef.current) return;

      const audioEl = remoteAudioRef.current;
      audioEl.muted = false;
      audioEl.volume = 1.0;

      const safePlay = () => {
        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            if (err.name !== 'AbortError') {
              console.log('Audio playback note:', err.message);
            }
          });
        }
      };

      const setStream = (stream) => {
        if (!stream) return;
        if (audioEl.srcObject !== stream) {
          audioEl.srcObject = stream;
        }
        safePlay();
      };

      if (sdh.remoteMediaStream) {
        setStream(sdh.remoteMediaStream);
      }

      const pc = sdh.peerConnection;
      if (pc) {
        if (pc.getReceivers) {
          const receivers = pc.getReceivers();
          for (const r of receivers) {
            if (r.track && r.track.kind === 'audio') {
              setStream(new MediaStream([r.track]));
              break;
            }
          }
        }

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setStream(event.streams[0]);
          } else if (event.track) {
            setStream(new MediaStream([event.track]));
          }
        };
      }
    } catch (err) {
      console.log('Attach audio err:', err);
    }
  };

  const handleAnswerIncomingCall = async () => {
    if (!incomingCall?.invitation) return;
    try {
      stopIncomingRing();
      const inv = incomingCall.invitation;
      activeSessionRef.current = inv;

      await inv.accept({
        sessionDescriptionHandlerOptions: SIP_SDH_OPTIONS
      });
      setInCall(true);
      setSoftphoneOpen(true);
      attachRemoteStream(inv);
      setIncomingCall(null);
      toast.success("Mijoz bilan aloqa o'rnatildi! 🎧");
    } catch (err) {
      console.error('Error answering call:', err);
      toast.error("Qo'ng'iroqqa ulanishda xatolik");
    }
  };

  const handleRejectIncomingCall = () => {
    stopIncomingRing();
    if (incomingCall?.invitation) {
      incomingCall.invitation.reject();
    }
    setIncomingCall(null);
    setInCall(false);
  };

  // SIP WebRTC Connection
  useEffect(() => {
    connectSIP();
    return () => {
      stopIncomingRing();
      disconnectSIP();
    };
  }, []);

  const connectSIP = async () => {
    try {
      const targetURI = UserAgent.makeURI(`sip:${sipConfig.sipUser}@${sipConfig.sipDomain}`);
      if (!targetURI) return;

      const ua = new UserAgent({
        uri: targetURI,
        transportOptions: { server: sipConfig.wsServer },
        authorizationUsername: sipConfig.sipUser,
        authorizationPassword: sipConfig.sipPass,
        logLevel: 'error'
      });

      ua.delegate = {
        onInvite(invitation) {
          activeSessionRef.current = invitation;
          const callerNum = invitation.remoteIdentity?.uri?.user || '';
          const cleanCaller = callerNum.replace(/\D/g, '');
          const callerName = `Mijoz (+998 ${cleanCaller.slice(-9)})`;

          setIncomingCall({
            phone: callerNum,
            cleanPhone: cleanCaller,
            name: callerName,
            invitation
          });

          startIncomingRing();

          invitation.stateChange.addListener((state) => {
            if (state === SessionState.Established) {
              stopIncomingRing();
              setInCall(true);
              setSoftphoneOpen(true);
              attachRemoteStream(invitation);
            } else if (state === SessionState.Terminated) {
              stopIncomingRing();
              setInCall(false);
              setIncomingCall(null);
              activeSessionRef.current = null;
              fetchCalls();
            }
          });
        }
      };

      await ua.start();
      userAgentRef.current = ua;
      const reg = new Registerer(ua);
      await reg.register();
      registererRef.current = reg;
      setSipRegistered(true);
    } catch (err) {
      console.log('SIP err:', err);
    }
  };

  const disconnectSIP = () => {
    if (registererRef.current) registererRef.current.unregister();
    if (userAgentRef.current) userAgentRef.current.stop();
    setSipRegistered(false);
  };

  useEffect(() => {
    let interval;
    if (inCall) {
      interval = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [inCall]);

  const cleanPhoneForDial = (phone) => {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('998') && digits.length === 12) {
      return digits.slice(3);
    }
    if (digits.length === 9) {
      return digits;
    }
    if (digits.length > 9 && digits.startsWith('8')) {
      return digits.slice(1);
    }
    return digits || String(phone).replace(/[\s+()-]/g, '');
  };

  const ringbackAudioContextRef = useRef(null);
  const ringbackTimerRef = useRef(null);

  const playSingleRingTone = () => {
    try {
      if (!ringbackAudioContextRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          ringbackAudioContextRef.current = new AudioCtx();
        }
      }
      const ctx = ringbackAudioContextRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      if (ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(425, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.2);
      }
    } catch (e) {
      console.log('Ringback audio error:', e);
    }
  };

  const startRingback = () => {
    stopRingback();
    playSingleRingTone();
    ringbackTimerRef.current = setInterval(() => {
      playSingleRingTone();
    }, 4000);
  };

  const stopRingback = () => {
    if (ringbackTimerRef.current) {
      clearInterval(ringbackTimerRef.current);
      ringbackTimerRef.current = null;
    }
  };

  const handleStartCall = async (targetPhone = null) => {
    const rawNumber = targetPhone || dialNumber || '';
    const cleanedDigits = cleanPhoneForDial(rawNumber);
    const numberToCall = cleanedDigits || rawNumber.replace(/[\s+()-]/g, '');
    
    if (numberToCall) {
      setDialNumber(numberToCall);
    }
    setSoftphoneOpen(true);

    if (!numberToCall) {
      toast.error('Telefon raqamini kiriting!');
      return;
    }

    if (!userAgentRef.current || !sipRegistered) {
      toast.error("SIP telefoniya ulanmoqda...");
      setInCall(true);
      setSoftphoneOpen(true);
      return;
    }

    try {
      const target = UserAgent.makeURI(`sip:${numberToCall}@${sipConfig.sipDomain}`);
      const inviter = new Inviter(userAgentRef.current, target, {
        sessionDescriptionHandlerOptions: SIP_SDH_OPTIONS
      });

      inviter.stateChange.addListener(async (state) => {
        if (state === SessionState.Established) {
          stopRingback();
          setInCall(true);
          setSoftphoneOpen(true);
          attachRemoteStream(inviter);
        } else if (state === SessionState.Terminated) {
          stopRingback();
          setInCall(false);
          activeSessionRef.current = null;
          fetchCalls();
        }
      });

      startRingback();
      await inviter.invite();
      activeSessionRef.current = inviter;
      setInCall(true);
      setSoftphoneOpen(true);
    } catch (err) {
      stopRingback();
      toast.error("Qo'ng'iroqni amalga oshirib bo'lmadi");
    }
  };

  const handleDialClick = (digit) => {
    if (dialNumber.length < 15) {
      setDialNumber(prev => prev + digit);
    }
  };

  const handleEndCall = () => {
    stopRingback();
    if (activeSessionRef.current) {
      activeSessionRef.current.dispose();
      activeSessionRef.current = null;
    }
    setInCall(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans pb-16">
      <audio ref={remoteAudioRef} autoPlay />

      {/* INCOMING CALL FLOATING BANNER */}
      {incomingCall && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-bounce sm:animate-none">
          <div className="bg-slate-900/95 backdrop-blur-xl text-white border-2 border-emerald-500/80 shadow-2xl rounded-3xl p-5 sm:min-w-[440px] flex items-center justify-between gap-5 ring-8 ring-emerald-500/20">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg animate-pulse">
                  <PhoneIncoming className="w-6 h-6 animate-bounce" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Kiruvchi Qo'ng'iroq
                </span>
                <h4 className="text-base font-black text-white">{incomingCall.name}</h4>
                <p className="text-xs text-slate-300 font-mono font-bold">{incomingCall.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleAnswerIncomingCall}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" /> Javob berish
              </button>
              <button
                onClick={handleRejectIncomingCall}
                className="px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" /> Rad etish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-2xs">
              <History className="w-5 h-5" />
            </div>
            Qo'ng'iroqlar Tarixi va Ovoz Yozuvlari
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Uztelecom liniyasi orqali amalga oshirilgan barcha kiruvchi va chiquvchi audio muloqotlar</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCalls}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-all shadow-2xs"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 shadow-2xs">
            <span>Jami: {summary.totalCalls || pagination.total} ta qo'ng'iroq</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="p-4 sm:p-6 w-full space-y-4">
        
        {/* SUMMARY METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">Kiruvchi Muloqotlar</p>
              <p className="text-xl font-black text-slate-900">{summary.incoming} <span className="text-xs font-medium text-slate-500">ta</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">Chiquvchi Muloqotlar</p>
              <p className="text-xl font-black text-slate-900">{summary.outgoing} <span className="text-xs font-medium text-slate-500">ta</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">Muloqot Bo'lganlar</p>
              <p className="text-xl font-black text-teal-600">{summary.answered} <span className="text-xs font-medium text-slate-500">ta</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 shrink-0">
              <FileAudio className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">Audio Yozuvi Mavjudlar</p>
              <p className="text-xl font-black text-purple-600">{summary.recorded} <span className="text-xs font-medium text-slate-500">ta yozuv</span></p>
            </div>
          </div>
        </div>

        {/* DATE FILTER & DIRECTION & SEARCH BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
          
          {/* Row 1: Date Range Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-extrabold text-slate-700">Sana oralig'i:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              {[
                { key: 'all', label: 'Barcha vaqt' },
                { key: 'today', label: 'Bugun' },
                { key: 'yesterday', label: 'Kecha' },
                { key: 'week', label: 'Oxirgi 7 kun' },
                { key: 'month', label: 'Bu oy' },
                { key: 'custom', label: 'Kalendar' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setDateRange(tab.key); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    dateRange === tab.key 
                      ? 'bg-blue-600 text-white shadow-2xs font-extrabold' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-bold focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-400 font-bold">—</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Row 2: Direction Filter Pills + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1 shadow-2xs overflow-x-auto custom-scrollbar">
              <button
                onClick={() => { setDirectionFilter('all'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${directionFilter === 'all' ? 'bg-white text-blue-600 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Barchasi ({summary.totalCalls || pagination.total})
              </button>
              <button
                onClick={() => { setDirectionFilter('incoming'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${directionFilter === 'incoming' ? 'bg-white text-blue-600 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Kiruvchi ({summary.incoming})
              </button>
              <button
                onClick={() => { setDirectionFilter('outgoing'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${directionFilter === 'outgoing' ? 'bg-white text-emerald-600 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Chiquvchi ({summary.outgoing})
              </button>
              <button
                onClick={() => { setDirectionFilter('recorded'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${directionFilter === 'recorded' ? 'bg-white text-purple-600 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Audio Record ({summary.recorded})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Raqam, ism yoki lid qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* CALLS TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3.5 whitespace-nowrap">Yo'nalish</th>
                  <th className="py-2 px-3 whitespace-nowrap">Sana & Vaqt</th>
                  <th className="py-2 px-3 whitespace-nowrap">Mijoz Ismi</th>
                  <th className="py-2 px-3 whitespace-nowrap">Lid ID</th>
                  <th className="py-2 px-3 whitespace-nowrap">Telefon</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Davomiyligi</th>
                  <th className="py-2 px-3 whitespace-nowrap">Holat</th>
                  <th className="py-2 px-3.5 text-right whitespace-nowrap min-w-[320px]">Ovoz Yozuvi & Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin shadow-xs" />
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">Qo'ng'iroqlar tarixi yuklanmoqda...</p>
                          <p className="text-[11px] text-slate-400">Serverdan audio yozuvlar va muloqotlar sinxronlanmoqda</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : callLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400 font-medium space-y-1">
                      <History className="w-6 h-6 mx-auto text-slate-300 mb-1.5" />
                      <p className="text-xs font-bold text-slate-600">Qo'ng'iroqlar topilmadi</p>
                    </td>
                  </tr>
                ) : (
                  callLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Direction */}
                      <td className="py-1.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                          {item.direction === 'incoming' ? (
                            <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                              <ArrowDownLeft className="w-3 h-3" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                              <ArrowUpRight className="w-3 h-3" />
                            </div>
                          )}
                          <span className="text-[11px]">{item.direction === 'incoming' ? 'Kiruvchi' : 'Chiquvchi'}</span>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-1.5 px-3 whitespace-nowrap font-mono font-semibold text-slate-500 text-[11px]">
                        {item.date} {item.time}
                      </td>

                      {/* Name */}
                      <td className="py-1.5 px-3 whitespace-nowrap font-extrabold text-blue-600 text-xs">{cleanText(item.name, 'Mijoz')}</td>

                      {/* Lead ID */}
                      <td className="py-1.5 px-3 whitespace-nowrap font-mono font-bold">
                        {item.leadId ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200 text-[10px] shadow-2xs font-extrabold flex items-center w-max gap-1">
                            🎯 Lead #{item.leadId}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md border border-slate-200 text-[10px] font-semibold flex items-center w-max gap-1">
                            ✨ Yangi raqam
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-1.5 px-3 whitespace-nowrap font-mono font-bold text-slate-800 text-xs">{formatPhone(item.phone)}</td>

                      {/* Duration */}
                      <td className="py-1.5 px-3 text-center whitespace-nowrap font-mono font-bold text-slate-700 text-xs">
                        {item.duration || '00:00'}
                      </td>

                      {/* Status */}
                      <td className="py-1.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          (item.status || '').includes('yakunlandi') || (item.status || '').includes('Muvaffaq')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {item.status || 'Bajarildi'}
                        </span>
                      </td>

                      {/* Audio Record & Call Button */}
                      <td className="py-1.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {item.hasRecord && item.audioUrl ? (
                            <CustomAudioPlayer 
                              src={item.audioUrl} 
                              compact={true} 
                              className="min-w-[260px] w-64 sm:w-72" 
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-3">Audio yo'q</span>
                          )}

                          <button
                            onClick={() => handleStartCall(item.phone)}
                            className="w-6.5 h-6.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 flex items-center justify-center shrink-0 transition-all shadow-2xs active:scale-95"
                            title="Qayta qo'ng'iroq qilish"
                          >
                            <PhoneCall className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>Jami: <strong className="text-slate-800 font-bold">{pagination.total}</strong> ta qo'ng'iroq</span>
            <span>·</span>
            <span>Sahifa: <strong className="text-blue-600 font-bold">{pagination.page}</strong> / {pagination.totalPages}</span>
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold flex items-center gap-1 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Oldingi
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                    pagination.page === p
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold flex items-center gap-1 transition-all"
            >
              Keyingi <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Har sahifada:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={10}>10 tadan</option>
              <option value={15}>15 tadan</option>
              <option value={25}>25 tadan</option>
              <option value={50}>50 tadan</option>
            </select>
          </div>
        </div>

      </div>

      {/* FLOATING DIALPAD KEYPAD POPOVER */}
      {softphoneOpen && (
        <div className="fixed bottom-16 left-6 lg:left-72 z-50 bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl p-5 w-80 space-y-4 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Headset className="w-4 h-4 text-blue-600" /> Dialpad (Uztelecom)
            </h3>
            <button
              onClick={() => setSoftphoneOpen(false)}
              className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
            >
              ✕
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              readOnly
              value={dialNumber || 'Raqam kiring...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-center text-lg font-mono font-extrabold text-slate-900 focus:outline-none"
            />
            {dialNumber && (
              <button
                onClick={() => setDialNumber(prev => prev.slice(0, -1))}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 font-bold"
                title="O'chirish"
              >
                ⌫
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { num: '1', sub: '' },
              { num: '2', sub: 'ABC' },
              { num: '3', sub: 'DEF' },
              { num: '4', sub: 'GHI' },
              { num: '5', sub: 'JKL' },
              { num: '6', sub: 'MNO' },
              { num: '7', sub: 'PQRS' },
              { num: '8', sub: 'TUV' },
              { num: '9', sub: 'WXYZ' },
              { num: '*', sub: '' },
              { num: '0', sub: '+' },
              { num: '#', sub: '' }
            ].map((item) => (
              <button
                key={item.num}
                onClick={() => handleDialClick(item.num)}
                className="h-12 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 flex flex-col items-center justify-center active:scale-95 transition-all group"
              >
                <span className="font-extrabold text-base text-slate-800 group-hover:text-blue-600">{item.num}</span>
                {item.sub && <span className="text-[8px] text-slate-400 font-mono -mt-1 font-bold">{item.sub}</span>}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setDialNumber('')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl"
            >
              Tozalash
            </button>

            {inCall ? (
              <button
                onClick={handleEndCall}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <PhoneOff className="w-4 h-4" /> Tugatish
              </button>
            ) : (
              <button
                onClick={() => {
                  setSoftphoneOpen(false);
                  handleStartCall();
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <PhoneCall className="w-4 h-4" /> Qo'ng'iroq
              </button>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM FLOATING DIALING BAR */}
      <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2.5 flex items-center justify-between gap-4 fixed bottom-0 left-0 lg:left-64 right-0 z-30 shadow-lg">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <input
            type="text"
            placeholder="Telefon raqam terish..."
            value={dialNumber}
            onChange={(e) => setDialNumber(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
          <button
            onClick={() => setSoftphoneOpen(!softphoneOpen)}
            className={`p-2 border rounded-xl transition-all ${
              softphoneOpen ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Keypad Grid"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {inCall ? (
          <button
            onClick={handleEndCall}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 active:scale-95 transition-all"
          >
            <PhoneOff className="w-4 h-4" /> Tugatish ({Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')})
          </button>
        ) : (
          <button
            onClick={() => handleStartCall()}
            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all"
          >
            <PhoneCall className="w-4 h-4" /> Qo'ng'iroq (Uztelecom)
          </button>
        )}
      </div>

    </div>
  );
}
