import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Pause, 
  Play, 
  Volume2, 
  UserPlus, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Building2, 
  BedDouble, 
  Plus, 
  Filter, 
  FileText, 
  Headset, 
  Download, 
  Sparkles, 
  User, 
  ChevronRight, 
  History, 
  SlidersHorizontal,
  ArrowRight,
  Kanban,
  Tag,
  MessageSquare,
  Send,
  MoreVertical,
  Check,
  ChevronDown,
  Maximize2,
  Minimize2,
  Star,
  RefreshCw,
  Phone,
  Settings,
  Wifi,
  WifiOff,
  Grid,
  PhoneMissed,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Upload,
  Sliders,
  DollarSign,
  TrendingUp,
  BarChart3,
  Award,
  Target,
  Zap,
  VolumeX,
  Share2,
  MapPin,
  Flame,
  CheckCheck,
  Layers,
  CircleDot
} from 'lucide-react';
import IntegrationsPage from '../admin/IntegrationsPage';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { io } from 'socket.io-client';
import { UserAgent, Registerer, Inviter, SessionState } from 'sip.js';
import { SIP_AUDIO_CONSTRAINTS, SIP_SDH_OPTIONS } from '../../lib/sipAudioConfig';

// Helper to clean dummy strings and format names/phones cleanly
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

const getInitials = (name) => {
  const cleaned = cleanText(name, 'M');
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
};

const formatPhone = (phone) => {
  const cleaned = cleanText(phone, '');
  if (!cleaned || cleaned === '+998') return '+998 (90) 123-45-67';
  return cleaned;
};

const parseLeadDate = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
  if (typeof dateVal === 'string') {
    const directDate = new Date(dateVal);
    if (!isNaN(directDate.getTime())) return directDate;
    if (dateVal.includes('.')) {
      const parts = dateVal.split(/[,\s]+/);
      const dateParts = parts[0].split('.');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        let hours = 0, minutes = 0, seconds = 0;
        if (parts[1]) {
          const timeParts = parts[1].split(':');
          hours = parseInt(timeParts[0] || '0', 10);
          minutes = parseInt(timeParts[1] || '0', 10);
          seconds = parseInt(timeParts[2] || '0', 10);
        }
        const parsed = new Date(year, month, day, hours, minutes, seconds);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
  }
  return null;
};

