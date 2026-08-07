import React from 'react';

export default function FullScreenLoader({ message = 'Saqlanmoqda...' }) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
      <div className="w-16 h-16 border-4 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></div>
      {message && <p className="mt-4 text-slate-100 font-medium tracking-wide animate-pulse">{message}</p>}
    </div>
  );
}
