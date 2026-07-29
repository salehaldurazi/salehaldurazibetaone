
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FadeInSection } from "../FadeInSection";
import { Youtube, Star, ExternalLink, Play, Share2, Loader2, X, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// ─────────────────────────────────────────────────────────────
// TYPE — matches the Supabase videos table exactly
// ─────────────────────────────────────────────────────────────
interface VideoRow {
  id: string | number;
  title?: string | null;
  description?: string | null;
  youtube_url?: string | null;
  category?: string | null;       // 'new' | 'popular' | 'featured'
  sub_category?: string | null;
  display_order?: number | null;
  created_at?: string | null;
}

// ─────────────────────────────────────────────────────────────
// YOUTUBE ID EXTRACTOR — handles every common URL format
// ─────────────────────────────────────────────────────────────
function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// RESILIENT FALLBACK DATA — Saleh Al-Dirazi videos
// ─────────────────────────────────────────────────────────────
const FALLBACK_VIDEOS: VideoRow[] = [
  {
    id: "v-fallback-1",
    title: "يا جرح علي - الرادود صالح الدرازي",
    description: "مشاركة عاشوراء الحزينة للرادود صالح الدرازي في عزاء ليلة العاشر",
    youtube_url: "https://www.youtube.com/watch?v=R9K48E1D9Xg",
    category: "new",
    sub_category: "عزاء السنابس",
    display_order: 1,
    created_at: "2024-07-16T18:00:00Z"
  },
  {
    id: "v-fallback-2",
    title: "الحسين ضامناً - الإصدار الرسمي",
    description: "قصيدة الحسين ضامناً بصوت الرادود صالح الدرازي",
    youtube_url: "https://www.youtube.com/watch?v=Oj-9bKmlVgY&list=RDOj-9bKmlVgY&start_radio=1",
    category: "new",
    sub_category: "إصدارات استوديو",
    display_order: 2,
    created_at: "2024-07-15T18:00:00Z"
  },
  {
    id: "v-fallback-3",
    title: "أبا تراب - التراث الخالد",
    description: "من أجمل وأروع كلاسيكيات التراث الحسيني للرادود صالح الدرازي",
    youtube_url: "https://www.youtube.com/watch?v=Oj-9bKmlVgY&list=RDOj-9bKmlVgY&start_radio=1",
    category: "featured",
    sub_category: "مختارات تراثية",
    display_order: 1,
    created_at: "2023-01-10T12:00:00Z"
  },
  {
    id: "v-fallback-4",
    title: "موشحات وأدعية خاشعة بصوت الدرازي",
    description: "أدعية ومناجاه خاشعة بصوت الرادود صالح الدرازي",
    youtube_url: "https://www.youtube.com/watch?v=Oj-9bKmlVgY&list=RDOj-9bKmlVgY&start_radio=1",
    category: "popular",
    sub_category: "أدعية ومناجاة",
    display_order: 1,
    created_at: "2023-05-12T20:00:00Z"
  }
];

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
export function Videos() {
  const [activeCategory, setActiveCategory] = useState("new");
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | number | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from("videos")
        .select("id, title, description, youtube_url, category, sub_category, display_order, created_at");

      if (dbError) {
        console.warn("[Videos] Database fetch error. Falling back to default videos:", dbError);
        setVideos(FALLBACK_VIDEOS);
      } else if (!data || data.length === 0) {
        console.info("[Videos] Database empty. Using default videos.");
        setVideos(FALLBACK_VIDEOS);
      } else {
        console.log(`[Videos] Fetched ${data.length} videos`);
        setVideos(data);
      }
    } catch (err: any) {
      console.warn("[Videos] Fetch error caught. Using fallback videos:", err);
      setVideos(FALLBACK_VIDEOS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  // Group by category — sort by display_order within each group
  const groupedVideos = useMemo(() => {
    const sort = (arr: VideoRow[]) =>
      [...arr].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    return {
      new: sort(videos.filter((v) => v.category === "new")),
      popular: sort(videos.filter((v) => v.category === "popular")),
      featured: sort(videos.filter((v) => v.category === "featured")),
    };
  }, [videos]);

  const handleShare = (title: string | null | undefined, url: string | null | undefined) => {
    const shareUrl = url ?? window.location.href;
    navigator.clipboard.writeText(shareUrl).catch(() => { });
    toast({
      title: "تم نسخ الرابط",
      description: `تم نسخ رابط "${title ?? "الفيديو"}" بنجاح.`,
    });
  };

  return (
    <section
      id="videos"
      className="py-24 md:py-32 scroll-mt-nav bg-background relative overflow-hidden"
      dir="rtl"
    >
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="container max-w-6xl px-6 mx-auto relative z-10">
        <FadeInSection className="text-center mb-10 space-y-4">
          <h2 className="text-4xl md:text-5xl font-light text-primary">المرئيات</h2>
          <p className="text-primary uppercase text-xs">
            قسم خاص للمرئيات
          </p>
        </FadeInSection>

        <div className="max-w-3xl mx-auto w-full mt-12">
          {/* Loading */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-primary/40 gap-4">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs tracking-widest">جاري تحميل المرئيات ...</p>
            </div>
          ) : error ? (
            /* Error */
            <div className="text-center py-10 text-destructive bg-destructive/5 rounded-2xl border border-destructive/10 p-6">
              <p className="text-sm font-bold">حدث خطأ أثناء جلب البيانات</p>
              <p className="text-xs mt-2 opacity-70">{error}</p>
            </div>
          ) : (
            /* Content tabs */
            <Tabs
              defaultValue="new"
              value={activeCategory}
              onValueChange={setActiveCategory}
              className="w-full"
            >
              <div className="flex flex-col items-center w-full mb-8">
                <TabsList className="w-full bg-muted/50 dark:bg-black/40 backdrop-blur-2xl p-1.5 rounded-full border border-primary/10 h-auto inline-flex items-center gap-1.5 shadow-2xl overflow-hidden">
                  {[
                    { value: "featured", label: "مختارات" },
                    { value: "popular", label: "الأكثر مشاهدة" },
                    { value: "new", label: "الجديد" },
                  ].map(({ value, label }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="flex-1 rounded-full py-2.5 text-[11px] md:text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {(["featured", "popular", "new"] as const).map((key) => (
                <TabsContent
                  key={key}
                  value={key}
                  className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-700"
                >
                  {groupedVideos[key].length === 0 ? (
                    <div className="text-center py-20 text-foreground/20 text-sm tracking-widest">
                      لا توجد مرئيات في هذا القسم حالياً
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6" dir="rtl">
                      {groupedVideos[key].map((vid, idx) => {
                        const videoId = extractYouTubeId(vid.youtube_url);
                        const watchUrl = vid.youtube_url ?? (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "#");
                        const isPlaying = activeVideoId === vid.id;
                        const embedUrl = videoId
                          ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
                          : null;
                        const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

                        return (
                          <FadeInSection key={vid.id} delay={idx * 100}>
                            <Card className="bg-card border border-border dark:border-white/10 hover:border-primary/40 transition-all duration-500 overflow-hidden group backdrop-blur-2xl rounded-xl sm:rounded-2xl shadow-lg dark:shadow-2xl h-full flex flex-col text-right">
                              <CardContent className="p-0 flex flex-col h-full">

                                {/* 1. Video Player / Box Area with Dynamic Non-Verbal Geometric Overlay Icons */}
                                <div className="relative aspect-video overflow-hidden bg-black/95">
                                  <AnimatePresence mode="wait">
                                    {isPlaying && embedUrl ? (
                                      <motion.div
                                        key="player"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.3 }}
                                        className="w-full h-full relative"
                                      >
                                        <iframe
                                          className="w-full h-full"
                                          src={embedUrl}
                                          title={vid.title ?? ""}
                                          frameBorder="0"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                        />
                                        {/* Floating Close Button for Active Player */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveVideoId(null);
                                          }}
                                          className="absolute top-2 left-2 sm:top-3 sm:left-3 p-1.5 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white/90 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-lg z-20 cursor-pointer"
                                          title="إغلاق التشغيل"
                                          aria-label="Close Video"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </motion.div>
                                    ) : (
                                      <motion.div
                                        key="thumbnail"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        onClick={() => {
                                          if (videoId) setActiveVideoId(vid.id);
                                        }}
                                        className="relative w-full h-full cursor-pointer group/thumb select-none"
                                      >
                                        {thumbnailUrl ? (
                                          <Image
                                            src={thumbnailUrl}
                                            alt={vid.title ?? ""}
                                            fill
                                            sizes="(max-width: 768px) 50vw, 50vw"
                                            referrerPolicy="no-referrer"
                                            className="object-cover scale-100 group-hover/thumb:scale-105 transition-transform duration-700 ease-out brightness-[0.85] group-hover/thumb:brightness-100"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-600 text-xs">
                                            رابط يوتيوب غير صالح
                                          </div>
                                        )}

                                        {/* Premium Ambient Vignette Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 transition-opacity duration-500" />

                                        {/* 1) Floating Geometric Action Icons (Share & YouTube in Gold) - Non-verbal */}
                                        <div
                                          className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-1.5 z-10"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {/* SHARE ICON */}
                                          <button
                                            onClick={() => handleShare(vid.title, watchUrl)}
                                            className="w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 rounded-full bg-black/60 dark:bg-black/70 backdrop-blur-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary flex items-center justify-center transition-all duration-300 shadow-md hover:scale-110 active:scale-95 cursor-pointer"
                                            title="مشاركة الفيديو"
                                            aria-label="Share Video"
                                          >
                                            <Share2 className="w-3.5 h-3.5" />
                                          </button>

                                          {/* YOUTUBE GEOMETRIC ICON */}
                                          <a
                                            href={watchUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 rounded-full bg-black/60 dark:bg-black/70 backdrop-blur-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary flex items-center justify-center transition-all duration-300 shadow-md hover:scale-110 active:scale-95 cursor-pointer"
                                            title="مشاهدة على يوتيوب"
                                            aria-label="Go to YouTube"
                                          >
                                            <Youtube className="w-3.5 h-3.5 fill-current" />
                                          </a>
                                        </div>

                                        {/* 2) Center Translucent Glass Play Icon - Start Watching (Non-verbal) */}
                                        {videoId && (
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-full bg-black/50 backdrop-blur-md border border-primary/40 text-primary flex items-center justify-center shadow-2xl group-hover/thumb:scale-110 group-hover/thumb:bg-primary group-hover/thumb:border-primary/60 group-hover/thumb:text-primary-foreground transition-all duration-300">
                                              <Play className="w-5 h-5 sm:w-7 sm:h-7 fill-white text-white translate-x-[-1px] group-hover/thumb:scale-110 transition-transform duration-300" />
                                            </div>
                                          </div>
                                        )}

                                        {/* Floating Sub-category Badge (Top-Right) */}
                                        {vid.sub_category && (
                                          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-black/60 backdrop-blur-md border border-primary/20 text-primary text-[8px] sm:text-[10px] font-bold tracking-wide shadow-md">
                                            {vid.sub_category}
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* 2. Text & Metadata Area (Clean layout without separate text buttons) */}
                                <div className="p-3 sm:p-4 md:p-5 flex-1 flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between flex-row-reverse gap-2">
                                      {vid.created_at && (
                                        <span className="text-[9px] sm:text-[10px] font-mono text-foreground/40 dark:text-white/30">
                                          {new Date(vid.created_at).toLocaleDateString("ar-BH", { year: "numeric", month: "short" })}
                                        </span>
                                      )}
                                    </div>

                                    <h3 className="text-xs sm:text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300 leading-snug line-clamp-2 mt-1">
                                      {vid.title ?? "بدون عنوان"}
                                    </h3>

                                    {vid.description && (
                                      <p className="text-[10px] sm:text-xs text-foreground/50 leading-tight sm:leading-relaxed line-clamp-2 mt-1">
                                        {vid.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                              </CardContent>
                            </Card>
                          </FadeInSection>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </div>
    </section>
  );
}
