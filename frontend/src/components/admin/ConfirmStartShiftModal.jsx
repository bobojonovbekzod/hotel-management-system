import React from 'react';
import { UserCheck, ShieldAlert, LogOut, Camera, Building2, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

export default function ConfirmStartShiftModal({ isOpen, user, shiftType, onConfirm, onReject, onClose }) {
  if (!isOpen) return null;

  const shiftTypeName = {
    morning: '☀️ Kunduzgi smena',
    night: '🌙 Kechki smena',
    daily: '📅 Kunlik smena'
  }[shiftType] || shiftType;

  const getFormattedPhotoUrl = (url) => {
    if (!url || url === 'uploaded_via_base64') return null;
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const apiBase = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api\/?$/, '') : '';
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${apiBase}${cleanUrl}`;
  };

  const photoUrl = getFormattedPhotoUrl(user?.photoUrl);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-red-500 animate-scale-up">
        
        {/* Solid Red Warning Header */}
        <div className="bg-red-600 text-white p-4 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-black text-sm uppercase tracking-wide">
            <AlertTriangle className="w-6 h-6 text-amber-300 animate-bounce" />
            <span>DIQQAT! SHAXSNI TASDIQLASH</span>
          </div>
          <span className="bg-red-700 text-red-100 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Xavfsizlik</span>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          <div className="text-center pt-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Siz hozir quyidagi xodim nomidan smena ochmoqchisiz:
            </p>
            
            {/* HIGHLIGHTED NAME BADGE WITH PHOTO */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-lg border border-slate-700">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={user?.name} 
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-2 border-2 border-amber-400 shadow-md" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-800 text-amber-400 text-2xl font-black flex items-center justify-center mx-auto mb-2 border-2 border-amber-400 shadow-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
              
              <div className="text-2xl font-black text-amber-400 tracking-tight leading-none uppercase">
                {user?.name || 'Administrator'}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-300">
                <span>@{user?.username}</span>
                {user?.branch?.name && (
                  <>
                    <span>•</span>
                    <span className="text-blue-300 font-semibold">{user.branch.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Shift Type Info */}
          <div className="bg-slate-100 p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Smena turi:</span>
            <span className="bg-white text-slate-900 px-3 py-1 rounded-lg border border-slate-200 font-bold shadow-2xs">{shiftTypeName}</span>
          </div>

          {/* RED WARNING TEXT BOX */}
          <div className="bg-red-50 border-2 border-red-200 p-3.5 rounded-xl text-red-900 text-xs leading-relaxed font-medium">
            <p className="font-bold text-red-700 mb-0.5">⚠️ Iltimos, ismingizni diqqat bilan tekshiring!</p>
            <p>
              Agar bu sizning akkauntingiz bo'lmasa, **"Yo'q, Chiqish"** tugmasini bosing va o'z loginingiz bilan kiring.
            </p>
          </div>

          {/* Action Buttons - Side by Side / Stacked */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={onReject}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md transition"
            >
              <LogOut size={16} />
              <span>Yo'q, Chiqish</span>
            </button>

            <button
              onClick={onConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md transition"
            >
              <Camera size={16} />
              <span>Ha, Davom Etish</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
