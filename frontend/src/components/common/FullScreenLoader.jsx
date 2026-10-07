import React from 'react';

export default function FullScreenLoader({ message = 'Yuklanmoqda...' }) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
      <div className="bg-white/95 p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center justify-center min-w-[200px]">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        {message && <p className="mt-3 text-slate-700 font-semibold text-sm tracking-wide">{message}</p>}
      </div>
    </div>
  );
}
