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
  Disc,
  Download,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";

interface Track {
  id: string | number;
  title: string;
  album?: string;
  duration: string;
  audioUrl?: string;
  audio_url?: string;
  album_id?: string | number;
}

interface AudioPlayerProps {
  track: Track | null;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onGoToAlbum?: (track: Track) => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export function AudioPlayer({
  track,
  onClose,
  onNext,
  onPrevious,
  onGoToAlbum,
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

  const updatePositionState = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      "mediaSession" in navigator &&
      "setPositionState" in navigator.mediaSession &&
      audioRef.current
    ) {
      const { duration, currentTime, playbackRate } = audioRef.current;
      if (
        !isNaN(duration) &&
        duration > 0 &&
        !isNaN(currentTime) &&
        currentTime >= 0 &&
        currentTime <= duration
      ) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: playbackRate || 1,
            position: currentTime,
          });
        } catch (e) {
          console.warn("فشل تحديث حالة موضع MediaSession:", e);
        }
      }
    }
  }, []);

  const updateMediaSession = useCallback(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !track) {
      return;
    }

    const albumName = track.album || "إصدار رسمي";
    const lockScreenTitle = `(${albumName} - ${track.title})`;

    // 1. Dynamic Metadata formatted for Lock-Screen: (Album Name - Track/Poem Name)
    navigator.mediaSession.metadata = new MediaMetadata({
      title: lockScreenTitle,
      artist: "صالح الدرازي",
      album: albumName,
      artwork: [
        {
          src: "https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/cover.png",
          sizes: "96x96",
          type: "image/png",
        },
        {
          src: "https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/cover.png",
          sizes: "128x128",
          type: "image/png",
        },
        {
          src: "https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/cover.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/cover.png",
          sizes: "256x256",
          type: "image/png",
        },
        {
          src: "https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/cover.png",
          sizes: "384x384",
          type: "image/png",
        },
        {
          src: "https://pub-4e74282116ce42688fee67ca11592467.r2.dev/img/cover.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });

    // 2. Action Handlers for lock screen controls (play, pause, seekbackward, seekforward, seekto, nexttrack, previoustrack)
    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      [
        "play",
        async () => {
          if (audioRef.current) {
            try {
              await audioRef.current.play();
            } catch (err) {
              console.error("خطأ تشغيل MediaSession:", err);
            }
          }
        },
      ],
      [
        "pause",
        () => {
          if (audioRef.current) {
            audioRef.current.pause();
          }
        },
      ],
      [
        "seekbackward",
        (details) => {
          if (audioRef.current) {
            const skipTime = details.seekOffset || 10;
            const targetTime = Math.max(audioRef.current.currentTime - skipTime, 0);
            audioRef.current.currentTime = targetTime;
            setCurrentTime(targetTime);
            updatePositionState();
          }
        },
      ],
      [
        "seekforward",
        (details) => {
          if (audioRef.current) {
            const skipTime = details.seekOffset || 10;
            const dur = audioRef.current.duration || 0;
            const targetTime = Math.min(audioRef.current.currentTime + skipTime, dur);
            audioRef.current.currentTime = targetTime;
            setCurrentTime(targetTime);
            updatePositionState();
          }
        },
      ],
      [
        "seekto",
        (details) => {
          if (
            details.seekTime !== undefined &&
            details.seekTime !== null &&
            audioRef.current
          ) {
            const targetTime = Math.max(
              0,
              Math.min(details.seekTime, audioRef.current.duration || details.seekTime)
            );
            if (details.fastSeek && "fastSeek" in audioRef.current) {
              audioRef.current.fastSeek(targetTime);
            } else {
              audioRef.current.currentTime = targetTime;
            }
            setCurrentTime(targetTime);
            updatePositionState();
          }
        },
      ],
      ["nexttrack", onNext ? () => onNext() : null],
      ["previoustrack", onPrevious ? () => onPrevious() : null],
    ];

    handlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.warn(`الإجراء "${action}" في MediaSession غير مدعوم:`, error);
      }
    });

    updatePositionState();
  }, [track, onNext, onPrevious, updatePositionState]);

  useEffect(() => {
    if (track) {
      if (audioRef.current) {
        audioRef.current.play().catch((e) => console.warn("تم حظر التشغيل التلقائي", e));
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
      updatePositionState();
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
      updatePositionState();
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // 1. Go to Album function
  const handleGoToAlbum = () => {
    if (!track) return;

    if (onGoToAlbum) {
      onGoToAlbum(track);
    }

    window.dispatchEvent(
      new CustomEvent("go-to-album", {
        detail: {
          track,
          albumTitle: track.album,
          albumId: track.album_id,
        },
      })
    );

    const audioSection = document.getElementById("audio");
    if (audioSection) {
      audioSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    toast({
      title: "الانتقال إلى الألبوم",
      description: track.album || track.title,
    });
  };

  // 2. Download MP3 function
  const handleDownload = async () => {
    if (!track) return;
    const audioUrl = track.audioUrl || track.audio_url;
    if (!audioUrl) {
      toast({
        title: "خطأ",
        description: "رابط الصوت غير متوفر للتحميل",
        variant: "destructive",
      });
      return;
    }

    const albumName = track.album || "ألبوم";
    const fileName = `(${albumName} - ${track.title}).mp3`;

    try {
      toast({
        title: "جاري التحميل",
        description: `جاري تحميل ${track.title}...`,
      });

      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.warn("فشل التحميل المباشر، جاري الفتح في نافذة جديدة:", err);
      window.open(audioUrl, "_blank");
    }
  };

  // 3. Native Share function
  const handleShare = async () => {
    if (!track) return;
    const albumName = track.album || "ألبوم";
    const fullName = `(${albumName} - ${track.title})`;
    const shareUrl = `${window.location.origin}/?track=${track.id}`;
    const shareData = {
      title: fullName,
      text: `استمع إلى "${fullName}" بصوت الرادود صالح الدرازي`,
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          copyShareUrl(shareUrl, fullName);
        }
      }
    } else {
      copyShareUrl(shareUrl, fullName);
    }
  };

  const copyShareUrl = (url: string, title: string) => {
    navigator.clipboard
      .writeText(`${title}\n${url}`)
      .then(() => {
        toast({
          title: "تم نسخ رابط المشاركة بنجاح",
          description: title,
        });
      })
      .catch(() => {
        toast({
          title: "عذراً",
          description: "فشل نسخ الرابط تلقائياً",
          variant: "destructive",
        });
      });
  };

  const audioSrc = track?.audioUrl || track?.audio_url;

  if (!track) return null;

  const albumDisplayName = track.album || "صالح الدرازي";

  return (
    <div
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
        onPlay={() => {
          setIsPlaying(true);
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
        }}
        onPause={() => {
          setIsPlaying(false);
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "paused";
          }
        }}
        preload="auto"
      />

      <div
        className={cn(
          "w-full max-w-md relative overflow-hidden transition-all duration-500 ease-in-out rounded-[1.5rem]",
          "bg-card/90 dark:bg-black/90 backdrop-blur-3xl border border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
          isMinimized ? "h-14" : "h-[120px]"
        )}
      >
        {isMinimized ? (
          <button
            onClick={() => setIsMinimized(false)}
            className="absolute inset-0 z-10 flex items-center justify-between px-5 w-full h-full text-right hover:bg-foreground/5 transition-colors group"
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
                <span className="text-[11px] font-bold text-foreground truncate leading-none">
                  {track.title}
                </span>
                <span className="text-[9px] text-primary/70 truncate font-light mt-1">
                  {albumDisplayName}
                </span>
              </div>
            </div>

            <ChevronUp className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
          </button>
        ) : (
          <div className="flex flex-col animate-in fade-in duration-500 p-2 h-full justify-between gap-2">
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
                  <h4 className="text-[12px] font-bold text-foreground truncate leading-tight">
                    {track.title}
                  </h4>
                  <p className="text-[9px] text-primary/80 font-medium truncate mt-0.5">
                    {albumDisplayName}
                  </p>
                </div>
              </div>

              {/* أزرار التحكم العلوي: الانتقال للألبوم، التحميل، المشاركة، التصغير، الإغلاق */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleGoToAlbum}
                  className="w-7 h-7 rounded-full text-foreground/30 hover:text-primary hover:bg-primary/10 transition-all"
                  title="الانتقال إلى الألبوم"
                >
                  <Disc className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="w-7 h-7 rounded-full text-foreground/30 hover:text-primary hover:bg-primary/10 transition-all"
                  title="تنزيل القصيدة"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  className="w-7 h-7 rounded-full text-foreground/30 hover:text-primary hover:bg-primary/10 transition-all"
                  title="مشاركة القصيدة"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  onClick={() => setIsMinimized(true)}
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 rounded-full text-foreground/30 hover:text-primary hover:bg-primary/10 transition-all"
                  title="تصغير"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full text-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all"
                  title="إغلاق"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-0">
              <div className="flex flex-col px-1">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSliderChange}
                  className="cursor-pointer"
                />
                <div className="flex items-center justify-between px-0.5 mt-1">
                  <span className="text-[8px] text-foreground/40 font-medium tabular-nums">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-[8px] text-foreground/40 font-medium tabular-nums">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 pb-0.5">
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

