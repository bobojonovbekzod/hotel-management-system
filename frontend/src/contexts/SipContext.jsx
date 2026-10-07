import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserAgent, Registerer, Inviter, SessionState } from 'sip.js';
import { SIP_SDH_OPTIONS } from '../lib/sipAudioConfig';
import { useAuth } from './AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Phone, PhoneIncoming, PhoneOff, PhoneCall, Mic, MicOff, Volume2, X, Minimize2, Maximize2 } from 'lucide-react';

const SipContext = createContext(null);

export function SipProvider({ children }) {
  const { user } = useAuth();
  
  // SIP State
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
  const [incomingCall, setIncomingCall] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioKey, setAudioKey] = useState(Date.now());
  const [activeCallMeta, setActiveCallMeta] = useState(null);

  // Refs
  const userAgentRef = useRef(null);
  const registererRef = useRef(null);
  const activeSessionRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const ringbackAudioContextRef = useRef(null);
  const incomingRingAudioContextRef = useRef(null);
  const incomingRingTimerRef = useRef(null);
  const isAnsweringRef = useRef(false); // double-accept guard



  // 2. Call Timer Effect
  useEffect(() => {
    let interval;
    if (inCall) {
      interval = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [inCall]);

  // 3. Audio Ringtones (Ringback & Incoming Ring)
  const startRingback = () => {
    try {
      if (ringbackAudioContextRef.current) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ringbackAudioContextRef.current = ctx;
      const playTone = () => {
        if (!ringbackAudioContextRef.current) return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        gain.gain.value = 0.05;
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        setTimeout(() => {
          try { osc1.stop(); osc2.stop(); } catch (e) {}
        }, 2000);
      };
      playTone();
      const interval = setInterval(playTone, 6000);
      ringbackAudioContextRef.current._interval = interval;
    } catch (e) {}
  };

  const stopRingback = () => {
    if (ringbackAudioContextRef.current) {
      if (ringbackAudioContextRef.current._interval) clearInterval(ringbackAudioContextRef.current._interval);
      try { ringbackAudioContextRef.current.close(); } catch (e) {}
      ringbackAudioContextRef.current = null;
    }
  };

  const startIncomingRing = () => {
    try {
      if (incomingRingAudioContextRef.current) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      incomingRingAudioContextRef.current = ctx;
      const playChime = () => {
        if (!incomingRingAudioContextRef.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.3); // E5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      };
      playChime();
      incomingRingTimerRef.current = setInterval(playChime, 1500);
    } catch (e) {}
  };

  const stopIncomingRing = () => {
    if (incomingRingTimerRef.current) {
      clearInterval(incomingRingTimerRef.current);
      incomingRingTimerRef.current = null;
    }
    if (incomingRingAudioContextRef.current) {
      try { incomingRingAudioContextRef.current.close(); } catch (e) {}
      incomingRingAudioContextRef.current = null;
    }
  };

  // 4. Robust Audio Stream Attachment for WebRTC
  // AudioContext ref for routing audio when autoplay is blocked
  const audioCtxRef = useRef(null);
  const audioSourceRef = useRef(null);

  const attachRemoteStream = (session) => {
    try {
      const sdh = session?.sessionDescriptionHandler;
      if (!sdh) return;

      const pc = sdh.peerConnection;
      let stream = sdh.remoteMediaStream;

      if (!stream) {
        stream = new MediaStream();
      }

      // Helper: actually wire audio to output
      const wireAudio = (targetStream) => {
        const audioEl = remoteAudioRef.current;
        if (!audioEl) return;
        audioEl.autoplay = true;
        audioEl.muted = false;
        audioEl.volume = 1.0;

        if (audioEl.srcObject !== targetStream) {
          audioEl.srcObject = targetStream;
        }

        const tryPlay = () => {
          audioEl.play()
            .then(() => {})
            .catch(err => {
              // Fallback: route through AudioContext to bypass autoplay policy
              try {
                if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
                  audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = audioCtxRef.current;
                if (ctx.state === 'suspended') ctx.resume();
                if (audioSourceRef.current) {
                  try { audioSourceRef.current.disconnect(); } catch(e) {}
                }
                const source = ctx.createMediaStreamSource(targetStream);
                source.connect(ctx.destination);
                audioSourceRef.current = source;
              } catch (ctxErr) {}
            });
        };

        tryPlay();

        // Re-try when any track unmutes
        targetStream.getAudioTracks().forEach(track => {
          track.enabled = true;
          track.onunmute = () => {
            tryPlay();
          };
        });

        // POLLING FALLBACK: ICE event ko'pincha attachdan oldin o'tib ketadi
        // Shuning uchun har 300ms da muted holatni tekshiramiz
        let pollCount = 0;
        const maxPolls = 50; // 15s max
        const pollTimer = setInterval(() => {
          pollCount++;
          const tracks = targetStream.getAudioTracks();
          const hasMuted = tracks.some(t => t.muted);
          if (!hasMuted && tracks.length > 0) {
            clearInterval(pollTimer);
            tryPlay();
          } else if (pollCount >= maxPolls) {
            clearInterval(pollTimer);
          }
        }, 300);
        // Store timer to clear on cleanup
        targetStream._pollTimer = pollTimer;
      };

      if (pc) {
        const receivers = pc.getReceivers ? pc.getReceivers() : [];

        receivers.forEach(r => {
          if (r.track && r.track.kind === 'audio') {
            r.track.enabled = true;
            if (!stream.getTracks().includes(r.track)) {
              stream.addTrack(r.track);
            }
          }
        });

        // Re-attach when ICE finishes — this is the KEY fix for muted tracks
        const onIceChange = () => {
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            const freshReceivers = pc.getReceivers ? pc.getReceivers() : [];
            freshReceivers.forEach(r => {
              if (r.track && r.track.kind === 'audio') {
                r.track.enabled = true;
                if (!stream.getTracks().includes(r.track)) {
                  stream.addTrack(r.track);
                }
              }
            });
            wireAudio(stream);
          }
        };

        if (pc._sipIceHandler) {
          pc.removeEventListener('iceconnectionstatechange', pc._sipIceHandler);
        }
        pc._sipIceHandler = onIceChange;
        pc.addEventListener('iceconnectionstatechange', onIceChange);

        // Also listen for late-arriving tracks
        const onTrackEvent = (event) => {
          if (event.track && event.track.kind === 'audio') {
            event.track.enabled = true;
            if (!stream.getTracks().includes(event.track)) {
              stream.addTrack(event.track);
            }
            event.track.onunmute = () => {
              wireAudio(stream);
            };
            wireAudio(stream);
          }
        };

        if (pc._sipTrackHandler) {
          pc.removeEventListener('track', pc._sipTrackHandler);
        }
        pc._sipTrackHandler = onTrackEvent;
        pc.addEventListener('track', onTrackEvent);
      }

      // Wire immediately (works if ICE already done)
      wireAudio(stream);

    } catch (err) {}
  };

  const cleanupAudioElement = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    // Disconnect AudioContext source but keep ctx alive (suspend) for next call
    // Closing and re-creating triggers autoplay block on subsequent calls
    if (audioSourceRef.current) {
      try { audioSourceRef.current.disconnect(); } catch(e) {}
      audioSourceRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try { audioCtxRef.current.suspend(); } catch(e) {}
      // Don't close — keep warm for next call to avoid autoplay policy
    }
    setAudioKey(Date.now());
  };

  const stopActiveSessionTracks = (session) => {
    try {
      const sdh = session?.sessionDescriptionHandler;
      if (sdh?.localMediaStream) {
        sdh.localMediaStream.getTracks().forEach(t => {
          try { t.stop(); } catch (e) {}
        });
      }
    } catch (e) {}
  };

  // 5. Connect SIP UserAgent (Global)
  const connectSIP = async () => {
    if (!user) return;
    const allowedRoles = ['operator', 'receptionist', 'reception'];
    const userRole = (user.role || '').toLowerCase();
    if (!allowedRoles.includes(userRole)) return;

    if (userAgentRef.current) {
      if (userAgentRef.current.isConnected && userAgentRef.current.isConnected()) {
        return;
      }
      try { userAgentRef.current.stop(); } catch (e) {}
      userAgentRef.current = null;
    }

    try {
      const targetURI = UserAgent.makeURI(`sip:${sipConfig.sipUser}@${sipConfig.sipDomain}`);
      if (!targetURI) return;

      const ua = new UserAgent({
        uri: targetURI,
        transportOptions: { server: sipConfig.wsServer },
        authorizationUsername: sipConfig.sipUser,
        authorizationPassword: sipConfig.sipPass,
        sessionDescriptionHandlerFactoryOptions: SIP_SDH_OPTIONS,
        logLevel: 'error'
      });

      ua.delegate = {
        async onInvite(invitation) {
          activeSessionRef.current = invitation;
          const callerNum = invitation.remoteIdentity?.uri?.user || '';
          const cleanCaller = callerNum.replace(/\D/g, '');

          let callerName = `Mijoz (+998 ${cleanCaller.slice(-9)})`;
          try {
            const leadsRes = await api.get('/leads');
            if (leadsRes.data?.success && Array.isArray(leadsRes.data.data)) {
              const matched = leadsRes.data.data.find(l => {
                const lPhone = (l.phone || '').replace(/\D/g, '');
                return lPhone && cleanCaller && (lPhone.includes(cleanCaller.slice(-7)) || cleanCaller.includes(lPhone.slice(-7)));
              });
              if (matched && matched.name) {
                callerName = matched.name;
              }
            }
          } catch (e) {}

          setIncomingCall({
            phone: callerNum,
            cleanPhone: cleanCaller,
            name: callerName,
            invitation
          });

          setActiveCallMeta({
            name: callerName,
            phone: callerNum,
            type: 'incoming'
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
              setActiveCallMeta(null);
              if (activeSessionRef.current) {
                stopActiveSessionTracks(activeSessionRef.current);
              }
              activeSessionRef.current = null;
              cleanupAudioElement();
            }
          });
        }
      };

      ua.transport.stateChange.addListener((newState) => {
        if (newState === 'Disconnected') {
          setSipRegistered(false);
        }
      });

      await ua.start();
      userAgentRef.current = ua;

      const reg = new Registerer(ua, { expires: 120 });
      registererRef.current = reg;
      await reg.register();
      setSipRegistered(true);
    } catch (err) {}
  };

  const disconnectSIP = () => {
    if (registererRef.current) {
      try { registererRef.current.unregister(); } catch (e) {}
    }
    if (userAgentRef.current) {
      try { userAgentRef.current.stop(); } catch (e) {}
    }
    userAgentRef.current = null;
    registererRef.current = null;
    setSipRegistered(false);
  };

  useEffect(() => {
    const allowedRoles = ['operator', 'receptionist', 'reception', 'admin', 'owner', 'director'];
    const currentRole = (user?.role || '').toLowerCase();
    if (user && allowedRoles.includes(currentRole)) {
      connectSIP();
    } else {
      disconnectSIP();
    }
  }, [user?.id, user?.role]);

  // 6. Action Handlers
  const answerCall = async () => {
    if (!incomingCall?.invitation) return;
    // Double-click himoyasi: ICE gathering davomida tugma qayta bosilmasin
    if (isAnsweringRef.current) return;
    isAnsweringRef.current = true;
    try {
      stopIncomingRing();
      const inv = incomingCall.invitation;
      activeSessionRef.current = inv;
      // Incoming callni darhol o'chirish — tugma yana bosilmasin
      setIncomingCall(null);

      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.play().catch(() => {});
      }

      await inv.accept({
        sessionDescriptionHandlerOptions: SIP_SDH_OPTIONS
      });

      setInCall(true);
      setSoftphoneOpen(true);
      attachRemoteStream(inv);
      toast.success("Mijoz bilan aloqa o'rnatildi! 🎧");
    } catch (err) {
      if (!err?.message?.includes('Invalid session state')) {
        toast.error("Qo'ng'iroqqa ulanishda xatolik");
      }
    } finally {
      isAnsweringRef.current = false;
    }
  };

  const rejectCall = () => {
    stopIncomingRing();
    if (incomingCall?.invitation) {
      try { incomingCall.invitation.reject(); } catch (e) {}
    }
    setIncomingCall(null);
    setInCall(false);
    setActiveCallMeta(null);
  };

  const makeCall = async (numberToCall, nameToDisplay = null) => {
    if (inCall) {
      toast.error("Hozirda boshqa muloqot davom etmoqda");
      return;
    }
    if (!userAgentRef.current || !sipRegistered) {
      toast.error("SIP ulanishi tayyor emas...");
      return;
    }
    try {
      const cleanNum = (numberToCall || dialNumber).replace(/\D/g, '');
      if (!cleanNum) {
        toast.error("Telefon raqami kiritilmadi");
        return;
      }
      const target = UserAgent.makeURI(`sip:${cleanNum}@${sipConfig.sipDomain}`);
      if (!target) {
        toast.error("SIP Manzil xato");
        return;
      }

      const inviter = new Inviter(userAgentRef.current, target, {
        sessionDescriptionHandlerOptions: SIP_SDH_OPTIONS
      });

      setActiveCallMeta({
        name: nameToDisplay || `Mijoz (+998 ${cleanNum.slice(-9)})`,
        phone: cleanNum,
        type: 'outgoing'
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
          setActiveCallMeta(null);
          if (activeSessionRef.current) {
            stopActiveSessionTracks(activeSessionRef.current);
          }
          activeSessionRef.current = null;
          cleanupAudioElement();
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

  const endCall = () => {
    stopRingback();
    stopIncomingRing();
    if (activeSessionRef.current) {
      try {
        stopActiveSessionTracks(activeSessionRef.current);
        activeSessionRef.current.dispose();
      } catch (e) {}
      activeSessionRef.current = null;
    }
    setInCall(false);
    setActiveCallMeta(null);
    cleanupAudioElement();
  };

  const toggleMute = () => {
    if (!activeSessionRef.current) return;
    const session = activeSessionRef.current;
    const sdh = session.sessionDescriptionHandler;
    if (sdh?.localMediaStream) {
      const audioTracks = sdh.localMediaStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted; // toggle
      });
      setIsMuted(!isMuted);
    }
  };

  const sendDTMF = (digit) => {
    if (inCall && activeSessionRef.current) {
      try {
        const options = { duration: 100, interToneGap: 50 };
        activeSessionRef.current.sessionDescriptionHandler?.sendDtmf(digit, options);
      } catch (e) {}
    } else {
      if (dialNumber.length < 15) {
        setDialNumber(prev => prev + digit);
      }
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SipContext.Provider value={{
      sipRegistered,
      softphoneOpen,
      setSoftphoneOpen,
      dialNumber,
      setDialNumber,
      inCall,
      callTimer,
      incomingCall,
      isMuted,
      activeCallMeta,
      makeCall,
      answerCall,
      rejectCall,
      endCall,
      toggleMute,
      sendDTMF,
      formatTimer
    }}>
      {children}

      {/* Global Audio Player for SIP Calls */}
      <audio key={audioKey} ref={remoteAudioRef} autoPlay playsInline />

      {/* GLOBAL INCOMING CALL FLOATING BANNER (Renders on ALL Pages) */}
      {incomingCall && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-bounce sm:animate-none">
          <div className="bg-slate-900/95 backdrop-blur-xl text-white border-2 border-emerald-500/80 shadow-2xl rounded-3xl p-4 sm:p-5 w-[92vw] sm:w-auto sm:min-w-[440px] flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-5 ring-8 ring-emerald-500/30">
            <div className="flex items-center w-full sm:w-auto justify-start gap-3 sm:gap-4">
              <div className="relative flex items-center justify-center shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg animate-pulse">
                  <PhoneIncoming className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3 sm:h-4 sm:w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 bg-emerald-500"></span>
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-ping" /> Kiruvchi Qo'ng'iroq
                </span>
                <h4 className="text-sm sm:text-base font-black text-white truncate">{incomingCall.name}</h4>
                <p className="text-[11px] sm:text-xs text-slate-300 font-mono font-bold truncate">{incomingCall.phone}</p>
              </div>
            </div>

            <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start gap-2.5">
              <button
                onClick={answerCall}
                className="flex-1 sm:flex-none justify-center px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Phone className="w-4 h-4" /> Javob berish
              </button>
              <button
                onClick={rejectCall}
                className="flex-1 sm:flex-none justify-center px-4 py-2.5 sm:py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" /> Rad etish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL SOFTPHONE DRAWER / MODAL */}
      {softphoneOpen && (
        <div className="fixed bottom-6 right-6 z-[9998] w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-slate-800/80 px-4 py-3 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${sipRegistered ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-xs font-bold text-slate-200">
                {sipRegistered ? 'Uztelecom SIP (1001w)' : 'Ulanish...'}
              </span>
            </div>
            <button
              onClick={() => setSoftphoneOpen(false)}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active Call UI */}
          {inCall ? (
            <div className="p-5 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-pulse">
                <Volume2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">{activeCallMeta?.name || 'Muloqot...'}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{activeCallMeta?.phone || dialNumber}</p>
                <div className="inline-block mt-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-mono font-bold border border-emerald-500/30">
                  {formatTimer(callTimer)}
                </div>
              </div>

              {/* Call Actions */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-2xl border transition-all ${
                    isMuted
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  onClick={endCall}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" /> Tugatish
                </button>
              </div>
            </div>
          ) : (
            /* Dialer UI */
            <div className="p-4 flex flex-col gap-3">
              <input
                type="text"
                value={dialNumber}
                onChange={e => setDialNumber(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2 text-center text-base font-mono font-bold text-white focus:outline-none focus:border-blue-500 tracking-wider"
              />

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2 my-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digit => (
                  <button
                    key={digit}
                    onClick={() => sendDTMF(digit)}
                    className="py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 border border-slate-700/50"
                  >
                    {digit}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => makeCall(dialNumber)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-102 active:scale-98 cursor-pointer"
                >
                  <Phone className="w-4 h-4" /> Telefon qilish
                </button>

                {dialNumber && (
                  <button
                    onClick={() => setDialNumber('')}
                    className="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl text-xs font-bold transition-all"
                  >
                    Tozalash
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </SipContext.Provider>
  );
}

export function useSip() {
  const context = useContext(SipContext);
  if (!context) {
    throw new Error('useSip must be used within a SipProvider');
  }
  return context;
}
