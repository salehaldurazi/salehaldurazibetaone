
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
          <h2 className="text-4xl md:text-5xl font-light text-primary">الرحلة البصرية</h2>
          <p className="text-primary uppercase text-xs">
            توثيق لحظات التواصل الروحي
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
                <TabsList className="w-full bg-black/40 backdrop-blur-2xl p-1.5 rounded-full border border-primary/10 h-auto inline-flex items-center gap-1.5 shadow-2xl overflow-hidden">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" dir="rtl">
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
                            <Card className="bg-card border border-border dark:border-white/10 hover:border-primary/40 transition-all duration-500 overflow-hidden group backdrop-blur-2xl rounded-2xl shadow-lg dark:shadow-2xl h-full flex flex-col text-right">
                              <CardContent className="p-0 flex flex-col h-full">

                                {/* 1. Video Player Area (Inline Frame vs Cover with smooth Framer Motion crossfade) */}
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
                                        {/* Quick close button on top of active player */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveVideoId(null);
                                          }}
                                          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/80 hover:bg-black border border-white/10 text-white/80 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-lg z-20"
                                          title="إغلاق التشغيل"
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
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            referrerPolicy="no-referrer"
                                            className="object-cover scale-100 group-hover/thumb:scale-105 transition-transform duration-700 ease-out brightness-[0.85] group-hover/thumb:brightness-100"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-600 text-xs">
                                            رابط يوتيوب غير صالح
                                          </div>
                                        )}

                                        {/* Premium Ambient Gradient — adapts to theme */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 dark:from-[#12110f] via-transparent to-transparent transition-opacity duration-500" />

                                        {/* Centered Glassmorphic glowing Play Button */}
                                        {videoId && (
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-14 h-14 rounded-full bg-primary/95 text-primary-foreground border border-white/20 flex items-center justify-center shadow-lg shadow-primary/20 backdrop-blur-sm group-hover/thumb:scale-110 group-hover/thumb:bg-primary group-hover/thumb:shadow-primary/40 transition-all duration-300">
                                              <Play className="w-6 h-6 fill-current translate-x-[-1px]" />
                                            </div>
                                          </div>
                                        )}

                                        {/* Floating sub-category badge */}
                                        {vid.sub_category && (
                                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-primary text-[10px] font-medium tracking-wide">
                                            {vid.sub_category}
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* 2. Text/Details Area */}
                                <div className="p-5 flex-1 flex flex-col gap-2.5">
                                  <div className="flex items-center justify-between flex-row-reverse gap-2">
                                    <span className="flex items-center gap-1 text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      محتوى مرئي
                                    </span>
                                    {vid.created_at && (
                                      <span className="text-[10px] font-mono text-foreground/40 dark:text-white/30">
                                        {new Date(vid.created_at).toLocaleDateString("ar-BH", { year: "numeric", month: "short" })}
                                      </span>
                                    )}
                                  </div>

                                  <h3 className="text-base md:text-lg font-light text-foreground group-hover:text-primary transition-colors duration-300 leading-snug line-clamp-1 mt-1">
                                    {vid.title ?? "بدون عنوان"}
                                  </h3>

                                  {vid.description && (
                                    <p className="text-xs text-foreground/50 leading-relaxed line-clamp-2">
                                      {vid.description}
                                    </p>
                                  )}
                                </div>

                                {/* 3. Redesigned Premium Action Bar */}
                                <div className="p-4 border-t border-border dark:border-white/5 bg-muted/50 dark:bg-black/20 flex items-center justify-between gap-2 flex-row-reverse mt-auto">
                                  {/* WATCH BUTTON */}
                                  <Button
                                    variant={isPlaying ? "destructive" : "default"}
                                    onClick={() => {
                                      if (isPlaying) {
                                        setActiveVideoId(null);
                                      } else {
                                        if (videoId) setActiveVideoId(vid.id);
                                      }
                                    }}
                                    className={`flex-1 h-9 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all duration-300 ${isPlaying
                                      ? "bg-red-500/15 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20"
                                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                                      }`}
                                  >
                                    {isPlaying ? (
                                      <>
                                        <Square className="w-3.5 h-3.5 fill-current" />
                                        <span>إغلاق المشاهدة</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        <span>مشاهدة الآن</span>
                                      </>
                                    )}
                                  </Button>

                                  {/* SHARE BUTTON */}
                                  <Button
                                    variant="outline"
                                    onClick={() => handleShare(vid.title, watchUrl)}
                                    className="h-9 px-3 rounded-xl border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/5 text-foreground/70 dark:text-white/80 hover:text-foreground dark:hover:text-white text-xs flex items-center gap-1.5 transition-all duration-200"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">مشاركة</span>
                                  </Button>

                                  {/* YOUTUBE LINK BUTTON */}
                                  <a
                                    href={watchUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-9 px-3 rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 text-foreground/70 dark:text-white/80 hover:text-foreground dark:hover:text-white text-xs flex items-center gap-1.5 transition-all duration-200"
                                  >
                                    <Youtube className="w-3.5 h-3.5 text-red-500" />
                                    <span className="hidden sm:inline">يوتيوب</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                  </a>
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
