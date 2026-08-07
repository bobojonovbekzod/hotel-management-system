import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Clock, Play, Lock, FileText, CheckCircle2, Camera } from 'lucide-react';
import CameraModal from '../../components/admin/CameraModal';
import ConfirmStartShiftModal from '../../components/admin/ConfirmStartShiftModal';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminShiftPage() {
  const { user, logout } = useAuth();
  const [activeShift, setActiveShift] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [hasIssue, setHasIssue] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showConfirmIdentityModal, setShowConfirmIdentityModal] = useState(false);
  
  // Smena turi tanlovi
  const [selectedShiftType, setSelectedShiftType] = useState('');

  useEffect(() => {
    fetchActiveShift();
    fetchShifts();
  }, []);

  const fetchActiveShift = async () => {
    try {
      const res = await api.get('/shifts/my/active');
      setActiveShift(res.data.data);
    } catch {}
  };

  const fetchShifts = async () => {
    try {
      const now = new Date();
      const res = await api.get('/shifts', {
        params: { month: now.getMonth() + 1, year: now.getFullYear() },
      });
      setShifts(res.data.data);
    } catch {
      toast.error('Smenalarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (!selectedShiftType) return toast.error('Iltimos, smena turini tanlang!');
    setShowConfirmIdentityModal(true);
  };

  const handleProceedToCamera = () => {
    setShowConfirmIdentityModal(false);
    setShowCameraModal(true);
  };

  const handleRejectIdentity = () => {
    logout();
  };

  const handleConfirmStartShift = async (photoBase64) => {
    try {
      const payload = { 
        shiftType: selectedShiftType,
        base64Photo: photoBase64
      };
      
      const res = await api.post('/shifts/start', payload);
      setActiveShift(res.data.data);
      fetchShifts();
      toast.success('Smena boshlandi! 🎉');
      setSelectedShiftType('');
      setShowCameraModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato');
    }
  };

  const isClosingRef = useRef(false);

  const confirmClose = async () => {
    if (isClosingRef.current) return;
    if (hasIssue && !issueDescription.trim()) {
      return toast.error("Iltimos, yuz bergan muammoni batafsil yozib qoldiring!");
    }

    isClosingRef.current = true;
    setClosing(true);
    try {
      await api.put(`/shifts/${activeShift.id}/close`, { 
        notes: closeNotes,
        hasIssue,
        issueDescription: hasIssue ? issueDescription : null
      });
      setActiveShift(null);
      setCloseNotes('');
      setHasIssue(false);
      setIssueDescription('');
      setShowCloseModal(false);
      toast.success('Smena yopildi! Tizimdan chiqilmoqda...');
      setTimeout(() => {
        logout();
      }, 1200);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato');
      isClosingRef.current = false;
      setClosing(false);
    }
  };

  const handleClose = () => {
    setShowCloseModal(true);
  };

  const terminal = activeShift?.payments?.filter(p => p.method === 'terminal').reduce((sum, p) => sum + p.amount, 0) || 0;
  const qrcode = activeShift?.payments?.filter(p => p.method === 'qrcode').reduce((sum, p) => sum + p.amount, 0) || 0;
  const transfer = activeShift?.payments?.filter(p => p.method === 'transfer' || p.method === 'karta' || p.method === 'card').reduce((sum, p) => sum + p.amount, 0) || 0;
  const expenses = activeShift?.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const totalIncome = activeShift?.totalIncome || 0;
  const cashBalance = totalIncome - terminal - qrcode - transfer - expenses;

  const monthlyIncome = shifts.filter((s) => s.status === 'closed').reduce((sum, s) => sum + s.totalIncome, 0);
  const morningShifts = shifts.filter((s) => s.shiftType === 'morning');
  const nightShifts = shifts.filter((s) => s.shiftType === 'night');
  const dailyShifts = shifts.filter((s) => s.shiftType === 'daily');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="text-primary-400" /> Smena boshqaruvi
        </h1>
        <p className="text-slate-600 text-sm">Kunduzgi (08:00–19:00) | Tungi (19:00–08:00)</p>
      </div>

      {/* Active Shift Card */}
      {activeShift ? (
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 font-semibold text-lg">Faol smena</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeShift.shiftType === 'morning'
                ? 'bg-yellow-500/20 text-yellow-400'
                : activeShift.shiftType === 'daily'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              {activeShift.shiftType === 'morning' ? 'Kunduzgi' : activeShift.shiftType === 'daily' ? 'Sutkalik (24 soat)' : 'Tungi'}
            </span>
          </div>

          {activeShift.startPhotoUrl && (
            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-emerald-500/30 shadow-lg">
                <img src={activeShift.startPhotoUrl} alt="Smenani boshlagan admin" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-600 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
                {activeShift.admin?.name || 'Admin'}ning smena ochgan vaqtdagi rasmi
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Boshlanish vaqti</p>
              <p className="font-bold text-slate-900">{format(new Date(activeShift.startTime), 'HH:mm')}</p>
              <p className="text-xs text-slate-600">{format(new Date(activeShift.startTime), 'dd.MM.yyyy')}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Bronlar</p>
              <p className="text-3xl font-bold text-primary-400">{activeShift._count?.bookings || 0}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Jami tushum</p>
              <p className="text-xl font-bold text-emerald-400">{activeShift.totalIncome?.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Terminal</p>
              <p className="text-xl font-bold text-blue-500">{terminal.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">QrCode</p>
              <p className="text-xl font-bold text-orange-500">{qrcode.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Karta / O'tkazma</p>
              <p className="text-xl font-bold text-purple-500">{transfer.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 mb-1">Naqd (Kassada)</p>
              <p className="text-xl font-bold text-green-600">{cashBalance.toLocaleString()}</p>
            </div>
          </div>

          {/* Active payments */}
          {activeShift.payments?.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-slate-600 mb-2">Ushbu smenada qabul qilingan to'lovlar (Tranzaksiyalar):</p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {activeShift.payments.map((p) => (
                  <div key={p.id} className="flex flex-col gap-1.5 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {p.booking?.room?.roomNumber ? (
                          <span className="text-sm font-bold text-slate-900">Xona {p.booking.room.roomNumber}</span>
                        ) : (
                          <span className="text-sm font-bold text-slate-900">Noma'lum xona</span>
                        )}
                        {p.type === 'penalty' ? (
                           <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">Jarima</span>
                        ) : (
                           <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">To'lov</span>
                        )}
                        {p.booking?.primaryGuest && (
                          <span className="text-xs text-slate-600">→ {p.booking.primaryGuest.firstName}</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {format(new Date(p.createdAt), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        p.method === 'cash' ? 'bg-green-100 text-green-700' :
                        p.method === 'terminal' ? 'bg-blue-100 text-blue-700' :
                        p.method === 'qrcode' ? 'bg-orange-100 text-orange-700' :
                        (p.method === 'transfer' || p.method === 'karta' || p.method === 'card') ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {p.method === 'cash' ? 'Naqd' :
                         p.method === 'terminal' ? 'Terminal' :
                         p.method === 'qrcode' ? 'QrCode' :
                         (p.method === 'transfer' || p.method === 'karta' || p.method === 'card') ? 'Karta / O\'tkazma' :
                         p.method || 'Kiritilmagan'}
                      </span>
                      <span className="text-sm font-bold text-emerald-600">+{p.amount?.toLocaleString()} so'm</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              id="close-shift-btn"
              onClick={handleClose}
              disabled={closing}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-red-600/20"
            >
              {closing ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock size={18} />}
              {closing ? 'Yopilmoqda...' : 'Smenani yopish'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card text-center py-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-300 text-slate-600">
            <Clock size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Faol smena yo'q</h3>
          <p className="text-slate-600 mb-6">Ishlashni boshlash uchun yangi smena oching</p>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
            <select 
              className="input-field w-full sm:w-auto"
              value={selectedShiftType}
              onChange={(e) => setSelectedShiftType(e.target.value)}
            >
              <option value="" disabled>Smena turini tanlang...</option>
              <option value="morning">Kunduzgi (08:00 - 19:00)</option>
              <option value="night">Tungi (19:00 - 08:00)</option>
              <option value="daily">Sutkalik (08:00 dan - 24 soat)</option>
            </select>
            
            <button id="start-shift-btn" onClick={handleStart} className="btn-primary inline-flex items-center justify-center gap-2 px-8 w-full sm:w-auto whitespace-nowrap">
              <Play size={18} /> Smenani boshlash
            </button>
          </div>
        </div>
      )}

      {/* Monthly stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-xs text-slate-600 mb-1">Oylik smenalar</p>
          <p className="text-3xl font-bold text-slate-900">{shifts.filter((s) => s.status === 'closed').length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-600 mb-1">Kunduzgi</p>
          <p className="text-3xl font-bold text-yellow-400">{morningShifts.filter((s) => s.status === 'closed').length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-600 mb-1">Tungi</p>
          <p className="text-3xl font-bold text-blue-400">{nightShifts.filter((s) => s.status === 'closed').length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-600 mb-1">Sutkalik</p>
          <p className="text-3xl font-bold text-green-400">{dailyShifts.filter((s) => s.status === 'closed').length}</p>
        </div>
      </div>


  
      {showCloseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-300 w-full max-w-md rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Smenani yopish tasdig'i</h3>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Jami tushum:</span>
                  <span className="font-bold text-slate-900">{totalIncome.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Terminal orqali:</span>
                  <span className="font-medium text-blue-600">-{terminal.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">QrCode orqali:</span>
                  <span className="font-medium text-orange-600">-{qrcode.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Kartadan kartaga (O'tkazma):</span>
                  <span className="font-medium text-purple-600">-{transfer.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Xarajatlar:</span>
                  <span className="font-medium text-red-600">-{expenses.toLocaleString()} so'm</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between">
                  <span className="font-bold text-slate-900">Kassadagi naqd pul:</span>
                  <span className="font-bold text-emerald-600 text-lg">{cashBalance.toLocaleString()} so'm</span>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-slate-300 text-red-500 focus:ring-red-500"
                    checked={hasIssue}
                    onChange={(e) => {
                      setHasIssue(e.target.checked);
                      if (!e.target.checked) setIssueDescription('');
                    }}
                  />
                  <span className="text-slate-700 font-bold">Smenada muammo yuz berdimi?</span>
                </label>
              </div>

              {hasIssue && (
                <div className="mb-4">
                  <textarea
                    className="input-field resize-none h-24 border-red-300 focus:ring-red-500 focus:border-red-500"
                    placeholder="Muammoni aniq va batafsil yozib qoldiring..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                  />
                  <p className="text-xs text-red-500 mt-1 font-medium">Ushbu muammo hal qilinmagunicha, keyingi smenalar va direktorga ogohlantirish sifatida ko'rinib turadi.</p>
                </div>
              )}

              {!hasIssue && (
                <p className="text-sm text-slate-600 mb-4">Haqiqatan ham ushbu smenani yopmoqchimisiz? Yopilgandan so'ng tahrirlab bo'lmaydi.</p>
              )}
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={confirmClose}
                  disabled={closing}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  {closing ? 'Yopilmoqda...' : 'Ha, smenani yopish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmIdentityModal && (
        <ConfirmStartShiftModal
          isOpen={showConfirmIdentityModal}
          user={user}
          shiftType={selectedShiftType}
          onConfirm={handleProceedToCamera}
          onReject={handleRejectIdentity}
          onClose={() => setShowConfirmIdentityModal(false)}
        />
      )}

      {showCameraModal && (
        <CameraModal 
          onClose={() => setShowCameraModal(false)} 
          onCapture={handleConfirmStartShift} 
        />
      )}
    </div>
  );
}
