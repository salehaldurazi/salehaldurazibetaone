"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase-js";
import { Sparkles, ChevronRight, ChevronLeft, Bell, ExternalLink, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeInSection } from "./FadeInSection";

export interface SiteUpdate {
  id: number | string;
  content: string;
  link?: string | null;
  is_visible?: boolean;
  created_at?: string | null;
}

const FALLBACK_UPDATES: SiteUpdate[] = [
  {
    id: "f-1",
    content: "تم إضافة إصدار جديد: ألبوم 'يا جرح علي' في مكتبة الصوتيات",
    link: "#audio",
    created_at: new Date().toISOString(),
  },
  {
    id: "f-2",
    content: "تحديث أدعية ومناجاة ليلة الجمعة المباركة بمرئيات عالية الجودة",
    link: "#audio",
    created_at: new Date().toISOString(),
  },
  {
    id: "f-3",
    content: "مكتبة المرئيات الرسمية أصبحت متاحة الآن مع باقة من اللطميات المصورة",
    link: "#videos",
    created_at: new Date().toISOString(),
  },
];

export function UpdatesBar() {
  const [updates, setUpdates] = useState<SiteUpdate[]>(FALLBACK_UPDATES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch updates from Supabase with resilient fallback
  useEffect(() => {
    async function fetchUpdates() {
      try {
        const { data, error } = await supabase
          .from("site_updates")
          .select("*")
          .eq("is_visible", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Supabase site_updates table query fallback:", error.message);
        } else if (data && data.length > 0) {
          setUpdates(data);
        }
      } catch (err) {
        console.warn("Using resilient local updates fallback:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUpdates();

    // Subscribe to real-time changes if available
    const channel = supabase
      .channel("public:site_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_updates" },
        () => {
          fetchUpdates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-rotate updates every 5 seconds unless paused on hover
  useEffect(() => {
    if (updates.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % updates.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [updates.length, isPaused]);

  const currentUpdate = updates[currentIndex] || updates[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % updates.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + updates.length) % updates.length);
  };

  if (!currentUpdate) return null;

  return (
    <section className="w-full py-4 sm:py-6 px-4 max-w-6xl mx-auto relative z-20" dir="rtl">
      <FadeInSection>
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="relative bg-card/40 border border-primary/20 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xl hover:shadow-2xl hover:border-primary/35 transition-all duration-500 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-3 group"
        >
          {/* Subtle Ambient Golden Glow */}
          <div className="absolute top-0 start-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/20 transition-colors" />
          <div className="absolute bottom-0 end-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          {/* Right Section: Badge & Label */}
          <div className="flex items-center gap-2.5 shrink-0 z-10 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2 bg-gradient-to-r from-primary/25 via-primary/15 to-primary/10 text-primary border border-primary/25 px-3 py-1.5 rounded-xl shadow-inner font-bold text-xs sm:text-sm shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <Bell className="w-3.5 h-3.5 text-primary fill-primary/20 animate-pulse" />
              <span className="tracking-wide">أحدث التحديثات</span>
            </div>

            {/* Counter Badge for Mobile */}
            {updates.length > 1 && (
              <span className="md:hidden text-[10px] font-mono text-foreground/50 bg-foreground/5 border border-foreground/10 px-2 py-0.5 rounded-md">
                {currentIndex + 1} / {updates.length}
              </span>
            )}
          </div>

          {/* Middle Section: Animated News Content */}
          <div className="flex-1 min-w-0 z-10 w-full text-start py-0.5 md:px-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentUpdate.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2 min-w-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary/70 shrink-0 hidden sm:block" />
                
                {currentUpdate.link ? (
                  <a
                    href={currentUpdate.link}
                    className="text-xs sm:text-sm font-medium text-foreground hover:text-primary transition-colors truncate block flex-1 group/link cursor-pointer"
                  >
                    <span className="group-hover/link:underline decoration-primary/50 underline-offset-4">
                      {currentUpdate.content}
                    </span>
                    <ExternalLink className="inline-block w-3 h-3 ms-1.5 opacity-60 group-hover/link:opacity-100 group-hover/link:translate-x-[-2px] transition-all text-primary" />
                  </a>
                ) : (
                  <p className="text-xs sm:text-sm font-medium text-foreground/90 truncate flex-1">
                    {currentUpdate.content}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Left Section: Controls & Counter for Desktop */}
          {updates.length > 1 && (
            <div className="flex items-center gap-2 shrink-0 z-10 justify-end w-full md:w-auto border-t md:border-t-0 border-foreground/5 pt-2 md:pt-0">
              <span className="hidden md:inline-flex text-[11px] font-mono text-foreground/50 bg-foreground/5 border border-foreground/10 px-2.5 py-1 rounded-lg">
                {currentIndex + 1} / {updates.length}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-foreground/5 hover:bg-primary/20 text-foreground/70 hover:text-primary border border-foreground/10 hover:border-primary/20 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                  title="التحديث السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleNext}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-foreground/5 hover:bg-primary/20 text-foreground/70 hover:text-primary border border-foreground/10 hover:border-primary/20 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                  title="التحديث التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </FadeInSection>
    </section>
  );
}
