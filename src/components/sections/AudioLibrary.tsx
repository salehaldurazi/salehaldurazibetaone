
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../../lib/supabase-js";
import { FadeInSection } from "../FadeInSection";
import {
  Play,
  Download,
  Search,
  Music,
  FolderOpen,
  Headphones,
  Share2,
  Clock,
  Star,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Calendar,
  Flame,
  ChevronDown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/**
 * واجهة تمثل بيانات القصيدة
 */
interface Track {
  id: string | number;
  title: string;
  duration: string;
  audio_url: string;
  album_id: string | number;
  order?: number;
}

/**
 * واجهة تمثل بيانات الألبوم
 */
interface Album {
  id: string | number;
  title: string;
  year: string | number;
  category: string;
  tracks: Track[];
}

interface AudioLibraryProps {
  onPlay: (track: any, playlist: any[]) => void;
  onAddToQueue: (track: any) => void;
}

/**
 * خيارات الفرز المتوفرة
 */
type SortOption = "newest" | "popular" | "oldest" | "az" | "za";

export function AudioLibrary({ onPlay, onAddToQueue }: AudioLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("sorrow");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [liveAlbums, setLiveAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(5);

  // Reset visibleCount when activeCategory or searchQuery changes
  useEffect(() => {
    setVisibleCount(5);
  }, [activeCategory, searchQuery]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 5);
  };

  /**
   * جلب البيانات من قاعدة بيانات سوبابيز عند تشغيل المكون
   */
  useEffect(() => {
    async function fetchLibraryData() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const { data: albumsData, error: albumsError } = await supabase
          .from("albums")
          .select("*");

        if (albumsError) throw albumsError;

        if (albumsData) {
          const { data: tracksData, error: tracksError } = await supabase
            .from("audios")
            .select("*")
            .order("order", { ascending: true });

          if (tracksError) throw tracksError;

          const fullAlbumsStructure = albumsData.map((album: any) => {
            const albumTracks = tracksData
              ? tracksData.filter((track: any) => String(track.album_id) === String(album.id))
              : [];
            return {
              ...album,
              tracks: albumTracks
            };
          });

          setLiveAlbums(fullAlbumsStructure as Album[]);
        }
      } catch (error: any) {
        const friendlyError = error?.message || error?.details || JSON.stringify(error);
        console.error("Supabase Details:", error);
        setErrorMessage(friendlyError);
      } finally {
        setLoading(false);
      }
    }

    fetchLibraryData();
  }, []);

  /**
   * تصفية وفرز الألبومات بناءً على الفئة، البحث، وخيار الفرز المختار
   */
  const filteredAndSortedAlbums = useMemo(() => {
    let result = liveAlbums.filter(album => album.category === activeCategory);

    if (searchQuery) {
      result = result.map(album => ({
        ...album,
        tracks: album.tracks.filter(track =>
          track.title.includes(searchQuery) || album.title.includes(searchQuery)
        )
      })).filter(album => album.tracks.length > 0 || album.title.includes(searchQuery));
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return Number(b.year) - Number(a.year);
        case "oldest":
          return Number(a.year) - Number(b.year);
        case "az":
          return a.title.localeCompare(b.title, 'ar');
        case "za":
          return b.title.localeCompare(a.title, 'ar');
        case "popular":
          return 0; // يمكن تطوير هذا بناءً على عدد الاستماعات مستقبلاً
        default:
          return 0;
      }
    });
  }, [searchQuery, activeCategory, liveAlbums, sortBy]);

  const visibleAlbums = useMemo(() => {
    return filteredAndSortedAlbums.slice(0, visibleCount);
  }, [filteredAndSortedAlbums, visibleCount]);

  /**
   * معالجة إجراءات المشاركة والتحميل
   */
  const handleAction = async (action: string, track: any) => {
    if (action === "share") {
      const shareUrl = `${window.location.origin}/?track=${track.id}`;
      const shareData = {
        title: track.title,
        text: `استمع إلى "${track.title}" بصوت الرادود صالح الدرازي عبر أناقة الدرازي`,
        url: shareUrl,
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            copyToClipboard(shareUrl);
          }
        }
      } else {
        copyToClipboard(shareUrl);
      }
    }

    if (action === "download") {
      if (track.audio_url) {
        try {
          const link = document.createElement('a');
          link.href = track.audio_url;
          link.setAttribute('download', `${track.title}.mp3`);
          link.setAttribute('target', '_blank');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          window.open(track.audio_url, "_blank");
        }
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      console.warn("فشل نسخ الرابط");
    });
  };

  /**
   * تحويل قيمة الفرز البرمجية إلى نص عربي للمستخدم
   */
  const getSortLabel = () => {
    switch (sortBy) {
      case "newest": return "الأحدث إصداراً";
      case "popular": return "الأكثر استماعاً";
      case "oldest": return "الأقدم إصداراً";
      case "az": return "أ-ي أبجدياً";
      case "za": return "ي-أ أبجدياً";
      default: return "فرز حسب";
    }
  };

  return (
    <section id="audio" className="py-24 md:py-32 scroll-mt-nav bg-[#0c0b0a] relative overflow-hidden">
      {/* تأثيرات الإضاءة الخلفية */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="container max-w-6xl px-6 mx-auto relative z-10">
        <FadeInSection className="text-center mb-8 space-y-4">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner">
              <Headphones className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-light text-primary">المكتبة الصوتية</h2>
          <p className="text-primary uppercase text-xs">مكتبة صوتية متكاملة</p>
        </FadeInSection>

        <div className="max-w-3xl mx-auto w-full space-y-6">
          {/* حقل البحث */}
          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
            <Input
              placeholder="ابحث عن ألبوم، قصيدة، أو ذكرى..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-11 h-12 bg-card/40 border-primary/10 focus:border-primary/40 rounded-full text-sm shadow-xl transition-all backdrop-blur-sm text-right text-white"
              dir="rtl"
            />
          </div>

          <Tabs defaultValue="sorrow" value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <div className="flex flex-col items-center gap-6">
              {/* تبويبات الفئات */}
              <TabsList className="w-full bg-black/40 backdrop-blur-2xl p-1.5 rounded-full border border-primary/10 h-auto inline-flex items-center gap-1.5 shadow-2xl overflow-hidden">
                <TabsTrigger
                  value="supplications"
                  className="flex-1 rounded-full py-2.5 text-[11px] md:text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-white/5 whitespace-nowrap"
                >
                  الأدعية
                </TabsTrigger>
                <TabsTrigger
                  value="joy"
                  className="flex-1 rounded-full py-2.5 text-[11px] md:text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-white/5 whitespace-nowrap"
                >
                  الأفراح
                </TabsTrigger>
                <TabsTrigger
                  value="sorrow"
                  className="flex-1 rounded-full py-2.5 text-[11px] md:text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-white/5 whitespace-nowrap"
                >
                  الأحزان
                </TabsTrigger>
              </TabsList>

              {/* زر الفرز بتصميم عصري (Golden Glass) */}
              <div className="w-full flex justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative group overflow-hidden flex items-center justify-between gap-3 px-6 h-12 min-w-[220px] rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md transition-all duration-500 hover:border-primary/50 hover:bg-primary/10 shadow-[0_5px_20px_rgba(0,0,0,0.4)]">
                      {/* تأثير ضوئي عند المرور */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                      <div className="flex items-center gap-2 flex-row-reverse text-primary transition-colors">
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-all duration-500" />
                        <span className="text-[11px] font-bold tracking-tight uppercase whitespace-nowrap">
                          {getSortLabel()}
                        </span>
                      </div>

                      <div className="h-4 w-px bg-primary/20 mx-1" />

                      <ChevronDown className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors duration-300" />
                    </button>
                  </DropdownMenuTrigger>

                  {/* محتوى القائمة المنسدلة المعرب بالكامل مع ترتيب مخصص وألوان أيقونات موحدة */}
                  <DropdownMenuContent
                    align="center"
                    sideOffset={12}
                    className="bg-black/95 backdrop-blur-3xl border border-primary/20 text-right w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-[2rem] p-2 shadow-[0_30px_70px_rgba(0,0,0,0.9)] z-[150] animate-in fade-in zoom-in-95 duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />

                    {[
                      { id: "newest", label: "الأحدث إصداراً", icon: Calendar },
                      { id: "popular", label: "الأكثر استماعاً", icon: Flame },
                      { id: "oldest", label: "الأقدم إصداراً", icon: HistoryIcon },
                      { id: "az", label: "أ-ي أبجدياً", icon: SortAsc },
                      { id: "za", label: "ي-أ أبجدياً", icon: SortDesc },
                    ].map((option) => (
                      <DropdownMenuItem
                        key={option.id}
                        onClick={() => setSortBy(option.id as SortOption)}
                        className={cn(
                          "flex-row-reverse gap-3 rounded-[1.4rem] py-3.5 px-4 cursor-pointer transition-all duration-300 relative group/item",
                          "focus:bg-primary/10 focus:text-primary outline-none",
                          sortBy === option.id
                            ? "bg-primary/20 text-primary"
                            : "text-white/80 hover:bg-primary/10 hover:text-primary"
                        )}
                      >
                        <option.icon className={cn(
                          "w-4 h-4 transition-all duration-300",
                          sortBy === option.id ? "opacity-100 scale-110" : "opacity-40 group-hover/item:opacity-100"
                        )} />
                        <span className="text-xs font-bold tracking-wide">{option.label}</span>

                        {/* مؤشر الخيار المختار */}
                        {sortBy === option.id && (
                          <div className="absolute left-4 w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(197,160,89,0.8)]" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* عرض النتائج */}
            <div className="mt-8">
              {loading ? (
                <div className="text-center py-24 text-muted-foreground animate-pulse">
                  <p className="text-sm tracking-widest">يرجى الإنتظار</p>
                </div>
              ) : errorMessage ? (
                <div className="text-center py-16 text-red-400 bg-red-950/20 border border-red-900/50 rounded-2xl p-6" dir="rtl">
                  <p className="text-sm font-bold mb-2">فشل جلب البيانات:</p>
                  <code className="text-xs block bg-black/40 p-3 rounded dir-ltr text-left overflow-auto text-red-300">{errorMessage}</code>
                </div>
              ) : (
                <>
                  <TabsContent value="sorrow" className="mt-0 focus-visible:outline-none">
                    <AlbumGrid albums={visibleAlbums} onPlay={onPlay} onAction={handleAction} />
                  </TabsContent>
                  <TabsContent value="joy" className="mt-0 focus-visible:outline-none">
                    <AlbumGrid albums={visibleAlbums} onPlay={onPlay} onAction={handleAction} />
                  </TabsContent>
                  <TabsContent value="supplications" className="mt-0 focus-visible:outline-none">
                    <AlbumGrid albums={visibleAlbums} onPlay={onPlay} onAction={handleAction} />
                  </TabsContent>

                  {/* Load More Button */}
                  <AnimatePresence>
                    {filteredAndSortedAlbums.length > visibleCount && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="flex justify-center mt-12"
                      >
                        <motion.button
                          onClick={handleLoadMore}
                          whileHover={{ scale: 1.03, translateY: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className="relative group overflow-hidden flex items-center justify-center gap-3 px-8 h-12 min-w-[180px] rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md transition-all duration-500 hover:border-primary/50 hover:bg-primary/10 shadow-[0_10px_30px_rgba(0,0,0,0.4)] text-primary text-xs font-bold"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                          <span className="relative z-10">عرض المزيد</span>
                          <ChevronDown className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors duration-300 relative z-10 group-hover:translate-y-0.5 transition-transform duration-300" />
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

/**
 * أيقونة التاريخ المخصصة
 */
function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24" height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="m12 7v5l4 2" />
    </svg>
  );
}

/**
 * شبكة عرض الألبومات
 */
function AlbumGrid({ albums, onPlay, onAction }: { albums: any[], onPlay: any, onAction: (action: string, track: any) => void }) {
  if (albums.length === 0) {
    return (
      <div className="text-center py-24 text-foreground/20 animate-in fade-in duration-700">
        <Music className="w-12 h-12 mx-auto mb-4 opacity-10" />
        <p className="text-sm tracking-widest">لا توجد نتائج</p>
      </div>
    );
  }

  const handleTrackPlay = (track: any, album: any) => {
    const mappedTrack = {
      ...track,
      audioUrl: track.audio_url,
      album: album.title
    };
    const mappedPlaylist = album.tracks.map((t: any) => ({
      ...t,
      audioUrl: t.audio_url,
      album: album.title
    }));
    onPlay(mappedTrack, mappedPlaylist);
  };

  return (
    <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
      <AnimatePresence mode="popLayout">
        {albums.map((album, idx) => (
          <motion.div
            key={album.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.98 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1],
              delay: idx < 5 ? idx * 0.05 : (idx % 5) * 0.05
            }}
          >
            <Card className="bg-card/40 border-primary/10 hover:border-primary/30 transition-all duration-500 overflow-hidden group backdrop-blur-2xl rounded-[2rem] shadow-2xl">
              <CardContent className="p-0">
                {/* ترويسة الألبوم */}
                <div className="p-5 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent flex items-center gap-4 flex-row-reverse">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary border border-primary/20 flex items-center justify-center transition-all group-hover:scale-105 duration-500 shrink-0 shadow-lg">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div className="text-right flex-1 min-w-0">
                    <h3 className="text-lg font-bold tracking-tight mb-0.5 truncate text-white">{album.title}</h3>
                    <div className="flex items-center gap-2 justify-end">
                      {album.status_label && (
                        <span className="flex items-center gap-1 text-[8px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-primary/10">
                          {album.status_label}
                        </span>
                      )}
                      <p className="text-[10px] text-foreground/40 font-medium">{album.year}</p>
                    </div>
                  </div>
                </div>

                {/* قائمة القصائد */}
                <div className="px-2 pb-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="tracks" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2.5 px-4 rounded-xl hover:bg-primary/5 transition-all text-[9px] font-bold tracking-[0.2em] uppercase opacity-70 hover:opacity-100 flex gap-2 flex-row-reverse group/trigger">
                        <div className="flex items-center gap-2 flex-row-reverse">
                          <span className="group-data-[state=open]/trigger:text-primary">تصفح القصائد</span>
                          <span className="w-5 h-5 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-[9px] border border-primary/10">{album.tracks ? album.tracks.length : 0}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 space-y-1.5 px-2">
                        {album.tracks && album.tracks.map((track: any, trackIdx: number) => (
                          <div
                            key={track.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-primary/10 group/item transition-all border border-transparent hover:border-primary/5 gap-2 flex-row-reverse"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0 flex-row-reverse">
                              <div className="flex items-center gap-3 flex-row-reverse">
                                <Button
                                  onClick={() => handleTrackPlay(track, album)}
                                  className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0 p-0 shadow-sm"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </Button>
                                <div className="flex items-center justify-center min-w-[1.8rem] h-6 rounded-md bg-primary/5 border border-primary/10">
                                  <span className="text-[10px] font-extralight text-primary/60">
                                    {(track.order || trackIdx + 1).toString().padStart(2, '0')}
                                  </span>
                                </div>
                              </div>

                              <div className="min-w-0 text-right flex-1 cursor-default">
                                <span className="text-[11px] md:text-sm font-extralight block truncate leading-tight group-hover/item:text-primary transition-colors text-white">
                                  {track.title}
                                </span>
                                <div className="flex items-center gap-1.5 justify-end mt-0.5 opacity-40 group-hover/item:opacity-70 transition-opacity">
                                  <span className="text-[9px] tracking-tighter text-white font-extralight">{track.duration}</span>
                                  <Clock className="w-2.5 h-2.5 text-white" />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onAction("download", track)}
                                className="w-7 h-7 rounded-lg hover:bg-primary/20 text-foreground/30 hover:text-primary transition-all p-0"
                                title="تنزيل"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onAction("share", track)}
                                className="w-7 h-7 rounded-lg hover:bg-primary/20 text-foreground/30 hover:text-primary transition-all p-0"
                                title="مشاركة"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
