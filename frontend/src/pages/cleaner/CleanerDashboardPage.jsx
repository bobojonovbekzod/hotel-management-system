import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Camera, CheckCircle2, X, RefreshCw, Briefcase, MapPin, Sparkles, Building, Map, LogOut } from 'lucide-react';

export default function CleanerDashboardPage() {
  const { user, logout } = useAuth();
  const [activeTask, setActiveTask] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(user?.branchId || '');
  
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraAction, setCameraAction] = useState(null); // 'checkin', 'checkout', 'start_room', 'start_corridor', 'start_street', 'finish'
  const [targetRoomId, setTargetRoomId] = useState(null);
  const [targetTaskId, setTargetTaskId] = useState(null);
  
  const [attendanceStatus, setAttendanceStatus] = useState('none'); // 'none' | 'checked_in' | 'checked_out'
  const [pendingData, setPendingData] = useState({ pendingTasks: [], dirtyRooms: [] });
  const [showRoomsModal, setShowRoomsModal] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchBranches();
    fetchAttendanceStatus();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchPendingRooms();
    }
  }, [selectedBranch]);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/cleaning-tasks/status');
      if (res.data.success) {
        setActiveTask(res.data.activeTask);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendanceStatus = async () => {
    try {
      const res = await api.get('/attendance/my-status');
      if (res.data.success) {
        setAttendanceStatus(res.data.status);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!cameraOpen && stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [cameraOpen, stream]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data.success) {
        setBranches(res.data.data);
        if (!selectedBranch && res.data.data.length > 0) {
          setSelectedBranch(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingRooms = async () => {
    try {
      const res = await api.get(`/cleaning-tasks/pending?branchId=${selectedBranch}`);
      if (res.data.success) {
        setPendingData({ pendingTasks: res.data.pendingTasks, dirtyRooms: res.data.dirtyRooms });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openCameraFor = (action, roomId = null, taskId = null) => {
    if (!selectedBranch && !['checkin', 'checkout'].includes(action)) {
      return toast.error("Iltimos, avval filialni tanlang");
    }
    setCameraAction(action);
    setTargetRoomId(roomId);
    setTargetTaskId(taskId);
    setPhoto(null);
    setCameraOpen(true);
    startCamera(action);
  };

  const startCamera = async (overrideAction = null) => {
    try {
      const currentAction = overrideAction || cameraAction;
      const isSelfie = currentAction === 'checkin' || currentAction === 'checkout';
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: isSelfie ? 'user' : 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.log("Play ignored:", e));
        
        if (isSelfie) {
          videoRef.current.style.transform = 'scaleX(-1)';
        } else {
          videoRef.current.style.transform = 'none';
        }
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Kameraga ruxsat berilmadi yoki qurilmangizda kamera yo'q.");
      setCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const closeCamera = () => {
    setCameraOpen(false);
    stopCamera();
    setPhoto(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast.error("Kamera hali to'liq ishga tushmadi. Iltimos, ozgina kuting!");
        return;
      }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      const isSelfie = cameraAction === 'checkin' || cameraAction === 'checkout';
      if (isSelfie) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setPhoto(dataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  const submitPhoto = async () => {
    if (!photo) return;
    setIsSubmitting(true);
    try {
      if (cameraAction === 'checkin' || cameraAction === 'checkout') {
        const res = await api.post('/attendance/web-photo', {
          action: cameraAction,
          photo
        });
        if (res.data.success) {
          toast.success(res.data.message);
          fetchAttendanceStatus();
          closeCamera();
        }
      } else if (cameraAction === 'finish') {
        const res = await api.post('/cleaning-tasks/finish', {
          taskId: activeTask?.id,
          photoAfter: photo
        });
        if (res.data.success) {
          toast.success("Ish muvaffaqiyatli yakunlandi!");
          setActiveTask(null);
          fetchPendingRooms();
          closeCamera();
        }
      } else {
        let taskType = 'room';
        if (cameraAction === 'start_corridor') taskType = 'corridor';
        if (cameraAction === 'start_street') taskType = 'street';

        const res = await api.post('/cleaning-tasks/start', {
          taskType,
          roomId: targetRoomId,
          taskId: targetTaskId,
          photoBefore: photo
        });
        if (res.data.success) {
          toast.success("Ish boshlandi!");
          setActiveTask(res.data.task);
          fetchPendingRooms();
          setShowRoomsModal(false);
          closeCamera();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (cameraOpen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="p-4 flex justify-between items-center bg-black/50 absolute top-0 left-0 right-0 z-10 text-white">
          <h2 className="text-lg font-bold">Rasmga olish</h2>
          <button onClick={closeCamera} className="p-2 rounded-full bg-white/20"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
          {!photo ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <img src={photo} alt="Captured" className="w-full h-full object-contain" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-6 bg-black flex justify-center items-center gap-6 pb-12">
          {!photo ? (
            <button 
              onClick={capturePhoto}
              className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 bg-white rounded-full border border-slate-200 shadow-inner"></div>
            </button>
          ) : (
            <>
              <button 
                onClick={retakePhoto}
                disabled={isSubmitting}
                className="px-6 py-3 bg-slate-800 text-white rounded-xl font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Qayta olish
              </button>
              <button 
                onClick={submitPhoto}
                disabled={isSubmitting}
                className="px-8 py-3 bg-primary-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/30"
              >
                {isSubmitting ? 'Yuborilmoqda...' : 'Yuborish'}
                {!isSubmitting && <CheckCircle2 className="w-5 h-5" />}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 max-w-md mx-auto relative shadow-2xl">
      {/* Header */}
      <div className="bg-primary-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Salom, {user?.name ? user.name.split(' ')[0] : 'Farrosh'}!</h1>
            <p className="text-primary-100 mt-1 flex items-center gap-1"><Briefcase className="w-4 h-4" /> Tozalik bo&apos;limi</p>
          </div>
          <button onClick={handleLogout} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white/10 p-1 rounded-xl flex items-center">
          <MapPin className="w-5 h-5 ml-3 text-primary-200" />
          <select 
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="w-full bg-transparent border-none text-white font-medium focus:ring-0 appearance-none py-3"
          >
            <option value="" disabled className="text-slate-800">Filialni tanlang...</option>
            {branches?.map(b => (
              <option key={b.id} value={b.id} className="text-slate-800">{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 space-y-4 mt-2">
        {activeTask && (
          <div className="bg-amber-100 border border-amber-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900">Jarayondagi ish</h3>
                <p className="text-amber-700 text-sm">
                  {activeTask.taskType === 'room' ? `Xona #${activeTask.room?.roomNumber}` : activeTask.taskType === 'corridor' ? 'Koridorni tozalash' : "Ko'chani tozalash"}
                </p>
              </div>
            </div>
            <button 
              onClick={() => openCameraFor('finish')}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
            >
              <Camera className="w-6 h-6" />
              Ishni yakunlash
            </button>
          </div>
        )}

        {!activeTask && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => openCameraFor('checkin')} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-3 active:scale-95 transition-transform">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <Camera className="w-7 h-7" />
                </div>
                <span className="font-semibold text-slate-700 text-center">Ishga keldim<br/>(Check-in)</span>
              </button>
              <button onClick={() => openCameraFor('checkout')} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-3 active:scale-95 transition-transform">
                <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                  <LogOut className="w-7 h-7" />
                </div>
                <span className="font-semibold text-slate-700 text-center">Ishdan ketdim<br/>(Check-out)</span>
              </button>
            </div>

            {attendanceStatus !== 'checked_in' ? (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-4 mt-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <LogOut className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Smena faol emas</h2>
                  <p className="text-slate-500 mt-2">Tozalanadigan xonalarni ko'rish uchun "Ishga keldim" qilib smenani boshlang.</p>
                </div>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setShowRoomsModal(true)}
                  className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between active:scale-95 transition-transform"
                >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-800 text-lg">Xonalarni tozalash</h3>
                  <p className="text-slate-500 text-sm">Tozalanishi kerak bo&apos;lgan xonalar</p>
                </div>
              </div>
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                {(pendingData?.pendingTasks?.length || 0) + (pendingData?.dirtyRooms?.length || 0)}
              </div>
            </button>

            <button 
              onClick={() => openCameraFor('start_corridor')}
              className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-slate-800 text-lg">Koridorni tozalash</h3>
                <p className="text-slate-500 text-sm">Boshlash uchun rasmga oling</p>
              </div>
            </button>

            <button 
              onClick={() => openCameraFor('start_street')}
              className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center">
                <Map className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-slate-800 text-lg">Ko'chani tozalash</h3>
                <p className="text-slate-500 text-sm">Boshlash uchun rasmga oling</p>
              </div>
            </button>
              </>
            )}
          </>
        )}
      </div>

      {showRoomsModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-40 flex flex-col justify-end max-w-md mx-auto">
          <div className="bg-white rounded-t-3xl h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="p-4 flex justify-between items-center border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Tozalanadigan xonalar</h2>
              <button onClick={() => setShowRoomsModal(false)} className="p-2 bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {(!pendingData?.pendingTasks?.length && !pendingData?.dirtyRooms?.length) ? (
                <div className="text-center py-10 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  Hozircha tozalanadigan xonalar yo&apos;q.
                </div>
              ) : (
                <>
                  {pendingData?.pendingTasks?.map(t => (
                    <button 
                      key={`task-${t.id}`}
                      onClick={() => openCameraFor('start_room', t.roomId, t.id)}
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl flex justify-between items-center active:bg-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center font-bold text-lg">
                          {t.room?.roomNumber}
                        </div>
                        <div className="text-left">
                          <span className="block font-bold text-slate-800">Xona #{t.room?.roomNumber}</span>
                          <span className="block text-xs text-primary-600 font-medium">Kutayotgan vazifa</span>
                        </div>
                      </div>
                      <Camera className="w-5 h-5 text-slate-400" />
                    </button>
                  ))}
                  {pendingData?.dirtyRooms?.map(r => (
                    <button 
                      key={`room-${r.id}`}
                      onClick={() => openCameraFor('start_room', r.id)}
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl flex justify-between items-center active:bg-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-bold text-lg">
                          {r.roomNumber}
                        </div>
                        <div className="text-left">
                          <span className="block font-bold text-slate-800">Xona #{r.roomNumber}</span>
                          <span className="block text-xs text-orange-600 font-medium">Tozalash yo&apos;riqnomasi</span>
                        </div>
                      </div>
                      <Camera className="w-5 h-5 text-slate-400" />
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