const formatLeadDate = (dateVal) => {
  const d = parseLeadDate(dateVal);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

const formatLeadTime = (dateVal) => {
  const d = parseLeadDate(dateVal);
  if (!d) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function OperatorDashboardPage() {
  // Main View Tab: 'dashboard' (Statistika + Voronka), 'calls' (History), 'integrations' (API)
  const [activeTab, setActiveTab] = useState('dashboard');
  const [kpiTimePeriod, setKpiTimePeriod] = useState('month'); // 'today', 'week', 'month'
  const [loading, setLoading] = useState(true);

  // Operator System Status
  const [operatorStatus, setOperatorStatus] = useState('online');
  const [searchQuery, setSearchQuery] = useState('');

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState(null);

  // SIP / WebRTC Configuration State
  const getWsServerUrl = () => {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return `wss://${window.location.host}/sip-ws`;
    }
    return 'ws://89.126.208.59:8088/ws';
  };

  const [sipConfig, setSipConfig] = useState({
    wsServer: getWsServerUrl(),
    sipUser: '1001w',
    sipPass: 'aa1001aa',
    sipDomain: '89.126.208.59'
  });

  const [sipRegistered, setSipRegistered] = useState(false);
  const [sipConnecting, setSipConnecting] = useState(false);
  const [showSipSettingsModal, setShowSipSettingsModal] = useState(false);

  // SIP References
  const userAgentRef = useRef(null);
  const registererRef = useRef(null);
  const activeSessionRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const ringbackAudioContextRef = useRef(null);
  const ringbackTimerRef = useRef(null);

  // Softphone Dialpad State
  const [softphoneOpen, setSoftphoneOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [inCall, setInCall] = useState(false);
  const [callTimer, setCallTimer] = useState(0);

  // Incoming Call State
  const [incomingCall, setIncomingCall] = useState(null);

  // Selected Lead for amoCRM 2-Column Detail Modal
  const [activeLeadModal, setActiveLeadModal] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');

  // Fast Lead Creation Modal State
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [targetStageForNewLead, setTargetStageForNewLead] = useState('new');
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    roomType: 'Standard',
    region: 'Toshkent',
    checkIn: '',
    checkOut: '',
    notes: '',
    revenue: 400000
  });

  // Drag & Drop State
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  // 10 BEAUTIFULLY TAILORED STAGES
  const stages = [
    { key: 'new', label: "Yangi lid", color: '#f59e0b', gradient: 'from-amber-500 to-amber-600', badgeBg: 'bg-amber-500 text-white', lightBg: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'no_answer', label: "Ko'tarmadi", color: '#3b82f6', gradient: 'from-blue-500 to-blue-600', badgeBg: 'bg-blue-500 text-white', lightBg: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'info_given', label: "Ma'lumot berildi", color: '#8b5cf6', gradient: 'from-purple-500 to-purple-600', badgeBg: 'bg-purple-500 text-white', lightBg: 'bg-purple-50 text-purple-700 border-purple-200' },
    { key: 'booked', label: "Bron qilindi", color: '#06b6d4', gradient: 'from-cyan-500 to-cyan-600', badgeBg: 'bg-cyan-500 text-white', lightBg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { key: 'sold', label: "Sotuv bo'ldi", color: '#10b981', gradient: 'from-emerald-500 to-emerald-600', badgeBg: 'bg-emerald-500 text-white', lightBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'deferred', label: "Xarid keyinroq", color: '#6366f1', gradient: 'from-indigo-500 to-indigo-600', badgeBg: 'bg-indigo-500 text-white', lightBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { key: 'repeat_sale', label: "Qayta sotuv", color: '#14b8a6', gradient: 'from-teal-500 to-teal-600', badgeBg: 'bg-teal-500 text-white', lightBg: 'bg-teal-50 text-teal-700 border-teal-200' },
    { key: 'rejected', label: "Rad etildi", color: '#f43f5e', gradient: 'from-rose-500 to-rose-600', badgeBg: 'bg-rose-500 text-white', lightBg: 'bg-rose-50 text-rose-700 border-rose-200' },
    { key: 'not_our_cat', label: "Boshqa kategoriya", color: '#64748b', gradient: 'from-slate-500 to-slate-600', badgeBg: 'bg-slate-500 text-white', lightBg: 'bg-slate-50 text-slate-700 border-slate-200' },
    { key: 'expired', label: "Eskirgan lid", color: '#475569', gradient: 'from-zinc-500 to-zinc-600', badgeBg: 'bg-zinc-600 text-white', lightBg: 'bg-zinc-100 text-zinc-700 border-zinc-200' }
  ];

  // Dynamic Leads & Calls Data State
  const [leads, setLeads] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [kpiData, setKpiData] = useState({
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

  // -------------------------------------------------------------
  // DATA FETCHING & REAL-TIME SOCKET CONNECTION
  // -------------------------------------------------------------

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

  const fetchStats = async () => {
    try {
      const res = await api.get('/leads/stats', { params: { period: kpiTimePeriod } });
      if (res.data?.success) {
        setKpiData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchCalls = async () => {
    try {
      const res = await api.get('/leads/calls');
      if (res.data?.success) {
        setCallLogs(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching calls:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchLeads(), fetchStats(), fetchCalls()]);
      setLoading(false);
    };
    loadAll();
  }, [kpiTimePeriod]);

  // Real-time Socket.io listener
  useEffect(() => {
    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    
    socket.on('new_lead_received', (newLead) => {
      setLeads(prev => [newLead, ...prev]);
      fetchStats();
      const displayName = cleanText(newLead.name, 'Yangi Mijoz');
      toast.success(`Yangi Lid keldi: ${displayName} 🎉`, { duration: 5000 });
    });

    socket.on('lead_updated', (updatedData) => {
      setLeads(prev => prev.map(l => (l.dbId === updatedData.dbId || l.id === updatedData.id) ? { ...l, ...updatedData } : l));
      fetchStats();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // -------------------------------------------------------------
  // RINGBACK & SIP WEBRTC CONNECTION
  // -------------------------------------------------------------

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
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.3);
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

  useEffect(() => {
    connectSIP();
    return () => {
      disconnectSIP();
    };
  }, []);

  const connectSIP = async () => {
    setSipConnecting(true);
    try {
      const targetURI = UserAgent.makeURI(`sip:${sipConfig.sipUser}@${sipConfig.sipDomain}`);
      if (!targetURI) return;

      const ua = new UserAgent({
        uri: targetURI,
        transportOptions: {
          server: sipConfig.wsServer
        },
        authorizationUsername: sipConfig.sipUser,
        authorizationPassword: sipConfig.sipPass,
        logLevel: 'error'
      });

      ua.delegate = {
        onInvite(invitation) {
          activeSessionRef.current = invitation;

          const callerNum = invitation.remoteIdentity.uri.user || 'Noma\'lum';
          setIncomingCall({
            phone: callerNum,
            name: `Mijoz (${callerNum})`,
            location: 'Uztelecom Liniyasi',
            previousStays: 0,
            status: "Kiruvchi Qo'ng'iroq",
            invitation: invitation
          });

          invitation.stateChange.addListener((state) => {
            if (state === SessionState.Terminated) {
              setInCall(false);
              setOperatorStatus('online');
              setIncomingCall(null);
              activeSessionRef.current = null;
              toast.error("Qo'ng'iroq yakunlandi");
            }
          });
        }
      };

      await ua.start();
      userAgentRef.current = ua;

      const registerer = new Registerer(ua);
      await registerer.register();
      registererRef.current = registerer;

      setSipRegistered(true);
      setSipConnecting(false);
      toast.success(`SIP Uztelecom Serverga ulandi (1001w@${sipConfig.sipDomain})`, { id: 'sip-connected' });
    } catch (err) {
      console.log('SIP Connection Error:', err);
      setSipRegistered(false);
      setSipConnecting(false);
    }
  };

  const disconnectSIP = () => {
    if (registererRef.current) {
      registererRef.current.unregister();
    }
    if (userAgentRef.current) {
      userAgentRef.current.stop();
    }
    setSipRegistered(false);
  };

  // Call Timer Effect
  useEffect(() => {
    let interval;
    if (inCall) {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [inCall]);

  const getStageTotal = (stageKey) => {
    const filtered = leads.filter(l => l.stage === stageKey);
    const count = filtered.length;
    const sum = filtered.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
    return { count, sum };
  };

  const totalDealsSum = leads.reduce((acc, curr) => acc + (curr.revenue || 0), 0);

  // Drag and Drop Handlers
  const handleDragStart = (e, leadId) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', String(leadId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, stageKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
  };

  const handleDragLeave = (e, stageKey) => {
    e.preventDefault();
    if (dragOverStage === stageKey) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e, stageKey) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      moveLeadStage(leadId, stageKey);
      setDraggedLeadId(null);
    }
  };

  // Move Lead between columns & sync to backend
  const moveLeadStage = async (leadId, newStageKey) => {
    const targetStageObj = stages.find(s => s.key === newStageKey);
    const stageName = targetStageObj ? targetStageObj.label : newStageKey;

    const leadToUpdate = leads.find(l => l.id === leadId || l.dbId === leadId);
    if (!leadToUpdate) return;

    // Optimistic UI update
    setLeads(prev => prev.map(l => {
      if (l.id === leadId || l.dbId === leadId) {
        const newTimeline = [
          { id: Date.now(), type: 'status', text: `Bosqich o'zgartirildi: ${stageName}`, time: 'Hozir' },
          ...(l.timeline || [])
        ];
        const updated = { ...l, stage: newStageKey, timeline: newTimeline };
        if (activeLeadModal && (activeLeadModal.id === leadId || activeLeadModal.dbId === leadId)) {
          setActiveLeadModal(updated);
        }
        return updated;
      }
      return l;
    }));

    try {
      const dbId = leadToUpdate.dbId || leadId;
      await api.patch(`/leads/${dbId}`, { stage: newStageKey });
      fetchStats();
      toast.success(`Lid "${stageName}" bosqichiga o'tkazildi!`);
    } catch (err) {
      console.error('Error updating lead stage:', err);
        toast.error("Bosqichni saqlashda xatolik");
    }
  };

  // Softphone Dialpad Handlers
  const handleDialClick = (digit) => {
    if (dialNumber.length < 15) {
      setDialNumber(prev => prev + digit);
    }
  };

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
      toast.error('Iltimos, telefon raqamini kiriting!');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Mikrofon ruxsati berilmadi!", { duration: 5000 });
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia(SIP_AUDIO_CONSTRAINTS);
    } catch (mErr) {
      toast.error("Mikrofonga ruxsat berilmadi! Iltimos brauzerda mikrofoningizni yoqing.");
      return;
    }

    if (!userAgentRef.current || !sipRegistered) {
      toast.error("Uztelecom SIP ulanishi tayyorlanmoqda...");
      setInCall(true);
      setOperatorStatus('incall');
      setSoftphoneOpen(true);
      return;
    }

    try {
      const target = UserAgent.makeURI(`sip:${numberToCall}@${sipConfig.sipDomain}`);
      if (!target) {
        toast.error("Raqam formati noto'g'ri");
        return;
      }

      const inviter = new Inviter(userAgentRef.current, target, {
        sessionDescriptionHandlerOptions: SIP_SDH_OPTIONS
      });

      startRingback();
      let wasConnected = false;

      inviter.stateChange.addListener(async (state) => {
        if (state === SessionState.Establishing) {
          toast.loading("Gudok ketmoqda...", { id: 'call-status' });
        } else if (state === SessionState.Established) {
          wasConnected = true;
          stopRingback();
          setInCall(true);
          setOperatorStatus('incall');
          setSoftphoneOpen(true);
          toast.success(`Uztelecom muloqoti boshlandi: ${numberToCall}`, { id: 'call-status' });

          if (remoteAudioRef.current && inviter.sessionDescriptionHandler) {
            const mediaStream = inviter.sessionDescriptionHandler.remoteMediaStream;
            remoteAudioRef.current.srcObject = mediaStream;
            remoteAudioRef.current.play().catch(e => console.log('Audio play err:', e));
          }
        } else if (state === SessionState.Terminated) {
          stopRingback();
          setInCall(false);
          setOperatorStatus('online');
          activeSessionRef.current = null;

          if (wasConnected) {
            toast.error("Qo'ng'iroq yakunlandi.", { id: 'call-status' });
          } else {
            toast.error("🔴 Abonent band yoki telefoni o'chirilgan", { id: 'call-status', duration: 4000 });
          }

          // Save call to backend
          try {
            const matchedLead = leads.find(l => l.phone.includes(numberToCall) || numberToCall.includes(l.phone));
            await api.post('/leads/calls', {
              leadId: matchedLead ? matchedLead.dbId : null,
              phone: numberToCall,
              direction: 'outgoing',
              duration: callTimer || (wasConnected ? 15 : 0),
              status: wasConnected ? 'Muloqot yakunlandi' : "Ko'tarmadi / O'chirilgan",
              audioUrl: wasConnected ? `/api/recordings/fetch?phone=${encodeURIComponent(numberToCall)}` : null
            });
            fetchCalls();
            fetchStats();
          } catch (err) {
            console.error('Error saving call log:', err);
          }
        }
      });

      await inviter.invite();
      activeSessionRef.current = inviter;

      setInCall(true);
      setOperatorStatus('incall');
      setSoftphoneOpen(true);
    } catch (err) {
      stopRingback();
      console.log('Outbound call error:', err);
      toast.error("Qo'ng'iroqni amalga oshirib bo'lmadi", { id: 'call-status' });
    }
  };

  const handleEndCall = () => {
    stopRingback();
    if (activeSessionRef.current) {
      activeSessionRef.current.dispose();
      activeSessionRef.current = null;
    }
    setInCall(false);
    setOperatorStatus('online');
    toast.error("Qo'ng'iroq yakunlandi.", { id: 'call-status' });
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !activeLeadModal) return;

    const newTimelineItem = {
      id: Date.now(),
      type: 'note',
      text: newNoteText,
      time: 'Hozir'
    };

    const updatedTimeline = [newTimelineItem, ...(activeLeadModal.timeline || [])];
    const updatedNotes = activeLeadModal.notes ? `${activeLeadModal.notes}\n${newNoteText}` : newNoteText;

    const updatedLead = {
      ...activeLeadModal,
      notes: updatedNotes,
      timeline: updatedTimeline
    };

    setActiveLeadModal(updatedLead);
    setLeads(prev => prev.map(l => (l.id === activeLeadModal.id || l.dbId === activeLeadModal.dbId) ? updatedLead : l));
    setNewNoteText('');

    try {
      const dbId = activeLeadModal.dbId || activeLeadModal.id;
      await api.patch(`/leads/${dbId}`, { notes: updatedNotes });
      toast.success("Izoh muvaffaqiyatli saqlandi!");
    } catch (err) {
      console.error('Error saving note:', err);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLeadForm.name || !newLeadForm.phone) {
      toast.error("Ism va telefon raqami majburiy!");
      return;
    }

    try {
      const res = await api.post('/leads', {
        name: newLeadForm.name,
        phone: newLeadForm.phone,
        region: newLeadForm.region,
        roomType: newLeadForm.roomType,
        checkIn: newLeadForm.checkIn,
        checkOut: newLeadForm.checkOut,
        notes: newLeadForm.notes,
        revenue: newLeadForm.revenue,
        stage: targetStageForNewLead
      });

      if (res.data?.success) {
        setLeads(prev => [res.data.data, ...prev]);
        setShowAddLeadModal(false);
        setNewLeadForm({ name: '', phone: '', roomType: 'Standard', region: 'Toshkent', checkIn: '', checkOut: '', notes: '', revenue: 400000 });
        fetchStats();
        toast.success('Yangi Lid muvaffaqiyatli kiritildi!');
      }
    } catch (err) {
      console.error('Error creating lead:', err);
      toast.error("Lidni yaratishda xatolik");
    }
  };

  const filteredLeads = leads.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const cleanName = cleanText(l.name).toLowerCase();
    const cleanPhone = cleanText(l.phone);
    const cleanNotes = cleanText(l.notes).toLowerCase();
    return cleanName.includes(q) || cleanPhone.includes(q) || cleanNotes.includes(q);
  });

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Hidden Audio Element for WebRTC Stream */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* TOP HEADER BAR */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
        
        {/* Left: View Switcher Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 gap-1 shadow-inner">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/70 scale-100' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-blue-600" /> Statistika & Voronka
            </button>
            <button
              onClick={() => setActiveTab('calls')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'calls' 
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/70 scale-100' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              <History className="w-4 h-4 text-slate-500" /> Qo'ng'iroqlar tarixi
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'integrations' 
                  ? 'bg-white text-purple-600 shadow-sm border border-slate-200/70 scale-100' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              <Share2 className="w-4 h-4 text-purple-600" /> Integratsiyalar API
            </button>
          </div>
        </div>

        {/* Center: Total Deals & Total Revenue Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Jami: <strong className="text-slate-900 font-extrabold">{leads.length}</strong> ta lid</span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-emerald-600 font-extrabold">{totalDealsSum.toLocaleString()}</strong> so'm</span>
          </div>
        </div>

        {/* Right: Actions (SIP Status & + New Deal) */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSipSettingsModal(true)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all shadow-2xs ${
              sipRegistered
                ? 'bg-emerald-50/80 text-emerald-700 border-emerald-300/80 hover:bg-emerald-100'
                : 'bg-amber-50/80 text-amber-700 border-amber-300/80 hover:bg-amber-100'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${sipRegistered ? 'bg-emerald-500 shadow-xs ring-4 ring-emerald-500/20 animate-pulse' : 'bg-amber-500 ring-4 ring-amber-500/20'}`} />
            Uztelecom: {sipRegistered ? '1001w Online' : 'Connecting...'}
          </button>

          <button
            onClick={() => {
              setTargetStageForNewLead('new');
              setShowAddLeadModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Yangi Lid
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {activeTab === 'dashboard' ? (
        <div className="flex-1 p-5 md:p-6 space-y-6 max-w-[1920px] mx-auto w-full">
          
          {/* 1. TOP SECTION: STATISTIKA & KPI DASHBOARD */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-6">
            
            {/* KPI Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600">
                    <Award className="w-4 h-4" />
                  </div>
                  Operator KPI & Statistika
                </h2>
                <p className="text-xs text-slate-500">Muloqotlar davomiyligi, konversiya va sotuv natijalarining jonli tahlili</p>
              </div>

              {/* Time Filter Buttons */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1 shadow-2xs">
                <button
                  onClick={() => setKpiTimePeriod('today')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${kpiTimePeriod === 'today' ? 'bg-white text-blue-600 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Bugun
                </button>
                <button
                  onClick={() => setKpiTimePeriod('week')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${kpiTimePeriod === 'week' ? 'bg-white text-blue-600 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Haftalik
                </button>
                <button
                  onClick={() => setKpiTimePeriod('month')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${kpiTimePeriod === 'month' ? 'bg-white text-blue-600 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Oylik
                </button>
              </div>
            </div>

            {/* 4 GLOWING KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* 1. Calls */}
              <div className="group bg-gradient-to-br from-white to-blue-50/40 p-5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Jami Qo'ng'iroqlar</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{kpiData.totalCalls}</span>
                  <span className="text-xs font-semibold text-slate-500">ta</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-bold">
                  <TrendingUp className="w-3.5 h-3.5" /> Jonli sinxron
                </div>
              </div>

              {/* 2. Talk Time */}
              <div className="group bg-gradient-to-br from-white to-purple-50/40 p-5 rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Muloqot Vaqti</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">{kpiData.talkTime}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-purple-600 font-bold">
                  <Zap className="w-3.5 h-3.5" /> Uztelecom PBX
                </div>
              </div>

              {/* 3. Booked/Sold Revenue */}
              <div className="group bg-gradient-to-br from-white to-emerald-50/40 p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Yopilgan Sotuvlar</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
                    <CheckCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-2xl font-black text-emerald-600 tracking-tight">{(kpiData.revenue || 0).toLocaleString()}</span>
                  <span className="text-xs font-semibold text-slate-500">so'm</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> {kpiData.bookedDeals} ta muvaffaqiyatli bitim
                </div>
              </div>

              {/* 4. Conversion */}
              <div className="group bg-gradient-to-br from-white to-amber-50/40 p-5 rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Konversiya (Sotuv %)</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
                    <Target className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-3xl font-black text-blue-600 tracking-tight">{kpiData.convRate}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                  Ko'tarmaganlar: <strong className="text-slate-800">{kpiData.noAnswer}</strong> ta
                </div>
              </div>

            </div>

            {/* Target Progress & Sources */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
              
              {/* Target progress card */}
              <div className="lg:col-span-6 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-3.5">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" /> Oylik Sotuv Rejasi (Target)
                  </h3>
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs">
                    {kpiData.targetProgress}% Bajarildi
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">Joriy: <strong className="text-emerald-600">{(kpiData.revenue || 0).toLocaleString()}</strong> so'm</span>
                    <span className="text-slate-500">Reja: {(kpiData.targetRevenue || 25000000).toLocaleString()} so'm</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200/90 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-700 shadow-xs" 
                      style={{ width: `${Math.max(4, Math.min(100, kpiData.targetProgress))}%` }} 
                    />
                  </div>
                </div>
              </div>

              {/* Source breakdown card */}
              <div className="lg:col-span-6 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" /> Lidlar Manbasi Bo'yicha Natija
                </h3>
                <div className="space-y-2.5 text-xs">
                  {kpiData.sourceBreakdown && kpiData.sourceBreakdown.length > 0 ? (
                    kpiData.sourceBreakdown.map((src, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between font-bold text-xs">
                          <span className="text-slate-700 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-pink-500' : idx === 1 ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                            {src.name}
                          </span>
                          <span className="text-slate-900 font-extrabold">{src.count} ta lid ({src.percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${idx === 0 ? 'bg-gradient-to-r from-pink-500 to-rose-500' : idx === 1 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'} rounded-full`} 
                            style={{ width: `${Math.max(3, src.percent)}%` }} 
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-2 text-slate-400 text-xs italic flex items-center gap-2">
                      <CircleDot className="w-4 h-4 text-slate-400" />
                      Manbalar bo'yicha ma'lumotlar to'planmoqda...
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* 2. BOTTOM SECTION: VORONKA (10-STAGE KANBAN PIPELINE) */}
          <div className="space-y-3.5">
            
            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Kanban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    Sotuv Voronkasi (CRM Pipeline)
                    <span className="text-[11px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-lg border border-slate-200">10 bosqich</span>
                  </h3>
                  <p className="text-xs text-slate-500">Lidlarni bosqichlar orasida surish (drag & drop) orqali boshqaring</p>
                </div>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Lidlarni qidirish (ism, telefon)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50/90 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs font-medium"
                />
              </div>
            </div>

            {/* KANBAN BOARD SCROLL CONTAINER */}
            <div className="w-full overflow-x-auto custom-scrollbar bg-[#e9eef3] rounded-3xl border border-slate-300/80 p-3.5 shadow-inner">
              <div className="flex gap-3.5 items-start min-w-max pb-2">
                {stages.map((stage) => {
                  const { count, sum } = getStageTotal(stage.key);
                  const stageLeads = filteredLeads.filter(l => l.stage === stage.key);
                  const isTargetDropZone = dragOverStage === stage.key;

                  return (
                    <div 
                      key={stage.key} 
                      onDragOver={(e) => handleDragOver(e, stage.key)}
                      onDragLeave={(e) => handleDragLeave(e, stage.key)}
                      onDrop={(e) => handleDrop(e, stage.key)}
                      className={`w-[305px] shrink-0 rounded-2xl border transition-all duration-200 flex flex-col max-h-[78vh] ${
                        isTargetDropZone
                          ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-400 shadow-xl scale-[1.01]'
                          : 'bg-[#dfe6ed] border-slate-300/70 shadow-xs'
                      }`}
                    >
                      {/* Column Header */}
                      <div className="p-3.5 border-b border-slate-200 space-y-2 rounded-t-2xl relative overflow-hidden bg-white shadow-2xs">
                        <div className={`h-1.5 absolute top-0 left-0 right-0 bg-gradient-to-r ${stage.gradient}`} />
                        
                        <div className="flex items-center justify-between pt-1">
                          <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 truncate max-w-[190px]">
                            {stage.label}
                          </h3>
                          <span className={`px-2.5 py-0.5 text-white font-extrabold text-[11px] rounded-full shadow-xs ${stage.badgeBg}`}>
                            {count}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                          <span>{count} lid · <strong className="text-slate-800 font-bold">{sum.toLocaleString()}</strong> so'm</span>
                        </div>

                        <button
                          onClick={() => {
                            setTargetStageForNewLead(stage.key);
                            setShowAddLeadModal(true);
                          }}
                          className="w-full py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-xl text-xs font-bold border border-slate-200 hover:border-blue-200 transition-all flex items-center justify-center gap-1.5 mt-1 shadow-2xs active:scale-98"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Tezkor qo'shish
                        </button>
                      </div>

                      {/* Lead Cards Container */}
                      <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar min-h-[420px]">
                        {stageLeads.length === 0 ? (
                          <div className="h-36 border border-dashed border-slate-300/80 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs font-medium gap-1.5">
                            <span className="text-base">📭</span>
                            <span>Lidlar yo'q</span>
                          </div>
                        ) : (
                          stageLeads.map((lead) => {
                            const isBeingDragged = draggedLeadId === lead.id || draggedLeadId === lead.dbId;
                            const displayName = cleanText(lead.name, 'Yangi Mijoz');
                            const displayPhone = formatPhone(lead.phone);
                            const displayRegion = cleanText(lead.region, 'Toshkent');
                            const initials = getInitials(displayName);
                            const isInstagram = (lead.source || '').toLowerCase().includes('insta');

                            return (
                              <div
                                key={lead.id || lead.dbId}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, lead.id || lead.dbId)}
                                onDragEnd={() => { setDraggedLeadId(null); setDragOverStage(null); }}
                                onClick={() => setActiveLeadModal(lead)}
                                className={`bg-white hover:bg-slate-50/90 border rounded-2xl p-3.5 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all space-y-2.5 group relative ${
                                  isBeingDragged 
                                    ? 'opacity-30 border-dashed border-blue-500 scale-95 shadow-none' 
                                    : 'border-slate-200/90 hover:border-blue-300'
                                }`}
                              >
                                {/* Left Color Accent Strip */}
                                <div 
                                  className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" 
                                  style={{ backgroundColor: stage.color }} 
                                />

                                {/* Row 1: Avatar + Name + Lead ID */}
                                <div className="flex items-center justify-between gap-2 pl-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                                      {initials}
                                    </div>
                                    <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-blue-600 transition-colors truncate">
                                      {displayName}
                                    </h4>
                                  </div>
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono font-bold text-[10px] rounded-md border border-blue-200/80 shrink-0">
                                    {lead.id}
                                  </span>
                                </div>

                                {/* Row 2: Dedicated Date & Time Bar (100% Visible) */}
                                <div className="ml-1.5 flex items-center justify-between text-[11px] text-slate-700 bg-slate-50 border border-slate-200/90 px-2.5 py-1.5 rounded-xl font-mono font-bold shadow-2xs">
                                  <div className="flex items-center gap-1.5 text-slate-800">
                                    <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span>{formatLeadDate(lead.createdAt) || 'Bugun'}</span>
                                  </div>
                                  {formatLeadTime(lead.createdAt) && (
                                    <div className="flex items-center gap-1 text-slate-500 font-medium">
                                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{formatLeadTime(lead.createdAt)}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Row 3: Phone + Call Action */}
                                <div className="pl-1.5 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono font-bold bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg flex-1 mr-2 min-w-0">
                                    <Phone className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span className="truncate">{displayPhone}</span>
                                  </div>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartCall(lead.phone);
                                    }}
                                    className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 flex items-center justify-center transition-all shadow-2xs active:scale-90 shrink-0"
                                    title="Qo'ng'iroq qilish"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Row 4: Tags */}
                                <div className="pl-1.5 flex flex-wrap items-center gap-1.5 pt-0.5">
                                  {isInstagram ? (
                                    <span className="px-2 py-0.5 bg-gradient-to-r from-pink-50 to-rose-50 text-rose-600 font-bold text-[10px] rounded-md border border-rose-200/80 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                      Instagram Ads
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-medium text-[10px] rounded-md border border-slate-200">
                                      {lead.source || "Qo'lda kiritildi"}
                                    </span>
                                  )}

                                  {displayRegion && (
                                    <span className="px-2 py-0.5 bg-slate-50 text-slate-600 font-semibold text-[10px] rounded-md border border-slate-200 flex items-center gap-1">
                                      <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                      {displayRegion}
                                    </span>
                                  )}
                                </div>

                                {/* Revenue & Quick Stage Select */}
                                <div className="pl-1.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                  <span className="font-extrabold text-emerald-600 text-xs">
                                    {lead.revenue > 0 ? `${Number(lead.revenue).toLocaleString()} so'm` : '0 so\'m'}
                                  </span>

                                  <select
                                    value={lead.stage}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => moveLeadStage(lead.id || lead.dbId, e.target.value)}
                                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] focus:outline-none focus:border-blue-500 font-bold transition-colors cursor-pointer"
                                  >
                                    {stages.map(s => (
                                      <option key={s.key} value={s.key}>{s.label}</option>
                                    ))}
                                  </select>
                                </div>

                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      ) : activeTab === 'calls' ? (
        /* CALL HISTORY TABLE WITH INLINE PLAYABLE RECORDINGS */
        <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" /> Qo'ng'iroqlar Tarixi va Ovoz Yozuvlari
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Uztelecom liniyasi orqali amalga oshirilgan barcha audio muloqotlar</p>
              </div>
              <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-200">
                {callLogs.length} ta yozuv
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-5">Yo'nalish & Sana</th>
                    <th className="py-3 px-4">Mijoz Ismi</th>
                    <th className="py-3 px-4">Lid ID</th>
                    <th className="py-3 px-4">Telefon</th>
                    <th className="py-3 px-4 text-center">Davomiyligi</th>
                    <th className="py-3 px-5 text-right">Ovoz Yozuvi (Record)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {callLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">Hozircha qo'ng'iroqlar tarixi mavjud emas</td>
                    </tr>
                  ) : (
                    callLogs.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 flex items-center gap-3 font-semibold">
                          {item.direction === 'incoming' ? (
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                              <ArrowDownLeft className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                              <ArrowUpRight className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{cleanText(item.typeText, 'Muloqot')}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{item.date} · {item.time}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-600">{cleanText(item.name, 'Mijoz')}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{item.leadName}</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">{formatPhone(item.phone)}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-600">{item.duration}</td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.hasRecord && item.audioUrl ? (
                              <audio controls className="h-8 w-48 rounded-lg shadow-2xs" src={item.audioUrl} />
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Yozuv yo'q</span>
                            )}
                            <button
                              onClick={() => handleStartCall(item.phone)}
                              className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 flex items-center justify-center shrink-0 transition-all shadow-2xs"
                              title="Qayta qo'ng'iroq"
                            >
                              <PhoneCall className="w-4 h-4" />
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
        </div>
      ) : (
        /* INTEGRATIONS PAGE */
        <div className="flex-1 w-full p-6 max-w-7xl mx-auto">
          <IntegrationsPage />
        </div>
      )}

      {/* FLOATING DIALPAD KEYPAD POPOVER */}
      {softphoneOpen && (
        <div className="fixed bottom-20 left-6 z-50 bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl p-5 w-80 space-y-4 animate-in fade-in slide-in-from-bottom-5">
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
      <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2.5 flex items-center justify-between gap-4 sticky bottom-0 z-30 shadow-lg">
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

      {/* amoCRM SIGNATURE 2-COLUMN LEAD DETAIL DRAWER MODAL */}
      {activeLeadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header Bar */}
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  {getInitials(activeLeadModal.name)}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    {cleanText(activeLeadModal.name, 'Yangi Mijoz')}
                    <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {activeLeadModal.id}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 font-mono font-semibold">{formatPhone(activeLeadModal.phone)}</p>
                </div>
              </div>

              {/* 10-Stage Switcher Controls in Modal */}
              <div className="flex items-center gap-2">
                <select
                  value={activeLeadModal.stage}
                  onChange={(e) => moveLeadStage(activeLeadModal.id || activeLeadModal.dbId, e.target.value)}
                  className="bg-white text-blue-700 font-bold border border-blue-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none shadow-2xs"
                >
                  {stages.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>

                <button
                  onClick={() => setActiveLeadModal(null)}
                  className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 2-COLUMN BODY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
              
              {/* LEFT COLUMN: LEAD ATTRIBUTES & CONTACT */}
              <div className="lg:col-span-5 p-6 border-r border-slate-200 space-y-5 overflow-y-auto bg-slate-50/60">
                
                {/* Call card */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Telefon Raqami</p>
                    <p className="text-base font-extrabold text-emerald-600 font-mono mt-0.5">{formatPhone(activeLeadModal.phone)}</p>
                  </div>
                  <button
                    onClick={() => handleStartCall(activeLeadModal.phone)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <PhoneCall className="w-4 h-4" /> Chaqirish
                  </button>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
                  <h4 className="font-extrabold text-slate-400 uppercase tracking-wider text-[11px]">Bitim Ma'lumotlari</h4>
                  
                  <div className="flex justify-between py-2 border-b border-slate-100 font-semibold">
                    <span className="text-slate-500">Qo'shilgan sana:</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-blue-600" />
                      {formatLeadDate(activeLeadModal.createdAt) || 'Bugun'} {formatLeadTime(activeLeadModal.createdAt)}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-100 font-semibold">
                    <span className="text-slate-500">Bosqich (Stage):</span>
                    <span className="font-bold text-blue-600">
                      {stages.find(s => s.key === activeLeadModal.stage)?.label || activeLeadModal.stage}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-100 font-semibold">
                    <span className="text-slate-500">Manba:</span>
                    <span className="font-bold text-slate-800">{activeLeadModal.source || 'Instagram Ads'}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-100 font-semibold">
                    <span className="text-slate-500">Viloyat / Filial:</span>
                    <span className="font-bold text-slate-800">{cleanText(activeLeadModal.region, 'Toshkent')}</span>
                  </div>

                  <div className="flex justify-between py-2 font-semibold">
                    <span className="text-slate-500">Taxminiy Summa:</span>
                    <span className="font-extrabold text-emerald-600">{Number(activeLeadModal.revenue || 0).toLocaleString()} so'm</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Talab va Izohlar</h4>
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs text-slate-700 font-medium whitespace-pre-line shadow-2xs">
                    {cleanText(activeLeadModal.notes, "Izoh mavjud emas")}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: TIMELINE & RECORDINGS */}
              <div className="lg:col-span-7 flex flex-col h-full bg-white">
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Muloqot Tarixi & Audio Yozuvlar</h4>
                  
                  {(activeLeadModal.timeline || []).length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-1">
                      <MessageSquare className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                      <p>Hozircha izoh yoki qo'ng'iroqlar tarixi yo'q</p>
                      <p className="text-[11px] text-slate-400">Pastdagi maydondan yangi izoh yozishingiz mumkin</p>
                    </div>
                  ) : (
                    activeLeadModal.timeline.map((item) => (
                      <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 shadow-2xs">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-blue-600 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-blue-500" />
                            {item.text}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-semibold">{item.time}</span>
                        </div>
                        {item.audioUrl && (
                          <div className="pt-2">
                            <audio controls className="w-full h-8 rounded-lg" src={item.audioUrl} />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddNote} className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="Mijoz haqida yangi izoh yozing..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium shadow-2xs"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Send className="w-4 h-4" /> Saqlash
                  </button>
                </form>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* CREATE NEW LEAD MODAL */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Yangi Lid Kiritish</h3>
              <button onClick={() => setShowAddLeadModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-bold">Mijoz Ismi *</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Sardor Rustamov"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold">Telefon Raqami *</label>
                <input
                  type="text"
                  required
                  placeholder="+998 90 123 45 67"
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold">Qaysi Bosqichga Tushsin?</label>
                <select
                  value={targetStageForNewLead}
                  onChange={(e) => setTargetStageForNewLead(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-colors cursor-pointer"
                >
                  {stages.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold">Izoh</label>
                <textarea
                  rows="3"
                  placeholder="Mijoz qiziqishi haqida qo'shimcha ma'lumot..."
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Lidni Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
