import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, CheckCircle2, Loader2, RefreshCw, SwitchCamera } from 'lucide-react';
import api from '../../lib/api';

export default function TelegramCameraPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const action = searchParams.get('action'); // 'checkin', 'checkout', 'cleaning_before', 'cleaning_after'
  const taskId = searchParams.get('taskId');

  const isCleaningAction = action === 'cleaning_before' || action === 'cleaning_after';
  const initialFacingMode = isCleaningAction ? 'environment' : 'user';

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [facingMode, setFacingMode] = useState(initialFacingMode);
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }, [stream]);

  const startCamera = useCallback(async (modeToUse) => {
    setError(null);
    const targetMode = modeToUse || facingMode;
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: targetMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.log("Play ignored:", e));
        videoRef.current.style.transform = targetMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Kameraga ruxsat berilmadi yoki qurilmangizda kamera topilmadi.");
    }
  }, [facingMode, stream]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    startCamera(initialFacingMode);

    return () => {
      stopCamera();
    };
  }, []);

  const toggleCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    await startCamera(newMode);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        window.Telegram?.WebApp?.showAlert("Kamera hali to'liq ishga tushmadi. Iltimos, ozgina kuting!");
        return;
      }
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(dataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera(facingMode);
  };

  const submitAttendance = async () => {
    if (!photo || !action) return;
    
    setIsSubmitting(true);
    try {
      let res;
      if (isCleaningAction) {
        if (action === 'cleaning_before') {
          res = await api.post('/cleaning-tasks/bot-start', {
            taskId,
            userId,
            photoBefore: photo
          });
        } else {
          res = await api.post('/cleaning-tasks/bot-finish', {
            taskId,
            userId,
            photoAfter: photo
          });
        }
      } else {
        res = await api.post('/attendance/bot-photo', {
          userId,
          action,
          photo
        });
      }

      if (res.data.success) {
        setIsSuccess(true);
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
        <p className="text-slate-400 text-center">Rasm saqlandi va tizimga yozildi.</p>
        <p className="text-slate-500 text-sm mt-8">Oyna avtomat yopiladi...</p>
      </div>
    );
  }

  let titleText = 'Rasmga Olish';
  if (action === 'checkin') titleText = 'Ishga Kelish (Check-in)';
  else if (action === 'checkout') titleText = 'Ishni Yakunlash (Check-out)';
  else if (action === 'cleaning_before') titleText = 'Tozalashdan Oldingi Rasm';
  else if (action === 'cleaning_after') titleText = 'Tozalab Bo\'lgach Rasm';

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center">
        <h1 className="text-white font-semibold flex items-center gap-2">
          {titleText}
        </h1>
        {!photo && (
          <button
            onClick={toggleCamera}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform"
            title="Kamerani almashtirish"
          >
            <SwitchCamera size={20} />
          </button>
        )}
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
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-2 border-white/10 m-8 rounded-3xl pointer-events-none"></div>
          </>
        ) : (
          <img src={photo} alt="Captured image" className="w-full h-full object-cover" />
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10 bg-gradient-to-t from-black via-black/80 to-transparent pb-safe">
        {!photo ? (
          <div className="flex justify-center items-center">
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
      
      <style dangerouslySetInnerHTML={{__html: `
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 24px); }
      `}} />
    </div>
  );
}
