
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FadeInSection } from "../FadeInSection";
import { Youtube, Star, ExternalLink, Play, Share2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-js";

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
// COMPONENT
// ─────────────────────────────────────────────────────────────
export function Videos() {
  const [activeCategory, setActiveCategory] = useState("new");
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from("videos")
        .select("id, title, description, youtube_url, category, sub_category, display_order, created_at");

      if (dbError) {
        console.error("[Videos] Fetch error:", dbError);
        throw new Error(dbError.message);
      }

      console.log(`[Videos] Fetched ${data?.length ?? 0} videos`);
      setVideos(data ?? []);
    } catch (err: any) {
      setError(err.message ?? "حدث خطأ غير متوقع.");
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
      className="py-24 md:py-32 scroll-mt-nav bg-[#0f0e0c] relative overflow-hidden"
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
                      className="flex-1 rounded-full py-2.5 text-[11px] md:text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-white/5 whitespace-nowrap"
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
                        const embedUrl = videoId
                          ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
                          : null;

                        return (
                          <FadeInSection key={vid.id} delay={idx * 100}>
                            <Card className="bg-card/40 border-primary/10 hover:border-primary/30 transition-all duration-500 overflow-hidden group backdrop-blur-2xl rounded-[1.5rem] shadow-xl h-full flex flex-col text-right">
                              <CardContent className="p-0 flex flex-col h-full">

                                {/* Card header */}
                                <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-white/5 flex-row-reverse">
                                  <div className="flex items-center gap-3 flex-1 flex-row-reverse">
                                    <div className="w-8 h-8 rounded-full bg-red-600/10 text-red-500 border border-red-500/10 flex items-center justify-center shrink-0">
                                      <Youtube className="w-4 h-4" />
                                    </div>
                                    <div className="text-right min-w-0 flex-1">
                                      <h3 className="text-xs font-bold text-white group-hover:text-primary transition-colors leading-tight truncate">
                                        {vid.title ?? "بدون عنوان"}
                                      </h3>
                                      {vid.sub_category && (
                                        <p className="text-[9px] text-primary/60 font-medium mt-0.5">{vid.sub_category}</p>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleShare(vid.title, watchUrl)}
                                    className="w-8 h-8 text-white/20 hover:text-primary hover:bg-primary/5 transition-all rounded-full shrink-0"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>

                                {/* Embedded player (or fallback thumbnail) */}
                                <div className="relative aspect-video overflow-hidden bg-black">
                                  {embedUrl ? (
                                    <iframe
                                      className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                                      src={embedUrl}
                                      title={vid.title ?? ""}
                                      frameBorder="0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  ) : (
                                    /* Fallback when no valid ID could be extracted */
                                    <div className="w-full h-full flex items-center justify-center bg-black/60 text-foreground/30 text-xs">
                                      رابط يوتيوب غير صالح
                                    </div>
                                  )}
                                </div>

                                {/* Card footer */}
                                <div className="p-3 mt-auto border-t border-white/5 flex items-center justify-between flex-row-reverse">
                                  <div className="flex items-center gap-2 flex-row-reverse">
                                    <span className="flex items-center gap-1 text-[8px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-primary/10">
                                      <Star className="w-2 h-2 fill-current" />
                                      محتوى مرئي
                                    </span>
                                    {vid.created_at && (
                                      <span className="text-[9px] font-mono text-white/30">
                                        {new Date(vid.created_at).toLocaleDateString("ar-BH", { year: "numeric", month: "short" })}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-row-reverse">
                                    <a
                                      href={watchUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all duration-300 font-bold text-[9px] active:scale-95 shadow-md flex-row-reverse"
                                    >
                                      <span>يوتيوب</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                    <div className="flex items-center gap-1.5 text-white/20 text-[8px] font-bold uppercase tracking-[0.1em] flex-row-reverse">
                                      <Play className="w-2.5 h-2.5 fill-current" />
                                      <span className="hidden sm:inline">شاهد الآن</span>
                                    </div>
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
