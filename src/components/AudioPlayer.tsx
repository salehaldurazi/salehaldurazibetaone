"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Track {
  id: string | number;
  title: string;
  album?: string;
  duration: string;
  audioUrl?: string;
  audio_url?: string;
}

interface AudioPlayerProps {
  track: Track | null;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export function AudioPlayer({
  track,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (audioRef.current.paused) {
        await audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    } catch (error) {
      console.error("فشل التحكم في التشغيل:", error);
    }
  }, []);

  const updateMediaSession = useCallback(() => {
    if ('mediaSession' in navigator && track && audioRef.current) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: "صالح الدرازي",
        album: track.album || "إصدار رسمي",
        artwork: [
          { src: 'https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/cover.png', sizes: '512x512', type: 'image/png' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
      navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());

      if (onNext) {
        navigator.mediaSession.setActionHandler('nexttrack', onNext);
      }
      if (onPrevious) {
        navigator.mediaSession.setActionHandler('previoustrack', onPrevious);
      }
    }
  }, [track, onNext, onPrevious]);

  useEffect(() => {
    if (track) {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.warn("تم حظر التشغيل التلقائي", e));
      }
      updateMediaSession();
      setIsMinimized(false);
    }
  }, [track, updateMediaSession]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      updateMediaSession();
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const audioSrc = track?.audioUrl || track?.audio_url;

  if (!track) return null;

  return (
    <div
      /* 
         - التحكم بموقع المشغل من الأسفل: bottom-[6.5rem]
         - العرض مطابق للقائمة الرئيسية: max-w-md
      */
      className={cn(
        "fixed bottom-[6rem] left-0 right-0 z-[120] flex items-center justify-center px-4 transition-all duration-500",
        "animate-in slide-in-from-bottom-5"
      )}
      dir="rtl"
    >
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={onNext}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="auto"
      />

      <div className={cn(
        "w-full max-w-md relative overflow-hidden transition-all duration-500 ease-in-out rounded-[1.5rem]",
        "bg-black/90 backdrop-blur-3xl border border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
        isMinimized ? "h-14" : "h-[120px]" // ارتفاع المشغل (h-[120px] للوضع الكامل)
      )}>
        {isMinimized ? (
          <button
            onClick={() => setIsMinimized(false)}
            className="absolute inset-0 z-10 flex items-center justify-between px-5 w-full h-full text-right hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-primary/20">
                <Image
                  src="https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/cover.png"
                  alt="غلاف"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0 text-right">
                <span className="text-[11px] font-bold text-white truncate leading-none">{track.title}</span>
                <span className="text-[9px] text-primary/70 truncate font-light mt-0.5">{track.album || "صالح الدرازي"}</span>
              </div>
            </div>

            <ChevronUp className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
          </button>
        ) : (
          <div className="flex flex-col animate-in fade-in duration-500 p-2 h-full justify-between gap-2"> {/* gap-2: المسافة بين شريط المعلومات والتحكم */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5 text-right min-w-0">
                <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-primary/30 shadow-2xl">
                  <Image
                    src="https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/cover.png"
                    alt="غلاف"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 text-right">
                  <h4 className="text-[12px] font-bold text-white truncate leading-tight">
                    {track.title}
                  </h4>
                  <p className="text-[9px] text-primary/80 font-medium truncate">
                    {track.album || "صالح الدرازي"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <Button
                  onClick={() => setIsMinimized(true)}
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 rounded-full text-white/30 hover:text-primary hover:bg-primary/10"
                  title="تصغير"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full text-white/30 hover:text-destructive hover:bg-destructive/10"
                  title="إغلاق"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-0"> {/* gap-0.5: المسافة بين شريط التمرير وأزرار التشغيل */}
              <div className="flex flex-col px-1">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSliderChange}
                  className="cursor-pointer"
                />
                <div className="flex items-center justify-between px-0.5 mt-1">
                  <span className="text-[8px] text-white/40 font-medium tabular-nums">{formatTime(currentTime)}</span>
                  <span className="text-[8px] text-white/40 font-medium tabular-nums">{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 pb-0.5"> {/* gap-4: المسافة الأفقية بين أزرار التحكم */}
                {/* زر التالي - تم نقله إلى اليمين بناءً على طلبك */}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!hasNext}
                  onClick={onNext}
                  className="text-primary/50 hover:text-primary hover:bg-primary/5 p-0 h-7 w-7 rounded-full transition-all"
                  title="التالي"
                >
                  <SkipForward className="w-3.5 h-3.5 fill-current" />
                </Button>

                {/* زر التشغيل الرئيسي - يظل في المنتصف كما طلبت */}
                <Button
                  onClick={togglePlay}
                  className={cn(
                    "w-9 h-9 rounded-full transition-all duration-300 shadow-xl",
                    "bg-primary text-primary-foreground hover:bg-white hover:text-primary"
                  )}
                  title={isPlaying ? "إيقاف" : "تشغيل"}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </Button>

                {/* زر السابق - تم نقله إلى اليسار بناءً على طلبك */}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!hasPrevious}
                  onClick={onPrevious}
                  className="text-primary/50 hover:text-primary hover:bg-primary/5 p-0 h-7 w-7 rounded-full transition-all"
                  title="السابق"
                >
                  <SkipBack className="w-3.5 h-3.5 fill-current" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
