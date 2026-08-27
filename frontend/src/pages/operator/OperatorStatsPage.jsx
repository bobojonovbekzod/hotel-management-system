import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  PhoneCall, 
  CheckCheck, 
  Target, 
  Flame, 
  Layers, 
  CircleDot, 
  Award, 
  Zap, 
  Sparkles, 
  Calendar, 
  Kanban, 
  History, 
  ArrowRight,
  Headset,
  PhoneOff,
  Grid
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { UserAgent, Registerer, Inviter, SessionState } from 'sip.js';
import { SIP_AUDIO_CONSTRAINTS, SIP_SDH_OPTIONS } from '../../lib/sipAudioConfig';

export default function OperatorStatsPage() {
  const [kpiTimePeriod, setKpiTimePeriod] = useState('month'); // 'today', 'week', 'month'
  const [loading, setLoading] = useState(true);

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

  // Stats State
  const [stats, setStats] = useState({
    totalCalls: 0,
    talkTime: '0 daq',
    bookedDeals: 0,
    revenue: 0,
    convRate: '0%',
    noAnswer: 0,
    totalLeads: 0,
    targetRevenue: 25000000,
    targetProgress: 0,
    sourceBreakdown: []
  });

  const [leads, setLeads] = useState([]);

  // Fetch KPI Stats
  const fetchStats = async () => {
    try {
      const res = await api.get('/leads/stats', { params: { period: kpiTimePeriod } });
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads');
      if (res.data?.success) {
        setLeads(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLeads()]);
      setLoading(false);
    };
    load();
  }, [kpiTimePeriod]);

  // Real-time socket
  useEffect(() => {
    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    socket.on('new_lead_received', () => {
      fetchStats();
      fetchLeads();
    });
    socket.on('lead_updated', () => {
      fetchStats();
      fetchLeads();
    });
    return () => socket.disconnect();
  }, []);

  // SIP WebRTC Connection
  useEffect(() => {
    connectSIP();
    return () => disconnectSIP();
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
          invitation.stateChange.addListener((state) => {
            if (state === SessionState.Terminated) {
              setInCall(false);
              activeSessionRef.current = null;
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
      toast.error("SIP ulanishi tayyorlanmoqda...");
      setInCall(true);
      setSoftphoneOpen(true);
      return;
    }
    try {
      const target = UserAgent.makeURI(`sip:${numberToCall}@${sipConfig.sipDomain}`);
      const inviter = new Inviter(userAgentRef.current, target, {
        sessionDescriptionHandlerOptions: SIP_SDH_OPTIONS
      });
      inviter.stateChange.addListener((state) => {
        if (state === SessionState.Established) {
          setInCall(true);
          setSoftphoneOpen(true);
          if (remoteAudioRef.current && inviter.sessionDescriptionHandler) {
            remoteAudioRef.current.srcObject = inviter.sessionDescriptionHandler.remoteMediaStream;
            remoteAudioRef.current.play().catch(e => console.log(e));
          }
        } else if (state === SessionState.Terminated) {
          setInCall(false);
          activeSessionRef.current = null;
        }
      });
      await inviter.invite();
      activeSessionRef.current = inviter;
      setInCall(true);
      setSoftphoneOpen(true);
    } catch (e) {
      toast.error("Qo'ng'iroq amalga oshmadi");
    }
  };

  const handleDialClick = (digit) => {
    if (dialNumber.length < 15) {
      setDialNumber(prev => prev + digit);
    }
  };

  const handleEndCall = () => {
    if (activeSessionRef.current) {
      activeSessionRef.current.dispose();
      activeSessionRef.current = null;
    }
    setInCall(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans pb-16">
      <audio ref={remoteAudioRef} autoPlay />

      {/* TOP HEADER */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            Operator KPI & Statistika
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Sotuvlar, muloqot vaqti va samaradorlik ko'rsatkichlaringizning jonli tahlili</p>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex items-center gap-2.5">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold gap-1 shadow-2xs">
            <button
              onClick={() => setKpiTimePeriod('today')}
              className={`px-4 py-2 rounded-xl transition-all ${kpiTimePeriod === 'today' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Bugun
            </button>
            <button
              onClick={() => setKpiTimePeriod('week')}
              className={`px-4 py-2 rounded-xl transition-all ${kpiTimePeriod === 'week' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Haftalik
            </button>
            <button
              onClick={() => setKpiTimePeriod('month')}
              className={`px-4 py-2 rounded-xl transition-all ${kpiTimePeriod === 'month' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Oylik
            </button>
          </div>

          <div className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 shadow-2xs ${
            sipRegistered ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${sipRegistered ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            Uztelecom: {sipRegistered ? 'Online' : 'Connecting...'}
          </div>
        </div>
      </div>

      {/* MAIN STATS CONTENT */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-16">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin shadow-md" />
            <BarChart3 className="w-5 h-5 text-blue-600 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="text-center space-y-0.5">
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">Statistika va KPI yuklanmoqda...</p>
            <p className="text-xs text-slate-400">Hisobotlar va konversiyalar hisoblanmoqda</p>
          </div>
        </div>
      ) : (
        <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* 4 GLOWING KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-gradient-to-br from-white to-blue-50/50 p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-2 relative overflow-hidden">
            <div className="flex justify-between items-center text-slate-500 text-xs font-extrabold uppercase tracking-wider">
              <span>Jami Qo'ng'iroqlar</span>
              <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                <PhoneCall className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-2">
              <span className="text-4xl font-black text-slate-900 tracking-tight">{stats.totalCalls}</span>
              <span className="text-xs font-bold text-slate-500">ta</span>
            </div>
            <p className="text-[11px] text-blue-600 font-extrabold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Real vaqtda yangilanadi
            </p>
          </div>

          <div className="bg-gradient-to-br from-white to-purple-50/50 p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-2 relative overflow-hidden">
            <div className="flex justify-between items-center text-slate-500 text-xs font-extrabold uppercase tracking-wider">
              <span>Muloqot Vaqti</span>
              <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-2xs">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.talkTime}</span>
            </div>
            <p className="text-[11px] text-purple-600 font-extrabold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Uztelecom PBX Liniyasi
            </p>
          </div>

          <div className="bg-gradient-to-br from-white to-emerald-50/50 p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-2 relative overflow-hidden">
            <div className="flex justify-between items-center text-slate-500 text-xs font-extrabold uppercase tracking-wider">
              <span>Yopilgan Sotuvlar</span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-2xs">
                <CheckCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-2">
              <span className="text-3xl font-black text-emerald-600 tracking-tight">{(stats.revenue || 0).toLocaleString()}</span>
              <span className="text-xs font-bold text-slate-500">so'm</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-extrabold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> {stats.bookedDeals} ta muvaffaqiyatli bitim
            </p>
          </div>

          <div className="bg-gradient-to-br from-white to-amber-50/50 p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-2 relative overflow-hidden">
            <div className="flex justify-between items-center text-slate-500 text-xs font-extrabold uppercase tracking-wider">
              <span>Konversiya (Sotuv %)</span>
              <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-2">
              <span className="text-4xl font-black text-blue-600 tracking-tight">{stats.convRate}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold">
              Ko'tarmaganlar: <strong className="text-slate-800">{stats.noAnswer}</strong> ta
            </p>
          </div>

        </div>

        {/* TARGET & SOURCE BREAKDOWN */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Target card */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" /> Oylik Sotuv Rejasi (Target)
              </h3>
              <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-3 py-1 rounded-xl border border-blue-200">
                {stats.targetProgress}% Bajarildi
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700">Joriy tushum: <strong className="text-emerald-600">{(stats.revenue || 0).toLocaleString()}</strong> so'm</span>
                <span className="text-slate-500">Reja: {(stats.targetRevenue || 25000000).toLocaleString()} so'm</span>
              </div>
              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner border border-slate-200">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-700 shadow-xs" 
                  style={{ width: `${Math.max(4, Math.min(100, stats.targetProgress))}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Source breakdown card */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" /> Lidlar Manbasi Bo'yicha Natija
            </h3>
            <div className="space-y-3 text-xs">
              {stats.sourceBreakdown && stats.sourceBreakdown.length > 0 ? (
                stats.sourceBreakdown.map((src, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-bold text-xs">
                      <span className="text-slate-700 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-pink-500' : idx === 1 ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                        {src.name}
                      </span>
                      <span className="text-slate-900 font-extrabold">{src.count} ta lid ({src.percent}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full ${idx === 0 ? 'bg-gradient-to-r from-pink-500 to-rose-500' : idx === 1 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'} rounded-full`} 
                        style={{ width: `${Math.max(4, src.percent)}%` }} 
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-slate-400 text-xs italic flex items-center gap-2">
                  <CircleDot className="w-4 h-4 text-slate-400" />
                  Manbalar bo'yicha ma'lumotlar to'planmoqda...
                </div>
              )}
            </div>
          </div>

        </div>

        {/* QUICK NAVIGATION ACTION CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Link
            to="/operator/pipeline"
            className="p-5 bg-white hover:bg-blue-50/50 rounded-3xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Kanban className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">Sotuv Voronkasiga O'tish</h4>
                <p className="text-xs text-slate-500">{leads.length} ta faol bitimlar kanban doskasi</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/operator/calls"
            className="p-5 bg-white hover:bg-purple-50/50 rounded-3xl border border-slate-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-purple-600 transition-colors">Qo'ng'iroqlar Tarixiga O'tish</h4>
                <p className="text-xs text-slate-500">Audio yozuvlar va muloqotlar arxivi</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

      </div>
      )}

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
