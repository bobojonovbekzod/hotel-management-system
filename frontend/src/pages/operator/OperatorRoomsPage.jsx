import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  BedDouble, 
  Search, 
  Filter, 
  RefreshCw, 
  User, 
  Phone, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Plus, 
  PhoneCall, 
  PhoneOff, 
  Grid, 
  ChevronDown, 
  MapPin, 
  DollarSign, 
  Layers, 
  Flame, 
  X, 
  Check, 
  Info,
  SlidersHorizontal,
  Home,
  Headset
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { UserAgent, Registerer, Inviter, SessionState } from 'sip.js';
import { SIP_AUDIO_CONSTRAINTS, SIP_SDH_OPTIONS } from '../../lib/sipAudioConfig';

export default function OperatorRoomsPage() {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'available', 'partial', 'occupied', 'cleaning'
  const [typeFilter, setTypeFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Room Modal for Details & Fast Booking
  const [selectedRoomModal, setSelectedRoomModal] = useState(null);

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

  // Fetch branches
  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data?.success) {
        setBranches(res.data.data);
        if (res.data.data.length > 0 && !selectedBranchId) {
          setSelectedBranchId(String(res.data.data[0].id));
        }
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  // Fetch rooms for selected branch (GET request)
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await api.get('/rooms', { params });
      if (res.data?.success) {
        setRooms(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
      toast.error("Xonalar ma'lumotini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId !== undefined) {
      fetchRooms();
    }
  }, [selectedBranchId]);

  // Real-time Socket.io listener for instant updates
  useEffect(() => {
    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    
    socket.on('room_updated', () => fetchRooms());
    socket.on('booking_created', () => fetchRooms());
    socket.on('check_in', () => fetchRooms());
    socket.on('check_out', () => fetchRooms());

    return () => socket.disconnect();
  }, [selectedBranchId]);

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

  const handleStartCall = async (targetPhone = null) => {
    const rawNumber = (targetPhone || dialNumber || '').replace(/\s+/g, '');
    if (!rawNumber) {
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
      const target = UserAgent.makeURI(`sip:${rawNumber}@${sipConfig.sipDomain}`);
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
    } catch (err) {
      toast.error("Qo'ng'iroqni amalga oshirib bo'lmadi");
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

  // Filtered Rooms
  const filteredRooms = rooms.filter(room => {
    if (statusFilter === 'available' && room.computedStatus !== 'available') return false;
    if (statusFilter === 'partial' && room.computedStatus !== 'partial') return false;
    if (statusFilter === 'occupied' && room.computedStatus !== 'occupied') return false;
    if (statusFilter === 'cleaning' && room.status !== 'cleaning') return false;

    if (typeFilter !== 'all' && room.roomType !== typeFilter) return false;
    if (floorFilter !== 'all' && String(room.floor) !== floorFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const num = String(room.roomNumber || '').toLowerCase();
      const type = String(room.roomType || '').toLowerCase();
      return num.includes(q) || type.includes(q);
    }
    return true;
  });

  // Calculate Metrics
  const totalRoomsCount = rooms.length;
  const totalBeds = rooms.reduce((acc, r) => acc + (r.totalBeds || r.capacity || 0), 0);
  const occupiedBeds = rooms.reduce((acc, r) => acc + (r.occupiedBeds || 0), 0);
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  const fullyAvailableRooms = rooms.filter(r => r.computedStatus === 'available').length;
  const partialRooms = rooms.filter(r => r.computedStatus === 'partial').length;
  const fullyOccupiedRooms = rooms.filter(r => r.computedStatus === 'occupied').length;
  const cleaningRooms = rooms.filter(r => r.status === 'cleaning').length;

  const currentBranchObj = branches.find(b => String(b.id) === String(selectedBranchId));

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans pb-16">
      <audio ref={remoteAudioRef} autoPlay />

      {/* TOP HEADER & BRANCH SELECTOR */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        
        {/* Left: Title & Selected Branch */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shadow-2xs">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              Xonalar & Joylar Holati (Real-Vaqt)
            </h1>
            <p className="text-xs text-slate-500">Filialdagi xonalar sig'imi, bo'sh va band kravatlar soni</p>
          </div>
        </div>

        {/* Center: Branch Selector Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300/80 rounded-2xl px-3.5 py-1.5 shadow-xs">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-slate-600">Filial:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-slate-900 font-extrabold text-xs focus:outline-none cursor-pointer pr-2"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchRooms}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-all shadow-2xs"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Right: Quick SIP status badge */}
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 shadow-2xs self-start md:self-auto ${
          sipRegistered ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'
        }`}>
          <span className={`w-2 h-2 rounded-full ${sipRegistered ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          Uztelecom: {sipRegistered ? 'Online' : 'Connecting...'}
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* FILTERS & SEARCH BAR */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Status Filter Pills */}
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold gap-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${statusFilter === 'all' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Barchasi ({totalRoomsCount})
            </button>
            <button
              onClick={() => setStatusFilter('available')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${statusFilter === 'available' ? 'bg-white text-emerald-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
            >
              🟢 Bo'sh ({fullyAvailableRooms})
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${statusFilter === 'partial' ? 'bg-white text-amber-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
            >
              🟡 Joyi borlar ({partialRooms})
            </button>
            <button
              onClick={() => setStatusFilter('occupied')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${statusFilter === 'occupied' ? 'bg-white text-rose-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
            >
              🔴 To'liq band ({fullyOccupiedRooms})
            </button>
            {cleaningRooms > 0 && (
              <button
                onClick={() => setStatusFilter('cleaning')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${statusFilter === 'cleaning' ? 'bg-white text-orange-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                🧹 Tozalanmoqda ({cleaningRooms})
              </button>
            )}
          </div>

          {/* Search Input & Type Filter */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Xona raqami yoki turi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs font-medium"
              />
            </div>
          </div>

        </div>

        {/* ROOMS GRID */}
        {loading ? (
          <div className="py-24 text-center space-y-3 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin shadow-md" />
              <BedDouble className="w-5 h-5 text-blue-600 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">Filial xonalari yuklanmoqda...</p>
              <p className="text-xs text-slate-400">Bandlik va tozalik holatlari tekshirilmoqda</p>
            </div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
            <BedDouble className="w-10 h-10 mx-auto text-slate-300" />
            <h3 className="text-base font-extrabold text-slate-700">Xonalar topilmadi</h3>
            <p className="text-xs text-slate-400">Tanlangan filial yoki filtr bo'yicha hech qanday xona mavjud emas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredRooms.map((room) => {
              const total = room.totalBeds || room.capacity || 1;
              const occupied = room.occupiedBeds || 0;
              const free = room.availableBeds !== undefined ? room.availableBeds : Math.max(0, total - occupied);
              const status = room.computedStatus || room.status;

              const isAvailable = status === 'available';
              const isPartial = status === 'partial';
              const isOccupied = status === 'occupied';
              const isCleaning = room.status === 'cleaning';

              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomModal(room)}
                  className={`bg-white rounded-3xl border p-5 shadow-xs hover:shadow-lg transition-all duration-200 space-y-4 cursor-pointer relative overflow-hidden group ${
                    isAvailable ? 'border-emerald-200 hover:border-emerald-400' :
                    isPartial ? 'border-amber-200 hover:border-amber-400' :
                    isCleaning ? 'border-orange-200 hover:border-orange-400' :
                    'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {/* Top Status Stripe */}
                  <div className={`h-1.5 absolute top-0 left-0 right-0 ${
                    isAvailable ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                    isPartial ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                    isCleaning ? 'bg-gradient-to-r from-orange-400 to-amber-500' :
                    'bg-gradient-to-r from-rose-500 to-pink-500'
                  }`} />

                  {/* Room Number & Floor */}
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          {room.roomNumber}-xona
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200">
                          {room.floor}-qavat
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 capitalize font-medium mt-0.5">
                        {room.roomType ? room.roomType.replace(/_/g, ' ') : 'Standart'}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border shrink-0 ${
                      isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      isPartial ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      isCleaning ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {isAvailable ? '🟢 Bo\'sh' :
                       isPartial ? '🟡 Qisman band' :
                       isCleaning ? '🧹 Tozalanmoqda' :
                       '🔴 To\'liq band'}
                    </span>
                  </div>

                  {/* KRAVATLAR / JOYLAR SIG'IMI (KEY FEATURE) */}
                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                        <BedDouble className="w-3.5 h-3.5 text-blue-500" />
                        Sig'imi: {total} ta joy
                      </span>
                      <span className="font-black text-xs">
                        {free > 0 ? (
                          <strong className="text-emerald-600 font-extrabold">{free} ta bo'sh</strong>
                        ) : (
                          <strong className="text-rose-600 font-extrabold">Bo'sh joy yo'q</strong>
                        )}
                      </span>
                    </div>

                    {/* Visual Beds Indicator Pills */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {Array.from({ length: total }).map((_, idx) => {
                        const isBedOccupied = idx < occupied;
                        return (
                          <div
                            key={idx}
                            className={`flex-1 h-3 rounded-full transition-all ${
                              isBedOccupied
                                ? 'bg-rose-500 shadow-2xs'
                                : 'bg-emerald-400 shadow-2xs'
                            }`}
                            title={isBedOccupied ? `${idx + 1}-kravat band` : `${idx + 1}-kravat bo'sh`}
                          />
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold pt-0.5">
                      <span>Band: <strong className="text-slate-800">{occupied}</strong> ta</span>
                      <span>Bo'sh: <strong className="text-emerald-600">{free}</strong> ta</span>
                    </div>
                  </div>

                  {/* Price & Active Guests Preview */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="font-black text-slate-900">
                      {Number(room.pricePerNight || 0).toLocaleString()} <span className="text-[10px] font-normal text-slate-500">so'm/tun</span>
                    </span>

                    {room.activeGuests && room.activeGuests.length > 0 ? (
                      <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                        <User className="w-3 h-3" /> {room.activeGuests.length} kishi yashayapti
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-600 font-bold">
                        Tayyor xona ✨
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ROOM DETAILS INSPECTOR MODAL */}
      {selectedRoomModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center font-black">
                  {selectedRoomModal.roomNumber}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {selectedRoomModal.roomNumber}-xona ma'lumotlari
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentBranchObj?.name || 'Filial'} · {selectedRoomModal.floor}-qavat
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRoomModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              
              {/* Capacity Breakdown */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <h4 className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">Joylar & Kravatlar Taqsimoti</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <p className="text-slate-400 font-bold text-[10px]">Jami Sig'imi</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">{selectedRoomModal.totalBeds || selectedRoomModal.capacity} ta</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <p className="text-slate-400 font-bold text-[10px]">Band Joylar</p>
                    <p className="text-base font-black text-rose-600 mt-0.5">{selectedRoomModal.occupiedBeds || 0} ta</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <p className="text-slate-400 font-bold text-[10px]">Bo'sh Joylar</p>
                    <p className="text-base font-black text-emerald-600 mt-0.5">{selectedRoomModal.availableBeds || 0} ta</p>
                  </div>
                </div>
              </div>

              {/* Active Guests List */}
              <div className="space-y-2.5">
                <h4 className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  Hozir yashayotgan mehmonlar ({selectedRoomModal.activeGuests?.length || 0})
                </h4>

                {(!selectedRoomModal.activeGuests || selectedRoomModal.activeGuests.length === 0) ? (
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 text-center text-emerald-700 font-bold">
                    Xona to'liq bo'sh, istalgan mijozni joylashtirish mumkin! ✨
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedRoomModal.activeGuests.map((guest, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <p className="font-extrabold text-slate-900">{guest.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{guest.phone || 'Telefon kiritilmagan'}</p>
                        </div>
                        {guest.phone && (
                          <button
                            onClick={() => handleStartCall(guest.phone)}
                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl border border-emerald-200 transition-all"
                            title="Qo'ng'iroq qilish"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl border border-slate-200 font-bold">
                <span className="text-slate-600">Kunlik narxi:</span>
                <span className="text-sm font-black text-emerald-600">
                  {Number(selectedRoomModal.pricePerNight || 0).toLocaleString()} so'm / tun
                </span>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedRoomModal(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-xl transition-all"
              >
                Yopish
              </button>
            </div>

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
