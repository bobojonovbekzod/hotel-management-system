import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2, AlertCircle } from 'lucide-react';

export default function CustomAudioPlayer({ src, className = '', compact = false }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current || !src) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setHasError(false);

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch((err) => {
            console.error('Audio play error:', err);
            setIsPlaying(false);
            setIsLoading(false);
            setHasError(true);
          });
      }

      // Safety timeout: never stay in loading state longer than 4s
      setTimeout(() => {
        setIsLoading(false);
      }, 4000);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (isLoading) setIsLoading(false);
      if (!isPlaying) setIsPlaying(true);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    if (audioRef.current && duration > 0) {
      const seekTime = parseFloat(e.target.value);
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === 0) return '00:00';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (hasError) {
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-semibold ${className}`}>
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[11px]">Audio yozuvi topilmadi</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-2xs transition-all ${compact ? 'h-7.5' : 'h-9'} ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlaying={() => { setIsLoading(false); setIsPlaying(true); }}
        onPause={() => { setIsPlaying(false); setIsLoading(false); }}
        onCanPlay={() => { if (isPlaying) setIsLoading(false); }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => { setIsLoading(false); setIsPlaying(false); setHasError(true); }}
      />

      {/* Play / Pause / Loading Button */}
      <button
        onClick={togglePlay}
        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-xs active:scale-95 cursor-pointer ${
          isPlaying
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : isLoading
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 animate-pulse'
            : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-600 hover:text-blue-600'
        }`}
        title={isLoading ? "Serverdan yuklanmoqda..." : isPlaying ? "To'xtatish" : "Tinglash"}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-300" />
        ) : isPlaying ? (
          <Pause className="w-3 h-3 fill-current" />
        ) : (
          <Play className="w-3 h-3 fill-current ml-0.5" />
        )}
      </button>

      {/* Scrubber & Status */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            disabled={duration === 0 && !isPlaying}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {isLoading ? (
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 animate-pulse shrink-0">
            Yuklanmoqda...
          </span>
        ) : (
          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">
            {formatTime(currentTime)} {duration > 0 && `/ ${formatTime(duration)}`}
          </span>
        )}
      </div>
    </div>
  );
}
