import React, { useState, useEffect, useRef } from 'react';
import { 
  Kanban, 
  Plus, 
  Search, 
  Phone, 
  PhoneCall, 
  PhoneIncoming,
  Clock, 
  Calendar,
  MapPin, 
  Send, 
  MessageSquare, 
  Grid, 
  PhoneOff, 
  Headset, 
  RefreshCw,
  Sparkles,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { io } from 'socket.io-client';
import { UserAgent, Registerer, Inviter, SessionState } from 'sip.js';
import { SIP_AUDIO_CONSTRAINTS, SIP_SDH_OPTIONS } from '../../lib/sipAudioConfig';
import CustomAudioPlayer from '../../components/common/CustomAudioPlayer';

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

export default function OperatorPipelinePage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Lead for amoCRM 2-Column Detail Modal
  const [activeLeadModal, setActiveLeadModal] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [modalRecordings, setModalRecordings] = useState([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);

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

  // 10 STAGES
  const stages = [
    { key: 'new', label: "Yangi lid", color: '#f59e0b', gradient: 'from-amber-500 to-amber-600', badgeBg: 'bg-amber-500 text-white' },
    { key: 'no_answer', label: "Ko'tarmadi", color: '#3b82f6', gradient: 'from-blue-500 to-blue-600', badgeBg: 'bg-blue-500 text-white' },
    { key: 'info_given', label: "Ma'lumot berildi", color: '#8b5cf6', gradient: 'from-purple-500 to-purple-600', badgeBg: 'bg-purple-500 text-white' },
    { key: 'booked', label: "Bron qilindi", color: '#06b6d4', gradient: 'from-cyan-500 to-cyan-600', badgeBg: 'bg-cyan-500 text-white' },
    { key: 'sold', label: "Sotuv bo'ldi", color: '#10b981', gradient: 'from-emerald-500 to-emerald-600', badgeBg: 'bg-emerald-500 text-white' },
    { key: 'deferred', label: "Xarid keyinroq", color: '#6366f1', gradient: 'from-indigo-500 to-indigo-600', badgeBg: 'bg-indigo-500 text-white' },
    { key: 'repeat_sale', label: "Qayta sotuv", color: '#14b8a6', gradient: 'from-teal-500 to-teal-600', badgeBg: 'bg-teal-500 text-white' },
    { key: 'rejected', label: "Rad etildi", color: '#f43f5e', gradient: 'from-rose-500 to-rose-600', badgeBg: 'bg-rose-500 text-white' },
    { key: 'not_our_cat', label: "Boshqa kategoriya", color: '#64748b', gradient: 'from-slate-500 to-slate-600', badgeBg: 'bg-slate-500 text-white' },
    { key: 'expired', label: "Eskirgan lid", color: '#475569', gradient: 'from-zinc-500 to-zinc-600', badgeBg: 'bg-zinc-600 text-white' }
  ];

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leads');
      if (res.data?.success) {
        setLeads(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Real-time Socket.io listener
  useEffect(() => {
    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    socket.on('new_lead_received', (newLead) => {
      setLeads(prev => [newLead, ...prev]);
      const displayName = cleanText(newLead.name, 'Yangi Mijoz');
      toast.success(`Yangi Lid keldi: ${displayName} 🎉`, { duration: 5000 });
    });
    socket.on('lead_updated', (updatedData) => {
      setLeads(prev => prev.map(l => (l.dbId === updatedData.dbId || l.id === updatedData.id) ? { ...l, ...updatedData } : l));
    });
    return () => socket.disconnect();
  }, []);

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

  const leadsRef = useRef(leads);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

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

          // Match with CRM Lead dynamically from leadsRef
          const matchedLead = (leadsRef.current || []).find(l => {
            const lPhone = (l.phone || '').replace(/\D/g, '');
            return lPhone && cleanCaller && (lPhone.includes(cleanCaller.slice(-7)) || cleanCaller.includes(lPhone.slice(-7)));
          });

          const callerName = matchedLead ? matchedLead.name : `Mijoz (+998 ${cleanCaller.slice(-9)})`;

          setIncomingCall({
            phone: callerNum,
            cleanPhone: cleanCaller,
            name: callerName,
            lead: matchedLead,
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
      console.log('SIP Connection Error:', err);
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

  const moveLeadStage = async (leadId, newStageKey) => {
    const targetStageObj = stages.find(s => s.key === newStageKey);
    const stageName = targetStageObj ? targetStageObj.label : newStageKey;

    const leadToUpdate = leads.find(l => l.id === leadId || l.dbId === leadId);
    if (!leadToUpdate) return;

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
      toast.success(`Lid "${stageName}" bosqichiga o'tkazildi!`);
    } catch (err) {
      console.error('Error updating lead stage:', err);
      toast.error("Bosqichni saqlashda xatolik");
    }
  };

  // Fetch all audio recordings for active lead modal
  useEffect(() => {
    if (activeLeadModal && activeLeadModal.phone) {
      setLoadingRecordings(true);
      const cleanPhone = activeLeadModal.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 7) {
        api.get(`/recordings/list?phone=${encodeURIComponent(cleanPhone)}`)
          .then(res => {
            if (res.data?.success && Array.isArray(res.data.data)) {
              setModalRecordings(res.data.data);
            } else {
              setModalRecordings([]);
            }
          })
          .catch(err => {
            console.log('Error fetching recordings:', err);
            setModalRecordings([]);
          })
          .finally(() => setLoadingRecordings(false));
      } else {
        setModalRecordings([]);
        setLoadingRecordings(false);
      }
    } else {
      setModalRecordings([]);
    }
  }, [activeLeadModal?.phone, activeLeadModal?.id]);

  const cleanPhoneForDial = (phone) => {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('998') && digits.length === 12) {
      return digits.slice(3); // e.g. 942669997
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

      inviter.stateChange.addListener((state) => {
        if (state === SessionState.Established) {
          stopRingback();
          setInCall(true);
          setSoftphoneOpen(true);
          attachRemoteStream(inviter);
        } else if (state === SessionState.Terminated) {
          stopRingback();
          setInCall(false);
          activeSessionRef.current = null;
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
      toast.success("Izoh saqlandi!");
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
        toast.success('Yangi Lid kiritildi!');
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
    <div className="h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans overflow-hidden pb-14">
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
                <Phone className="w-4 h-4" /> Javob berish
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
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-xs z-30">
        
        {/* Left: Title & Summary */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-2xs">
            <Kanban className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
              Sotuv Voronkasi (CRM Pipeline)
              <span className="text-[11px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-lg border border-slate-200">10 bosqich</span>
            </h1>
            <p className="text-[11px] text-slate-500">Lidlarni bosqichlar orasida surish (drag & drop) orqali boshqaring</p>
          </div>
        </div>

        {/* Center: Total Deals & Total Revenue */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Jami: <strong className="text-slate-900 font-extrabold">{leads.length}</strong> ta lid</span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-emerald-600 font-extrabold">{totalDealsSum.toLocaleString()}</strong> so'm</span>
          </div>
        </div>

        {/* Right: Search & + New Lead */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Qidirish (ism, telefon)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs font-medium"
            />
          </div>

          <button
            onClick={() => {
              setTargetStageForNewLead('new');
              setShowAddLeadModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Yangi Lid
          </button>
        </div>
      </div>

      {/* KANBAN BOARD SCROLL CONTAINER - FULL HEIGHT TO FOOTER */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin shadow-md" />
            <Kanban className="w-5 h-5 text-blue-600 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="text-center space-y-0.5">
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">Sotuv Voronkasi yuklanmoqda...</p>
            <p className="text-xs text-slate-400">Lidlar, bosqichlar va audio ma'lumotlar olinmoqda</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4 overflow-x-auto custom-scrollbar flex items-stretch">
          <div className="flex gap-4 items-stretch min-w-max h-full pb-1">
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
                className={`w-[315px] shrink-0 rounded-3xl border transition-all duration-200 flex flex-col h-full ${
                  isTargetDropZone
                    ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-400 shadow-xl scale-[1.01]'
                    : 'bg-[#dfe6ed]/90 border-slate-300/80 shadow-xs'
                }`}
              >
                {/* Column Header - compact & non-shrinking */}
                <div className="p-3.5 border-b border-slate-200 space-y-1.5 rounded-t-3xl relative overflow-hidden bg-white shadow-2xs shrink-0">
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
                    className="w-full py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-xl text-xs font-bold border border-slate-200 hover:border-blue-200 transition-all flex items-center justify-center gap-1.5 mt-0.5 shadow-2xs active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Tezkor qo'shish
                  </button>
                </div>

                {/* Lead Cards Container - expands full height to footer with smooth scroll */}
                <div className="p-3 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar min-h-0">
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
                          className={`bg-white hover:bg-slate-50/90 border rounded-2xl p-4 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all space-y-2.5 group relative ${
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
                              <span>{formatLeadDate(lead.rawCreatedAt || lead.createdAt) || 'Bugun'}</span>
                            </div>
                            {formatLeadTime(lead.rawCreatedAt || lead.createdAt) && (
                              <div className="flex items-center gap-1 text-slate-500 font-medium">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{formatLeadTime(lead.rawCreatedAt || lead.createdAt)}</span>
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
      )}

      {/* amoCRM SIGNATURE 2-COLUMN LEAD DETAIL MODAL */}
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
                      {formatLeadDate(activeLeadModal.rawCreatedAt || activeLeadModal.createdAt) || 'Bugun'} {formatLeadTime(activeLeadModal.rawCreatedAt || activeLeadModal.createdAt)}
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
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Headset className="w-4 h-4 text-blue-600" />
                      Mijoz Bilan Barcha Suhbatlar & Ovoz Yozuvlari
                    </h4>
                    <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-lg border border-blue-200">
                      {modalRecordings.length} ta suhbat
                    </span>
                  </div>

                  {/* ALL AUDIO RECORDINGS LIST */}
                  {loadingRecordings ? (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 font-bold flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" /> Audio yozuvlar yuklanmoqda...
                    </div>
                  ) : modalRecordings.length > 0 ? (
                    <div className="space-y-3">
                      {modalRecordings.map((rec, idx) => {
                        // Extract date & time from filename out-YYYYMMDD-HHMMSS-...
                        const match = rec.filename.match(/out-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
                        const formattedDate = match ? `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}` : rec.filename;
                        
                        return (
                          <div key={idx} className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 rounded-2xl border border-blue-200/80 space-y-2.5 shadow-xs">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-extrabold text-slate-900 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                                  #{modalRecordings.length - idx}
                                </span>
                                Suhbat yozuvi
                              </span>
                              <span className="text-[11px] font-mono font-bold text-slate-500 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                📅 {formattedDate}
                              </span>
                            </div>

                            <CustomAudioPlayer src={rec.url} className="w-full" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                      Hozircha ushbu mijoz bilan audio yozuv mavjud emas
                    </div>
                  )}

                  {/* TIMELINE & OPERATOR NOTES */}
                  <div className="pt-2 space-y-3">
                    <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Izohlar va O'zgarishlar Tarixi</h5>
                    {(activeLeadModal.timeline || []).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">Hozircha qo'shimcha izohlar yo'q</p>
                    ) : (
                      activeLeadModal.timeline.map((item) => (
                        <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                            {item.text}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>
                        </div>
                      ))
                    )}
                  </div>
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
