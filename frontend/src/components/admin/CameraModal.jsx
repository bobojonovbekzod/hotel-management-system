import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');

  const startCamera = useCallback(async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Kameraga ruxsat berilmagan yoki kamera topilmadi.');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(dataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  const isCapturingRef = useRef(false);

  const handleConfirm = async () => {
    if (photo && !isCapturingRef.current) {
      isCapturingRef.current = true;
      setIsCapturing(true);
      try {
        await onCapture(photo);
      } finally {
        isCapturingRef.current = false;
        setIsCapturing(false);
      }
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleSkipPhotoForTesting = () => {
    // Generate a simple test placeholder canvas image
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TEST SMENA RASMI', 200, 140);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('Kamera ulanmagan (Test rejimi)', 200, 170);
    
    const dummyBase64 = canvas.toDataURL('image/jpeg', 0.8);
    onCapture(dummyBase64);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-md shadow-2xl relative">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Camera size={20} className="text-primary-500" />
            Yuzni skanerlash
          </h3>
          <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 bg-black relative flex items-center justify-center min-h-[300px]">
          {error ? (
            <div className="text-red-400 text-center px-6 py-4 space-y-4">
              <p className="text-sm font-medium">{error}</p>
              <p className="text-xs text-slate-400">
                Brauzer manzil qatori (URL) dagi qulf (🔒) belgisini bosib kameraga ruxsat bering.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button onClick={startCamera} className="w-full px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition">
                  Qayta urinish 🔄
                </button>

                <button 
                  onClick={handleSkipPhotoForTesting} 
                  className="w-full px-4 py-2.5 bg-amber-600/30 text-amber-300 hover:bg-amber-600/50 rounded-xl text-xs font-semibold border border-amber-500/30 transition"
                >
                  ⚡ Test Rasm Bilan Davom Etish (Kamerasiz)
                </button>
              </div>
            </div>
          ) : photo ? (
            <img src={photo} alt="Captured" className="w-full h-auto object-contain max-h-[400px] rounded" />
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-auto object-contain max-h-[400px] rounded transform scale-x-[-1]"
            ></video>
          )}
          <canvas ref={canvasRef} className="hidden"></canvas>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
          {photo ? (
            <>
              <button 
                onClick={retakePhoto} 
                disabled={isCapturing}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> Qaytadan
              </button>
              <button 
                onClick={handleConfirm} 
                disabled={isCapturing}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {isCapturing ? 'Yuklanmoqda...' : 'Tasdiqlash'}
              </button>
            </>
          ) : (
            <button 
              onClick={capturePhoto} 
              disabled={!!error}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera size={20} /> Rasmga olish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
