import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

export default function TelegramCameraPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const action = searchParams.get('action'); // 'checkin' or 'checkout'

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Notify Telegram that the Mini App is ready
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand(); // Expand to full height
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', // Force front camera for selfies
          width: { ideal: 640 },
          height: { ideal: 480 }
        }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.log("Play ignored:", e));
        videoRef.current.style.transform = 'scaleX(-1)';
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Kameraga ruxsat berilmadi yoki qurilmangizda kamera yo'q.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        window.Telegram?.WebApp?.showAlert("Kamera hali to'liq ishga tushmadi. Iltimos, ozgina kuting!");
        return;
      }
      const canvas = canvasRef.current;
      
      // Match canvas size to video aspect ratio
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      // Flip horizontally so the selfie looks like a mirror
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get base64 jpeg
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(dataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  const submitAttendance = async () => {
    if (!photo || !userId || !action) return;
    
    setIsSubmitting(true);
    try {
      const res = await api.post('/attendance/bot-photo', {
        userId,
        action,
        photo
      });

      if (res.data.success) {
        setIsSuccess(true);
        // Automatically close Telegram Web App after 2 seconds
        setTimeout(() => {
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.close();
          }
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 size={48} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Muvaffaqiyatli!</h2>
        <p className="text-slate-400 text-center">Davomatingiz tizimga yozildi.</p>
        <p className="text-slate-500 text-sm mt-8">Oyna avtomat yopiladi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center">
        <h1 className="text-white font-semibold flex items-center gap-2">
          {action === 'checkin' ? 'Ishga Kelish (Check-in)' : 'Ishni Yakunlash (Check-out)'}
        </h1>
      </div>

      {error && (
        <div className="absolute top-16 left-4 right-4 z-20 bg-red-500/90 text-white p-4 rounded-xl text-sm backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 w-full relative flex items-center justify-center bg-slate-900">
        {!photo ? (
          <>
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            {/* Camera Overlay Grid/Target optional */}
            <div className="absolute inset-0 border-2 border-white/10 m-8 rounded-3xl pointer-events-none"></div>
          </>
        ) : (
          <img src={photo} alt="Captured selfie" className="w-full h-full object-cover" />
        )}
        
        {/* Hidden Canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10 bg-gradient-to-t from-black via-black/80 to-transparent pb-safe">
        {!photo ? (
          <div className="flex justify-center items-center">
            {/* Capture Button */}
            <button 
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white/50 flex items-center justify-center relative active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 bg-white rounded-full"></div>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button 
              onClick={retakePhoto}
              disabled={isSubmitting}
              className="flex-1 h-14 rounded-2xl bg-white/10 backdrop-blur-md text-white font-medium flex items-center justify-center gap-2 active:bg-white/20 transition-colors"
            >
              <RefreshCw size={20} />
              Qaytadan
            </button>
            <button 
              onClick={submitAttendance}
              disabled={isSubmitting}
              className="flex-1 h-14 rounded-2xl bg-primary-500 text-white font-bold flex items-center justify-center gap-2 active:bg-primary-600 transition-colors shadow-lg shadow-primary-500/30"
            >
              {isSubmitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Camera size={20} />
                  Jo'natish
                </>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Safe Area padding for iPhones */}
      <style dangerouslySetInnerHTML={{__html: `
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 24px); }
      `}} />
    </div>
  );
}
