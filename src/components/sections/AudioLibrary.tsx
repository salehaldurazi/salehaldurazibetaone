
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
  ChevronDown,
  Shuffle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
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
  listens_count?: number;
  downloads_count?: number;
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

// ─────────────────────────────────────────────────────────────
// RESILIENT FALLBACK DATA — Saleh Al-Dirazi albums & tracks
// ─────────────────────────────────────────────────────────────
const FALLBACK_ALBUMS: Album[] = [
  {
    id: "a-fallback-1",
    title: "يا جرح علي",
    year: 2024,
    category: "sorrow",
    tracks: [
      {
        id: "t-fallback-1",
        title: "قصيدة يا جرح علي",
        duration: "08:15",
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        album_id: "a-fallback-1",
        order: 1,
        listens_count: 14230,
        downloads_count: 3240
      },
      {
        id: "t-fallback-2",
        title: "قصيدة وداع الحسين والعباس",
        duration: "06:40",
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        album_id: "a-fallback-1",
        order: 2,
        listens_count: 9840,
        downloads_count: 1980
      }
    ]
  },
  {
    id: "a-fallback-2",
    title: "مأتم السنابس - أبا تراب",
    year: 2023,
    category: "sorrow",
    tracks: [
      {
        id: "t-fallback-3",
        title: "قصيدة أبا تراب الروحية",
        duration: "12:10",
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        album_id: "a-fallback-2",
        order: 1,
        listens_count: 24150,
        downloads_count: 5120
      },
      {
        id: "t-fallback-4",
        title: "صرخة الحق الكبرى",
        duration: "09:30",
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        album_id: "a-fallback-2",
        order: 2,
        listens_count: 18720,
        downloads_count: 3950
      }
    ]
  },
  {
    id: "a-fallback-3",
    title: "أفراح شعبانية ومواليد",
    year: 2024,
    category: "joy",
    tracks: [
      {
        id: "t-fallback-5",
        title: "قصيدة نور العوالم",
        duration: "05:12",
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
        album_id: "a-fallback-3",
        order: 1,
        listens_count: 8540,
        downloads_count: 1620
      },
      {
        id: "t-fallback-6",
        title: "قصيدة شعبان أشرق بهجة",
        duration: "04:55",
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
        album_id: "a-fallback-3",
        order: 2,
        listens_count: 6120,
        downloads_count: 940
      }
    ]
  },
  {
    id: "a-fallback-4",
    title: "أدعية ليلة الجمعة الخاشعة",
    year: 2023,
    category: "supplications",
    tracks: [
      {
        id: "t-fallback-7",
        title: "دعاء كميل الخاشع",
        duration: "25:40",
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
        album_id: "a-fallback-4",
        order: 1,
        listens_count: 31050,
        downloads_count: 7890
      },
      {
        id: "t-fallback-8",
        title: "مناجاة التائبين والشاكرين",
        duration: "15:20",
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
        album_id: "a-fallback-4",
        order: 2,
        listens_count: 15430,
        downloads_count: 3840
      }
    ]
  }
];

/**
 * دالة توليد رقم عشوائي ثابت بناءً على النصوص لاستخدامه كإحصاء افتراضي
 */
function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

