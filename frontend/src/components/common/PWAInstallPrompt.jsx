import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 flex items-start gap-4 animate-in slide-in-from-bottom-5">
      <div className="flex-1">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Download className="w-4 h-4 text-primary-500" />
          Ilovani o'rnatish
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Asosiy ekranga o'rnatish orqali tezroq va qulayroq kiring.
        </p>
        <button
          onClick={handleInstallClick}
          className="mt-3 w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-xl transition-colors active:scale-95"
        >
          O'rnatish
        </button>
      </div>
      <button 
        onClick={() => setShowPrompt(false)}
        className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
