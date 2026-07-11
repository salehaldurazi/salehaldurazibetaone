
"use client";

import React, { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/sections/Hero";
import { supabase } from "@/lib/supabase-js";
import { Biography } from "@/components/sections/Biography";
import { AudioLibrary } from "@/components/sections/AudioLibrary";
import { Videos } from "@/components/sections/Videos";
import { Contact } from "@/components/sections/Contact";
import { AudioPlayer } from "@/components/AudioPlayer";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface Track {
  id: string;
  title: string;
  duration: string;
  album: string;
}

export default function Home() {
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [currentPlaylist, setCurrentPlaylist] = useState<Track[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);

  const handlePlay = (track: Track, playlist: Track[]) => {
    setCurrentPlaylist(playlist);
    const index = playlist.findIndex(t => t.id === track.id);
    setCurrentTrackIndex(index);
    toast({
      title: "بدأ التشغيل",
      description: track.title,
    });
  };

  const handleAddToQueue = (track: Track) => {
    setQueue(prev => {
      if (prev.find(t => t.id === track.id)) {
        toast({
          title: "موجود بالفعل",
          description: "هذه القصيدة مضافة بالفعل لقائمة الانتظار",
        });
        return prev;
      }
      toast({
        title: "تمت الإضافة",
        description: track.title,
      });
      return [...prev, track];
    });
  };

  const handleRemoveFromQueue = (trackId: string) => {
    setQueue(prev => prev.filter(t => t.id !== trackId));
  };

  const handleReorderQueue = (trackId: string, direction: 'up' | 'down') => {
    setQueue(prev => {
      const index = prev.findIndex(t => t.id === trackId);
      if (index === -1) return prev;

      const newQueue = [...prev];
      if (direction === 'up' && index > 0) {
        [newQueue[index], newQueue[index - 1]] = [newQueue[index - 1], newQueue[index]];
      } else if (direction === 'down' && index < newQueue.length - 1) {
        [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
      }
      return newQueue;
    });
  };

  const handleNext = () => {
    if (currentTrackIndex < currentPlaylist.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
    } else if (queue.length > 0) {
      const nextFromQueue = queue[0];
      handlePlay(nextFromQueue, [nextFromQueue, ...queue.slice(1)]);
      setQueue(prev => prev.slice(1));
    }
  };

  const handlePrevious = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(prev => prev - 1);
    }
  };

  const currentTrack = currentTrackIndex >= 0 ? currentPlaylist[currentTrackIndex] : null;

  return (
    <main className="relative bg-[#0f0e0c] text-foreground min-h-screen pb-32">
      <Navigation />

      <div id="home"><Hero /></div>
      <div id="biography"><Biography /></div>
      <div id="audio"><AudioLibrary onPlay={handlePlay} onAddToQueue={handleAddToQueue} /></div>
      <div id="videos"><Videos /></div>
      <div id="contact"><Contact /></div>

      <AudioPlayer
        track={currentTrack}
        onClose={() => setCurrentTrackIndex(-1)}
        onNext={currentTrackIndex < currentPlaylist.length - 1 ? handleNext : undefined}
        onPrevious={currentTrackIndex > 0 ? handlePrevious : undefined}
        hasNext={currentTrackIndex < currentPlaylist.length - 1}
        hasPrevious={currentTrackIndex > 0}
      />

      <Toaster />

      <div className="fixed top-0 left-12 w-px h-full bg-primary/5 pointer-events-none hidden lg:block" />
      <div className="fixed top-0 right-12 w-px h-full bg-primary/5 pointer-events-none hidden lg:block" />
    </main>
  );
}