export function AudioLibrary({ onPlay, onAddToQueue }: AudioLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("sorrow");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [liveAlbums, setLiveAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(5);
  const [expandedAlbumId, setExpandedAlbumId] = useState<string | number | null>(null);

  // Reset visibleCount when activeCategory or searchQuery changes
  useEffect(() => {
    setVisibleCount(5);
  }, [activeCategory, searchQuery]);

  // معالجة مشاركة المقاطع الصوتية عند فتح رابط يحتوي على معرف المقطع
  useEffect(() => {
    if (loading || liveAlbums.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const sharedTrackId = params.get("track");

    if (sharedTrackId) {
      let foundTrack: any = null;
      let foundAlbum: any = null;

      for (const album of liveAlbums) {
        if (album.tracks) {
          const track = album.tracks.find((t: any) => String(t.id) === String(sharedTrackId));
          if (track) {
            foundTrack = track;
            foundAlbum = album;
            break;
          }
        }
      }

      if (foundTrack && foundAlbum) {
        // 1. تفعيل قسم الألبوم المناسب
        setActiveCategory(foundAlbum.category);

        // 2. فتح الألبوم تلقائياً
        setExpandedAlbumId(foundAlbum.id);

        // 3. تشغيل المقطع في المشغل الصوتي
        const mappedTrack = {
          ...foundTrack,
          audioUrl: foundTrack.audio_url,
          album: foundAlbum.title
        };
        const mappedPlaylist = foundAlbum.tracks.map((t: any) => ({
          ...t,
          audioUrl: t.audio_url,
          album: foundAlbum.title
        }));

        // زيادة إحصائيات الاستماع تلقائياً عند الفتح عبر رابط المشاركة
        incrementTrackStat(foundTrack.id, "listens");

        onPlay(mappedTrack, mappedPlaylist);

        // 4. الانتقال إلى الألبوم بشكل سلس وسكرول إليه
        setTimeout(() => {
          const element = document.getElementById(`album-${foundAlbum.id}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 600);

        // تنظيف عنوان الرابط من الباراميترات لمنع إعادة التشغيل العشوائي عند تحديث الصفحة
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        toast({
          title: "تم تحميل المقطع المشترك",
          description: `${foundAlbum.title} - ${foundTrack.title}`,
        });
      }
    }
  }, [loading, liveAlbums, onPlay]);

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

        if (albumsData && albumsData.length > 0) {
          const { data: tracksData, error: tracksError } = await supabase
            .from("audios")
            .select("*")
            .order("order", { ascending: true });

          if (tracksError) throw tracksError;

          const fullAlbumsStructure = albumsData.map((album: any) => {
            const albumTracks = tracksData
              ? tracksData.filter((track: any) => String(track.album_id) === String(album.id))
              : [];

            // إسناد إحصائيات استماع وتحميل من قاعدة البيانات (ندعم كلاً من play_count/download_count و listens_count/downloads_count للتوافق التام)
            const tracksWithStats = albumTracks.map((track: any) => {
              const baseListens = track.listens_count ?? track.play_count ?? 0;
              const baseDownloads = track.downloads_count ?? track.download_count ?? 0;
              return {
                ...track,
                listens_count: baseListens,
                downloads_count: baseDownloads,
              };
            });

            return {
              ...album,
              tracks: tracksWithStats
            };
          });

          setLiveAlbums(fullAlbumsStructure as Album[]);
        } else {
          console.info("[AudioLibrary] Database returned no albums. Using fallback albums.");
          setLiveAlbums(FALLBACK_ALBUMS);
        }
      } catch (error: any) {
        console.warn("[AudioLibrary] Supabase fetch error. Gracefully falling back to default local library. Details:", error);
        setLiveAlbums(FALLBACK_ALBUMS);
      } finally {
        setLoading(false);
      }
    }

    fetchLibraryData();
  }, []);

  /**
   * Real-time custom event listener to synchronize statistics on play, download or player navigation
   */
  useEffect(() => {
    const handleStatsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackId: string | number; type: "listens" | "downloads" }>;
      const { trackId, type } = customEvent.detail;
      const columnName = type === "listens" ? "listens_count" : "downloads_count";

      setLiveAlbums((prevAlbums) =>
        prevAlbums.map((album) => ({
          ...album,
          tracks: album.tracks.map((t) =>
            String(t.id) === String(trackId)
              ? {
                ...t,
                [columnName]: (t[columnName as keyof typeof t] as number || 0) + 1,
              }
              : t
          ),
        }))
      );
    };

    window.addEventListener("track-stats-updated", handleStatsUpdate);
    return () => {
      window.removeEventListener("track-stats-updated", handleStatsUpdate);
    };
  }, []);

  const incrementTrackStat = async (trackId: string | number, type: "listens" | "downloads") => {
    const trackIdStr = String(trackId);
    const cooldownKey = `track-cooldown:${trackIdStr}:${type}`;
    const lastAction = localStorage.getItem(cooldownKey);
    const now = Date.now();
    if (lastAction && now - parseInt(lastAction) < 10000) {
      return; // local debounce to prevent rapid spam clicks
    }
    localStorage.setItem(cooldownKey, String(now));

    if (trackIdStr.startsWith("t-fallback-")) {
      // Local fallback simulation
      const event = new CustomEvent("track-stats-updated", {
        detail: { trackId: trackIdStr, type },
      });
      window.dispatchEvent(event);
      return;
    }

    const columnName = type === "listens" ? "listens_count" : "downloads_count";

    // نطلب من السيرفر زيادة الرقم مباشرة (بدون الحاجة لقراءة القيمة الحالية)
    // أولاً: نجرب استدعاء الدالة المخصصة increment_track_stat
    let { error } = await supabase.rpc('increment_track_stat', {
      row_id: trackId,
      column_name: columnName
    });

    // ثانياً: إذا فشل، نجرب الاستدعاء البديل للدالة الافتراضية increment_track_stats
    if (error) {
      console.warn("فشل increment_track_stat، نجرب الاستدعاء البديل increment_track_stats:", error);
      const actionType = type === "listens" ? "play" : "download";
      const { error: fallbackError } = await supabase.rpc('increment_track_stats', {
        track_id: parseInt(trackIdStr, 10),
        action_type: actionType
      });
      if (fallbackError) {
        console.error("فشل كلا استدعاءات الـ RPC لتحديث الإحصائيات:", fallbackError);
        // لا نوقف هنا لنسمح بالتحديث المحلي بالعمل على الأقل في واجهة المستخدم ليكون التطبيق متفاعلاً وسريعاً
      }
    }

    // Dispatch custom event to notify all components (including self) about stats change
    const event = new CustomEvent("track-stats-updated", {
      detail: { trackId: trackIdStr, type },
    });
    window.dispatchEvent(event);
  };

  const handleShufflePlay = () => {
    // جلب كافة الألبومات التي تنتمي للقسم النشط الحالي
    const categoryAlbums = liveAlbums.filter(album => album.category === activeCategory);

    // استخراج كافة القصائد من هذه الألبومات وتجهيزها للتشغيل
    const allTracks: any[] = [];
    categoryAlbums.forEach(album => {
      if (album.tracks) {
        album.tracks.forEach(track => {
          allTracks.push({
            ...track,
            audioUrl: track.audio_url,
            album: album.title
          });
        });
      }
    });

    if (allTracks.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا توجد قصائد متوفرة في هذا القسم للتشغيل العشوائي",
      });
      return;
    }

    // خوارزمية Fisher-Yates لخلط قائمة القصائد بشكل عشوائي كامل
    const shuffledTracks = [...allTracks];
    for (let i = shuffledTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
    }

    const firstTrack = shuffledTracks[0];

    // زيادة عدد الاستماعات للمقطع الأول الذي سيبدأ تشغيله
    incrementTrackStat(firstTrack.id, "listens");

    // استدعاء دالة التشغيل
    onPlay(firstTrack, shuffledTracks);
  };

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
        case "popular": {
          const sumListens = (album: Album) => album.tracks.reduce((sum, t) => sum + (t.listens_count || 0), 0);
          return sumListens(b) - sumListens(a);
        }
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
    // جلب اسم الألبوم لاستخدامه في التحميل والمشاركة
    const album = liveAlbums.find(a => String(a.id) === String(track.album_id));
    const albumName = album ? album.title : "ألبوم";
    const fullName = `${albumName} - ${track.title}`;

    // 1. كود المشاركة المطور
    if (action === "share") {
      // زيادة إحصائيات الاستماع عند المشاركة
      incrementTrackStat(track.id, "listens");

      const shareUrl = `${window.location.origin}/?track=${track.id}`;
      const shareText = `${fullName}\n${shareUrl}`;
      const shareData = {
        title: fullName, // وضعنا الاسم المنسق هنا
        text: `استمع إلى "${fullName}" بصوت الرادود صالح الدرازي عبر أناقة الدرازي`,
        url: shareUrl,
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            copyToClipboard(shareText, fullName);
          }
        }
      } else {
        copyToClipboard(shareText, fullName);
      }
    }

    // 2. كود التحميل المطور
    if (action === "download") {
      // زيادة إحصائيات التحميل عند الضغط على زر التحميل
      incrementTrackStat(track.id, "downloads");

      if (track.audio_url) {
        const fileName = `${fullName}.mp3`;

        try {
          const response = await fetch(track.audio_url);
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', fileName);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
          window.open(track.audio_url, "_blank");
        }
      }
    }
  };

  const copyToClipboard = (text: string, fullName: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({
          title: "تم نسخ رابط المشاركة بنجاح",
          description: fullName,
        });
      })
      .catch(() => {
        console.warn("فشل نسخ الرابط");
        toast({
          title: "عذراً",
          description: "فشل نسخ الرابط تلقائياً",
          variant: "destructive",
        });
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
    <section id="audio" className="py-24 md:py-32 scroll-mt-nav bg-background relative overflow-hidden">
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
              placeholder="ابحث عن ألبوم ، أو قصيدة ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-11 h-12 bg-card/40 border-primary/10 focus:border-primary/40 rounded-full text-sm shadow-xl transition-all backdrop-blur-sm text-right text-foreground"
              dir="rtl"
            />
          </div>

          <Tabs defaultValue="sorrow" value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <div className="flex flex-col items-center gap-6">
              {/* تبويبات الفئات */}
              <TabsList className="w-full bg-muted/50 dark:bg-black/40 backdrop-blur-2xl p-1.5 rounded-full border border-primary/10 h-auto inline-flex items-center gap-1.5 shadow-2xl overflow-hidden">
                <TabsTrigger
                  value="supplications"
                  className="flex-1 rounded-full py-2.5 text-[11px] md:text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-foreground/5 whitespace-nowrap"
                >
                  الأدعية
                </TabsTrigger>
                <TabsTrigger
                  value="joy"
                  className="flex-1 rounded-full py-2.5 text-[11px] md:text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-foreground/5 whitespace-nowrap"
                >
                  الأفراح
                </TabsTrigger>
                <TabsTrigger
                  value="sorrow"
                  className="flex-1 rounded-full py-2.5 text-[11px] md:text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-foreground/5 whitespace-nowrap"
                >
                  الأحزان
                </TabsTrigger>
              </TabsList>

              {/* أدوات التحكم: الفرز والتشغيل العشوائي التلقائي بتصميم عصري متناسق (Golden Glass) */}
              <div className="w-full flex flex-row-reverse justify-center items-center gap-4 flex-wrap">
                {/* زر التشغيل العشوائي للقسم الحالي */}
                <button
                  onClick={handleShufflePlay}
                  className="relative group overflow-hidden flex items-center justify-between gap-3 px-6 h-12 min-w-[220px] rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md transition-all duration-500 hover:border-primary/50 hover:bg-primary/10 shadow-[0_5px_20px_rgba(0,0,0,0.4)] cursor-pointer"
                  title="تشغيل تلقائي عشوائي من هذا القسم"
                >
                  {/* تأثير ضوئي عند المرور */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                  <div className="flex items-center gap-2 flex-row-reverse text-primary transition-colors">
                    <Shuffle className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-all duration-500" />
                    <span className="text-[11px] font-bold tracking-tight uppercase whitespace-nowrap">
                      {activeCategory === "sorrow" ? "عشوائي الأحزان" : activeCategory === "joy" ? "عشوائي الأفراح" : "عشوائي الأدعية"}
                    </span>
                  </div>

                  <div className="h-4 w-px bg-primary/20 mx-1" />

                  <Play className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary fill-current transition-colors duration-300" />
                </button>

                {/* زر الفرز */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative group overflow-hidden flex items-center justify-between gap-3 px-6 h-12 min-w-[220px] rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md transition-all duration-500 hover:border-primary/50 hover:bg-primary/10 shadow-[0_5px_20px_rgba(0,0,0,0.4)] cursor-pointer">
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
                    className="bg-popover/95 dark:bg-black/95 backdrop-blur-3xl border border-primary/20 text-right w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-[2rem] p-2 shadow-[0_30px_70px_rgba(0,0,0,0.2)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.9)] z-[150] animate-in fade-in zoom-in-95 duration-300 overflow-hidden"
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
                            : "text-foreground/80 hover:bg-primary/10 hover:text-primary"
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
                    <AlbumGrid
                      albums={visibleAlbums}
                      onPlay={onPlay}
                      onAction={handleAction}
                      onIncrementStat={incrementTrackStat}
                      expandedAlbumId={expandedAlbumId}
                      setExpandedAlbumId={setExpandedAlbumId}
                    />
                  </TabsContent>
                  <TabsContent value="joy" className="mt-0 focus-visible:outline-none">
                    <AlbumGrid
                      albums={visibleAlbums}
                      onPlay={onPlay}
                      onAction={handleAction}
                      onIncrementStat={incrementTrackStat}
                      expandedAlbumId={expandedAlbumId}
                      setExpandedAlbumId={setExpandedAlbumId}
                    />
                  </TabsContent>
                  <TabsContent value="supplications" className="mt-0 focus-visible:outline-none">
                    <AlbumGrid
                      albums={visibleAlbums}
                      onPlay={onPlay}
                      onAction={handleAction}
                      onIncrementStat={incrementTrackStat}
                      expandedAlbumId={expandedAlbumId}
                      setExpandedAlbumId={setExpandedAlbumId}
                    />
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
function AlbumGrid({
  albums,
  onPlay,
  onAction,
  onIncrementStat,
  expandedAlbumId,
  setExpandedAlbumId
}: {
  albums: any[],
  onPlay: any,
  onAction: (action: string, track: any) => void,
  onIncrementStat: (trackId: string | number, type: "listens" | "downloads") => void,
  expandedAlbumId: string | number | null,
  setExpandedAlbumId: (id: string | number | null) => void
}) {
  if (albums.length === 0) {
    return (
      <div className="text-center py-24 text-foreground/20 animate-in fade-in duration-700">
        <Music className="w-12 h-12 mx-auto mb-4 opacity-10" />
        <p className="text-sm tracking-widest">لا توجد نتائج</p>
      </div>
    );
  }

  const handleTrackPlay = (track: any, album: any) => {
    onIncrementStat(track.id, "listens");
    const mappedTrack = {
      ...track,
      listens_count: (track.listens_count || 0) + 1,
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

  const handleAlbumPlay = (album: any, albumIndex: number) => {
    if (!album.tracks || album.tracks.length === 0) return;

    const firstTrack = album.tracks[0];
    onIncrementStat(firstTrack.id, "listens");

    const mappedFirstTrack = {
      ...firstTrack,
      listens_count: (firstTrack.listens_count || 0) + 1,
      audioUrl: firstTrack.audio_url,
      album: album.title
    };

    // بناء قائمة تشغيل متكاملة تبدأ من هذا الألبوم وتتبعه الألبومات التالية تلقائياً لتشغيل مستمر متصل
    const fullPlaylist: any[] = [];
    for (let i = albumIndex; i < albums.length; i++) {
      const currentAlbum = albums[i];
      if (currentAlbum.tracks) {
        currentAlbum.tracks.forEach((t: any) => {
          fullPlaylist.push({
            ...t,
            audioUrl: t.audio_url,
            album: currentAlbum.title
          });
        });
      }
    }

    onPlay(mappedFirstTrack, fullPlaylist);
  };

  return (
    <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
      <AnimatePresence mode="popLayout">
        {albums.map((album, idx) => {
          const totalListens = album.tracks ? album.tracks.reduce((sum: number, t: any) => sum + (t.listens_count || 0), 0) : 0;
          const totalDownloads = album.tracks ? album.tracks.reduce((sum: number, t: any) => sum + (t.downloads_count || 0), 0) : 0;

          return (
            <motion.div
              key={album.id}
              id={`album-${album.id}`}
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
                  <div className="p-5 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent flex items-center justify-between gap-4 flex-row-reverse flex-wrap md:flex-nowrap">
                    <div className="flex items-center gap-4 flex-row-reverse">
                      <button
                        onClick={() => handleAlbumPlay(album, idx)}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary border border-primary/20 flex items-center justify-center transition-all hover:scale-110 hover:bg-primary/25 duration-500 shrink-0 shadow-lg cursor-pointer group/btn"
                        title="تشغيل الألبوم كاملاً"
                      >
                        <Play className="w-5 h-5 fill-current translate-x-[-1px] group-hover/btn:scale-110 transition-transform duration-300" />
                      </button>
                      <div className="text-right min-w-0">
                        <h3 className="text-lg font-bold tracking-tight mb-0.5 truncate text-foreground">{album.title}</h3>
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

                    {/* إحصائيات الألبوم الكلية */}
                    <div className="flex items-center gap-3 text-[10px] text-foreground/60 bg-foreground/5 border border-foreground/10 px-4 py-2 rounded-2xl flex-row-reverse backdrop-blur-sm shrink-0 self-center">
                      <div className="flex items-center gap-1.5 flex-row-reverse">
                        <Headphones className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] text-foreground/40 font-medium">{totalListens.toLocaleString("en-US")}</span>
                      </div>
                      <div className="w-px h-3 bg-foreground/15" />
                      <div className="flex items-center gap-1.5 flex-row-reverse">
                        <Download className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] text-foreground/40 font-medium">{totalDownloads.toLocaleString("en-US")}</span>
                      </div>
                    </div>
                  </div>

                  {/* قائمة القصائد */}
                  <div className="px-2 pb-4">
                    <Accordion
                      type="single"
                      collapsible
                      className="w-full"
                      value={expandedAlbumId === album.id ? "tracks" : ""}
                      onValueChange={(val) => {
                        if (val === "tracks") {
                          setExpandedAlbumId(album.id);
                        } else {
                          if (expandedAlbumId === album.id) {
                            setExpandedAlbumId(null);
                          }
                        }
                      }}
                    >
                      <AccordionItem value="tracks" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2.5 px-4 rounded-xl hover:bg-primary/5 transition-all text-[9px] uppercase opacity-70 hover:opacity-100 flex gap-2 flex-row-reverse group/trigger">
                          <div className="flex items-center gap-2 flex-row-reverse">
                            <span className="group-data-[state=open]/text-primary uppercase text-xs">تصفح القصائد</span>
                            <span className="w-5 h-5 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-[9px] border border-primary/10">{album.tracks ? album.tracks.length : 0}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 space-y-1.5 px-2">
                          {album.tracks && album.tracks.map((track: any, trackIdx: number) => (
                            <div
                              key={track.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-foreground/5 hover:bg-primary/10 group/item transition-all border border-transparent hover:border-primary/5 gap-2 flex-row-reverse"
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
                                  <span className="text-[11px] md:text-sm font-extralight block truncate leading-tight group-hover/item:text-primary transition-colors text-foreground">
                                    {track.title}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    onAction("download", track);
                                  }}
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
          );
        })}
      </AnimatePresence>
    </div>
  );
}
