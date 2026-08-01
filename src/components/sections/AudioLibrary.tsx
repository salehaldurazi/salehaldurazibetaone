
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
  FolderHeart,
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
  Shuffle,
  LayoutGrid,
  List,
  X,
  ArrowRight
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
import { cn, normalizeArabic } from "@/lib/utils";
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
  folder_id?: string | number | null;
  order?: number;
  listens_count?: number;
  downloads_count?: number;
  is_visible?: boolean;
  year?: string | number;
  release_year?: string | number;
  description?: string;
  reciter?: string;
  artist?: string;
  subtitle?: string;
  details?: string;
  event_name?: string;
}

/**
 * واجهة تمثل بيانات الألبوم
 */
interface Album {
  id: string | number;
  title: string;
  year: string | number;
  category: string;
  folder_id?: string | number | null;
  tracks: Track[];
  is_visible?: boolean;
}

/**
 * واجهة تمثل بيانات المجلد المخصص
 */
interface AudioFolder {
  id: number;
  name: string;
  category: string;
  folder_type: "qasaed_only" | "albums_only";
  display_order: number;
  is_visible: boolean;
  created_at?: string | null;
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
  const [liveFolders, setLiveFolders] = useState<AudioFolder[]>([]);
  const [standaloneQasaed, setStandaloneQasaed] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(5);
  const [expandedAlbumId, setExpandedAlbumId] = useState<string | number | null>(null);
  const [sharedAlbumId, setSharedAlbumId] = useState<string | number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [currentFolderView, setCurrentFolderView] = useState<AudioFolder | null>(null);
  const [highlightedTrackId, setHighlightedTrackId] = useState<string | number | null>(null);
  const [highlightedAlbumId, setHighlightedAlbumId] = useState<string | number | null>(null);
  const [playerState, setPlayerState] = useState<{ isActive: boolean; isMinimized: boolean }>(() => {
    if (typeof window !== "undefined" && (window as any).__playerState) {
      return (window as any).__playerState;
    }
    return { isActive: false, isMinimized: false };
  });

  useEffect(() => {
    const handlePlayerStateChange = (e: Event) => {
      const customEvt = e as CustomEvent<{ isActive: boolean; isMinimized: boolean }>;
      if (customEvt.detail) {
        setPlayerState(customEvt.detail);
      }
    };

    if (typeof window !== "undefined" && (window as any).__playerState) {
      setPlayerState((window as any).__playerState);
    }

    window.addEventListener("player-state-change", handlePlayerStateChange);
    return () => {
      window.removeEventListener("player-state-change", handlePlayerStateChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expandedAlbumId !== null) {
        setExpandedAlbumId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedAlbumId]);

  // Reset visibleCount when activeCategory or searchQuery changes
  useEffect(() => {
    setVisibleCount(5);
    if (currentFolderView && currentFolderView.category !== activeCategory) {
      setCurrentFolderView(null);
    }
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
        // Set the shared album ID state so sorting logic puts it at the top
        setSharedAlbumId(foundAlbum.id);

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
          } else {
            // Fallback: scroll to the audio library section
            const audioSection = document.getElementById("audio");
            if (audioSection) {
              audioSection.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        }, 600);

        // تنظيف عنوان الرابط من الباراميترات لمنع إعادة التشغيل العشوائي عند تحديث الصفحة
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [loading, liveAlbums, onPlay]);

  // الاستماع لحدث "الانتقال إلى الألبوم/القصيدة" لتحديد القسم والمجلد وفتح قائمة القصائد والتمرير إليها
  useEffect(() => {
    const handleGoToAlbum = (e: Event) => {
      const customEvt = e as CustomEvent;
      const detail = customEvt.detail;
      const track = detail?.track;
      const albumTitle = detail?.albumTitle || track?.album;
      const albumId = detail?.albumId || track?.album_id;

      if (!track && !albumTitle && !albumId) return;

      const albumsList = liveAlbums.length > 0 ? liveAlbums : FALLBACK_ALBUMS;

      // 1. البحث عن الألبوم التابع له المقطع الصوتي
      let foundAlbum = albumsList.find(
        (a) =>
          (albumId && String(a.id) === String(albumId)) ||
          (track?.id && a.tracks?.some((t) => String(t.id) === String(track.id))) ||
          (albumTitle && normalizeArabic(a.title) === normalizeArabic(String(albumTitle)))
      );

      if (!foundAlbum && albumTitle) {
        foundAlbum = albumsList.find(
          (a) =>
            normalizeArabic(a.title).includes(normalizeArabic(String(albumTitle))) ||
            normalizeArabic(String(albumTitle)).includes(normalizeArabic(a.title))
        );
      }

      // إظهار كافة الألبومات لمنع حجب العناصر بالطي
      setVisibleCount(albumsList.length + 100);

      if (foundAlbum) {
        // إذا كان الألبوم ينتمي لمجلد معين، ننتقل إلى ذلك المجلد
        let parentFolder: AudioFolder | undefined;
        if (foundAlbum.folder_id != null) {
          parentFolder = liveFolders.find((f) => String(f.id) === String(foundAlbum.folder_id));
        }

        if (parentFolder) {
          if (parentFolder.category) {
            setActiveCategory(parentFolder.category);
          }
          setCurrentFolderView(parentFolder);
        } else {
          if (foundAlbum.category) {
            setActiveCategory(foundAlbum.category);
          }
          setCurrentFolderView(null);
        }

        setSharedAlbumId(foundAlbum.id);
        setExpandedAlbumId(foundAlbum.id);

        if (track?.id) {
          setHighlightedTrackId(track.id);
        }
        setHighlightedAlbumId(foundAlbum.id);

        setTimeout(() => {
          const trackEl = track?.id ? document.getElementById(`track-${track.id}`) : null;
          if (trackEl) {
            trackEl.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            const albumEl = document.getElementById(`album-${foundAlbum.id}`);
            if (albumEl) {
              albumEl.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
              const audioSection = document.getElementById("audio");
              if (audioSection) {
                audioSection.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }
          }
        }, 350);
      } else {
        // 2. إذا لم يكن ضمن ألبوم، نتحقق مما إذا كان قصيدة مستقلة/مرتبطة بمجلد
        let targetFolderId = track?.folder_id;
        if (!targetFolderId && track?.id) {
          const standalone = standaloneQasaed.find((t) => String(t.id) === String(track.id));
          if (standalone) {
            targetFolderId = standalone.folder_id;
          }
        }

        let parentFolder: AudioFolder | undefined;
        if (targetFolderId != null) {
          parentFolder = liveFolders.find((f) => String(f.id) === String(targetFolderId));
        }

        if (parentFolder) {
          if (parentFolder.category) {
            setActiveCategory(parentFolder.category);
          }
          setCurrentFolderView(parentFolder);
        } else {
          setCurrentFolderView(null);
        }

        if (track?.id) {
          setHighlightedTrackId(track.id);
        }

        setTimeout(() => {
          const trackEl = track?.id ? document.getElementById(`track-${track.id}`) : null;
          if (trackEl) {
            trackEl.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            const audioSection = document.getElementById("audio");
            if (audioSection) {
              audioSection.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        }, 350);
      }

      // إزالة التبريز البصري بعد 3 ثوانٍ
      setTimeout(() => {
        setHighlightedTrackId(null);
        setHighlightedAlbumId(null);
      }, 3000);
    };

    window.addEventListener("go-to-album", handleGoToAlbum);
    return () => {
      window.removeEventListener("go-to-album", handleGoToAlbum);
    };
  }, [liveAlbums, liveFolders, standaloneQasaed]);

  const handleShowAll = () => {
    setVisibleCount(filteredAndSortedAlbums.length);
  };

  /**
   * جلب البيانات من قاعدة بيانات سوبابيز عند تشغيل المكون
   */
  useEffect(() => {
    async function fetchLibraryData() {
      try {
        setLoading(true);
        setErrorMessage(null);

        // جلب المجلدات
        let foldersResult: AudioFolder[] = [];
        try {
          const { data: foldersData, error: foldersError } = await supabase
            .from("audio_folders")
            .select("*")
            .order("display_order", { ascending: true });
          if (foldersError) {
            console.warn("[AudioLibrary] Folders fetch error:", foldersError);
          } else if (foldersData) {
            foldersResult = foldersData.filter((f: any) => f.is_visible !== false) as AudioFolder[];
          }
        } catch (e) { console.warn("[AudioLibrary] Folders fetch exception:", e); }
        setLiveFolders(foldersResult);
        console.log("[AudioLibrary] liveFolders fetched:", foldersResult);

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

          // Filter out hidden albums (defaulting to visible if column does not exist)
          const visibleAlbumsData = albumsData.filter((album: any) => album.is_visible !== false);

          // Filter out hidden tracks (defaulting to visible if column does not exist)
          const visibleTracksData = tracksData
            ? tracksData.filter((track: any) => track.is_visible !== false)
            : [];

          const fullAlbumsStructure = visibleAlbumsData.map((album: any) => {
            const albumTracks = visibleTracksData.filter((track: any) => String(track.album_id) === String(album.id));

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
              // Explicitly preserve folder_id as a number or null (never undefined)
              folder_id: album.folder_id != null ? Number(album.folder_id) : null,
              tracks: tracksWithStats
            };
          });

          console.log("[AudioLibrary] Albums with folder_id:", fullAlbumsStructure.map((a: any) => ({ id: a.id, title: a.title, folder_id: a.folder_id })));
          setLiveAlbums(fullAlbumsStructure as Album[]);

          // جلب القصائد المستقلة (المرتبطة بمجلد فقط وبدون ألبوم)
          const standaloneTracksData = visibleTracksData.filter(
            (t: any) => t.folder_id != null && t.folder_id !== 0 && !t.album_id
          ).map((t: any) => ({
            ...t,
            folder_id: Number(t.folder_id),
            listens_count: t.listens_count ?? t.play_count ?? 0,
            downloads_count: t.downloads_count ?? t.download_count ?? 0,
          }));
          console.log("[AudioLibrary] standaloneQasaed fetched:", standaloneTracksData);
          setStandaloneQasaed(standaloneTracksData as Track[]);
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

    // إضافة القصائد المستقلة (من مجلدات القصائد) ضمن نفس القسم
    const categoryFolderIds = liveFolders
      .filter(f => f.category === activeCategory && f.folder_type === "qasaed_only")
      .map(f => f.id);
    standaloneQasaed.forEach(track => {
      if (track.folder_id && categoryFolderIds.includes(Number(track.folder_id))) {
        allTracks.push({
          ...track,
          audioUrl: track.audio_url,
          album: "قصيدة مستقلة"
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
   * المجلدات المرئية في القسم النشط الحالي
   */
  const visibleFolders = useMemo(() => {
    return liveFolders.filter(f => f.category === activeCategory);
  }, [liveFolders, activeCategory]);

  /**
   * تصفية وفرز الألبومات بناءً على الفئة، البحث، وخيار الفرز المختار
   */
  const filteredAndSortedAlbums = useMemo(() => {
    // Filter by category AND exclude albums that belong to a folder (they render inside folder view only)
    // folder_id check: null, undefined, 0 are all "no folder" → show in main view
    let result = liveAlbums.filter(album => {
      const hasFolder = album.folder_id != null && album.folder_id !== 0;
      return album.category === activeCategory && !hasFolder;
    });

    console.log("[AudioLibrary] filteredAndSortedAlbums (main view, no folder):", result.map(a => ({ id: a.id, title: a.title, folder_id: a.folder_id })));

    if (searchQuery) {
      const normalizedQuery = normalizeArabic(searchQuery);
      result = result
        .map(album => {
          const albumMatches =
            normalizeArabic(album.title).includes(normalizedQuery) ||
            (album.year && normalizeArabic(String(album.year)).includes(normalizedQuery));

          return {
            ...album,
            tracks: album.tracks.filter(track =>
              albumMatches || normalizeArabic(track.title).includes(normalizedQuery)
            ),
          };
        })
        .filter(
          album =>
            album.tracks.length > 0 ||
            normalizeArabic(album.title).includes(normalizedQuery) ||
            (album.year && normalizeArabic(String(album.year)).includes(normalizedQuery))
        );
    }

    const sortedRest = [...result].sort((a, b) => {
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

    // If there is a sharedAlbumId, dynamically prioritize it to be the first item in the list
    if (sharedAlbumId) {
      const idx = sortedRest.findIndex(album => String(album.id) === String(sharedAlbumId));
      if (idx > -1) {
        const [sharedAlbum] = sortedRest.splice(idx, 1);
        return [sharedAlbum, ...sortedRest];
      }
    }

    return sortedRest;
  }, [searchQuery, activeCategory, liveAlbums, sortBy, sharedAlbumId]);

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
        text: `استمع إلى "${fullName}" بصوت الرادود صالح الدرازي`,
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
    <section id="audio" dir="rtl" className="py-24 md:py-32 pb-36 md:pb-48 scroll-mt-nav bg-background relative overflow-hidden text-start">
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

              {/* أدوات التحكم: الفرز والتشغيل العشوائي والتبديل بين القائمة والشبكة */}
              <div className="w-full flex flex-row-reverse justify-center items-center gap-4 flex-wrap">
                {/* زر تبديل العرض (قائمة / شبكة) */}
                <button
                  onClick={() => setViewMode((prev) => (prev === "list" ? "grid" : "list"))}
                  className="relative group overflow-hidden flex items-center justify-center w-12 h-12 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md transition-all duration-500 hover:border-primary/50 hover:bg-primary/10 shadow-[0_5px_20px_rgba(0,0,0,0.4)] cursor-pointer text-primary"
                  title={viewMode === "list" ? "عرض الشبكة" : "عرض القائمة"}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {viewMode === "list" ? (
                    <LayoutGrid className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-all duration-500" />
                  ) : (
                    <List className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-all duration-500" />
                  )}
                </button>

                {/* زر التشغيل العشوائي للقسم الحالي (أيقونة فقط) */}
                <button
                  onClick={handleShufflePlay}
                  className="relative group overflow-hidden flex items-center justify-center w-12 h-12 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md transition-all duration-500 hover:border-primary/50 hover:bg-primary/10 shadow-[0_5px_20px_rgba(0,0,0,0.4)] cursor-pointer text-primary"
                  title={activeCategory === "sorrow" ? "عشوائي الأحزان" : activeCategory === "joy" ? "عشوائي الأفراح" : "عشوائي الأدعية"}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <Shuffle className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-all duration-500" />
                </button>

                {/* زر الفرز (أيقونة فقط) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative group overflow-hidden flex items-center justify-center w-12 h-12 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md transition-all duration-500 hover:border-primary/50 hover:bg-primary/10 shadow-[0_5px_20px_rgba(0,0,0,0.4)] cursor-pointer text-primary"
                      title={getSortLabel()}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      <ArrowUpDown className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-all duration-500" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="center"
                    sideOffset={12}
                    className="bg-popover/95 dark:bg-black/95 backdrop-blur-3xl border border-primary/20 text-right w-48 rounded-[2rem] p-2 shadow-[0_30px_70px_rgba(0,0,0,0.2)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.9)] z-[150] animate-in fade-in zoom-in-95 duration-300 overflow-hidden"
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
              ) : currentFolderView ? (
                /* ═══════════════════════════════════════ */
                /* ══ IN-PAGE FOLDER VIEW ═══════════════ */
                /* ═══════════════════════════════════════ */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-6"
                >
                  {/* Folder Header: Back button + folder name */}
                  <div className="flex items-center justify-between gap-3 flex-wrap" dir="rtl">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCurrentFolderView(null)}
                        className="relative group overflow-hidden flex items-center justify-center gap-2 px-5 h-10 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md transition-all duration-500 hover:border-primary/50 hover:bg-primary/10 shadow-[0_5px_20px_rgba(0,0,0,0.3)] text-primary text-xs font-bold cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <ArrowRight className="w-3.5 h-3.5 relative z-10" />
                        <span className="relative z-10">رجوع</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-md">
                          {currentFolderView.folder_type === "albums_only" ? (
                            <FolderHeart className="w-4 h-4" />
                          ) : (
                            <Music className="w-4 h-4" />
                          )}
                        </div>
                        <h3 className="text-sm md:text-base font-bold text-foreground">{currentFolderView.name}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Folder content rendering */}
                  {currentFolderView.folder_type === "albums_only" ? (
                    /* ── Albums-Only Folder: Render album cards ── */
                    (() => {
                      const folderAlbums = liveAlbums.filter(a => String(a.folder_id) === String(currentFolderView.id));
                      if (folderAlbums.length === 0) {
                        return (
                          <div className="text-center py-24 text-foreground/20 animate-in fade-in duration-700">
                            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            <p className="text-sm tracking-widest">لا توجد ألبومات في هذا المجلد</p>
                          </div>
                        );
                      }
                      return (
                        <AlbumGrid
                          albums={folderAlbums}
                          onPlay={onPlay}
                          onAction={handleAction}
                          onIncrementStat={incrementTrackStat}
                          expandedAlbumId={expandedAlbumId}
                          setExpandedAlbumId={setExpandedAlbumId}
                          viewMode={viewMode}
                          highlightedTrackId={highlightedTrackId}
                          highlightedAlbumId={highlightedAlbumId}
                        />
                      );
                    })()
                  ) : (
                    /* ── Qasaed-Only Folder: Render golden track cards ── */
                    (() => {
                      const folderTracks = standaloneQasaed.filter(t => String(t.folder_id) === String(currentFolderView.id));
                      if (folderTracks.length === 0) {
                        return (
                          <div className="text-center py-24 text-foreground/20 animate-in fade-in duration-700">
                            <Music className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            <p className="text-sm tracking-widest">لا توجد قصائد في هذا المجلد</p>
                          </div>
                        );
                      }
                      if (viewMode === "grid") {
                        return (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 max-w-6xl mx-auto" dir="rtl">
                            <AnimatePresence mode="popLayout">
                              {folderTracks.map((track, trackIdx) => (
                                <motion.div
                                  key={track.id}
                                  id={`track-${track.id}`}
                                  layout
                                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -20, scale: 0.96 }}
                                  transition={{
                                    duration: 0.3,
                                    ease: [0.16, 1, 0.3, 1],
                                    delay: trackIdx < 8 ? trackIdx * 0.04 : 0,
                                  }}
                                  className="flex"
                                >
                                  <Card
                                    className={cn(
                                      "bg-card/40 border-primary/10 hover:border-primary/30 transition-all duration-500 overflow-hidden group backdrop-blur-2xl rounded-2xl sm:rounded-3xl md:rounded-[1.8rem] shadow-xl flex flex-col justify-between aspect-square p-3 sm:p-4 md:p-5 text-start items-start w-full relative",
                                      highlightedTrackId && String(highlightedTrackId) === String(track.id) &&
                                      "ring-2 ring-primary border-primary/60 bg-primary/10 animate-pulse shadow-[0_0_30px_rgba(197,160,89,0.4)]"
                                    )}
                                    dir="rtl"
                                  >
                                    {/* Decorative background glow */}
                                    <div className="absolute top-0 start-0 w-20 sm:w-32 h-20 sm:h-32 bg-primary/5 rounded-full blur-xl sm:blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors" />

                                    {/* Top Bar: Play Button (Start / Right) + Year Badge & Duration Badge (End / Left) */}
                                    <div className="flex items-center justify-between gap-1 relative z-10 w-full" dir="rtl">
                                      <button
                                        onClick={() => {
                                          incrementTrackStat(track.id, "listens");
                                          const mappedTrack = {
                                            ...track,
                                            audioUrl: track.audio_url,
                                            album: currentFolderView.name
                                          };
                                          const mappedPlaylist = folderTracks.map(t => ({
                                            ...t,
                                            audioUrl: t.audio_url,
                                            album: currentFolderView.name
                                          }));
                                          onPlay(mappedTrack, mappedPlaylist);
                                        }}
                                        className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary border border-primary/20 flex items-center justify-center transition-all hover:scale-110 hover:bg-primary/25 duration-300 shrink-0 shadow-md cursor-pointer group/btn"
                                        title="تشغيل القصيدة"
                                      >
                                        <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current translate-x-[-1px] group-hover/btn:scale-110 transition-transform duration-300" />
                                      </button>

                                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
                                        {(track.year || track.release_year) && (
                                          <span className="inline-flex items-center text-[10px] sm:text-xs font-light text-zinc-400/80 bg-foreground/5 px-1.5 sm:px-2 py-0.5 rounded-full border border-foreground/10 shadow-sm shrink-0">
                                            {track.year || track.release_year}
                                          </span>
                                        )}
                                        {track.duration && (
                                          <span className="inline-flex items-center text-[9px] sm:text-[10px] text-foreground/70 font-mono bg-foreground/5 px-1.5 sm:px-2 py-0.5 rounded-full border border-foreground/10 shadow-sm shrink-0">
                                            {track.duration}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Middle Section: Track Title & Short Description / Subtitle */}
                                    <div className="my-auto relative z-10 text-start w-full" dir="rtl">
                                      <h3 className="text-xs sm:text-sm md:text-base font-bold tracking-tight text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                        {track.title}
                                      </h3>
                                      {(track.description || track.reciter || track.artist || track.subtitle || track.details || track.event_name) && (
                                        <p className="text-[11px] text-zinc-400 line-clamp-1 truncate mt-0.5 font-light">
                                          {track.description || track.reciter || track.artist || track.subtitle || track.details || track.event_name}
                                        </p>
                                      )}
                                    </div>

                                    {/* Bottom Section: Compact Inline Stats Container & Action Buttons */}
                                    <div className="flex items-center justify-between gap-1 relative z-10 w-full" dir="rtl">
                                      <div className="inline-flex items-center justify-start gap-1 sm:gap-1.5 text-[8px] sm:text-[10px] text-foreground/50 dark:text-gray-400 bg-foreground/5 border border-foreground/10 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg backdrop-blur-sm w-auto shrink-0">
                                        <div className="flex items-center gap-0.5">
                                          <Headphones className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary shrink-0 opacity-80" />
                                          <span className="font-medium">{(track.listens_count || 0).toLocaleString("en-US")}</span>
                                        </div>
                                        <div className="w-px h-2 bg-foreground/15 mx-0.5" />
                                        <div className="flex items-center gap-0.5">
                                          <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary shrink-0 opacity-80" />
                                          <span className="font-medium">{(track.downloads_count || 0).toLocaleString("en-US")}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleAction("download", track)}
                                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg hover:bg-primary/20 text-foreground/40 hover:text-primary transition-all p-0"
                                          title="تنزيل"
                                        >
                                          <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleAction("share", track)}
                                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg hover:bg-primary/20 text-foreground/40 hover:text-primary transition-all p-0"
                                          title="مشاركة"
                                        >
                                          <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 max-w-5xl mx-auto">
                          {folderTracks.map((track, trackIdx) => (
                            <motion.div
                              key={track.id}
                              id={`track-${track.id}`}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: trackIdx < 8 ? trackIdx * 0.04 : 0 }}
                            >
                              <Card className={cn(
                                "bg-card/40 border-primary/10 hover:border-primary/30 transition-all duration-500 overflow-hidden group backdrop-blur-2xl rounded-[2rem] shadow-2xl text-start",
                                highlightedTrackId && String(highlightedTrackId) === String(track.id) &&
                                "ring-2 ring-primary border-primary/60 bg-primary/10 animate-pulse shadow-[0_0_30px_rgba(197,160,89,0.4)]"
                              )} dir="rtl">
                                <CardContent className="p-0" dir="rtl">
                                  {/* Golden header — exact same structure as album card header */}
                                  <div className="p-4 sm:p-5 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent flex items-center justify-between gap-4 flex-wrap md:flex-nowrap" dir="rtl">
                                    <div className="flex items-center gap-3 sm:gap-4 text-start">
                                      <button
                                        onClick={() => {
                                          incrementTrackStat(track.id, "listens");
                                          const mappedTrack = {
                                            ...track,
                                            audioUrl: track.audio_url,
                                            album: currentFolderView.name
                                          };
                                          const mappedPlaylist = folderTracks.map(t => ({
                                            ...t,
                                            audioUrl: t.audio_url,
                                            album: currentFolderView.name
                                          }));
                                          onPlay(mappedTrack, mappedPlaylist);
                                        }}
                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary border border-primary/20 flex items-center justify-center transition-all hover:scale-110 hover:bg-primary/25 duration-500 shrink-0 shadow-lg cursor-pointer group/btn"
                                        title="تشغيل القصيدة"
                                      >
                                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current translate-x-[-1px] group-hover/btn:scale-110 transition-transform duration-300" />
                                      </button>
                                      <div className="text-start min-w-0">
                                        <h3 className="text-xs sm:text-sm md:text-base font-bold tracking-tight mb-0.5 truncate text-foreground">
                                          {track.title}
                                        </h3>
                                        <div className="flex items-center gap-2 justify-start">
                                          {track.duration && (
                                            <p className="text-[9px] sm:text-[10px] md:text-xs text-foreground/40 dark:text-gray-400 font-mono">
                                              {track.duration}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Track stats and actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      <div className="flex items-center gap-2.5 text-[9px] sm:text-[10px] md:text-xs text-foreground/40 dark:text-gray-400 bg-foreground/5 border border-foreground/10 px-3 py-1.5 rounded-2xl backdrop-blur-sm">
                                        <div className="flex items-center gap-1">
                                          <Headphones className="w-3 h-3 text-primary opacity-80" />
                                          <span className="font-normal text-foreground/40 dark:text-gray-400">
                                            {(track.listens_count || 0).toLocaleString("en-US")}
                                          </span>
                                        </div>
                                        <div className="w-px h-3 bg-foreground/15" />
                                        <div className="flex items-center gap-1">
                                          <Download className="w-3 h-3 text-primary opacity-80" />
                                          <span className="font-normal text-foreground/40 dark:text-gray-400">
                                            {(track.downloads_count || 0).toLocaleString("en-US")}
                                          </span>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleAction("download", track)}
                                        className="w-8 h-8 rounded-lg hover:bg-primary/20 text-foreground/30 hover:text-primary transition-all p-0"
                                        title="تنزيل"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleAction("share", track)}
                                        className="w-8 h-8 rounded-lg hover:bg-primary/20 text-foreground/30 hover:text-primary transition-all p-0"
                                        title="مشاركة"
                                      >
                                        <Share2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </motion.div>
              ) : (
                /* ═══════════════════════════════════════ */
                /* ══ MAIN LIBRARY VIEW ═════════════════ */
                /* ═══════════════════════════════════════ */
                <>
                  {/* ── Folder Cards Grid ── */}
                  {visibleFolders.length > 0 && (
                    <div className="mb-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto" dir="rtl">
                        <AnimatePresence mode="popLayout">
                          {visibleFolders.map((folder, idx) => {
                            const isAlbumsOnly = folder.folder_type === "albums_only";
                            const folderItemCount = isAlbumsOnly
                              ? liveAlbums.filter(a => String(a.folder_id) === String(folder.id)).length
                              : standaloneQasaed.filter(t => String(t.folder_id) === String(folder.id)).length;

                            return (
                              <motion.div
                                key={folder.id}
                                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -16, scale: 0.97 }}
                                transition={{
                                  duration: 0.35,
                                  ease: [0.16, 1, 0.3, 1],
                                  delay: idx * 0.05,
                                }}
                              >
                                <button
                                  onClick={() => setCurrentFolderView(folder)}
                                  className="w-full text-start group"
                                >
                                  <Card className="bg-card/40 border-primary/10 hover:border-primary/30 transition-all duration-500 overflow-hidden backdrop-blur-2xl rounded-[2rem] shadow-2xl cursor-pointer hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                                    <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4" dir="rtl">
                                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                        {/* Glowing gold icon */}
                                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary border border-primary/20 flex items-center justify-center transition-all group-hover:scale-110 duration-500 shrink-0 shadow-lg">
                                          {isAlbumsOnly ? (
                                            <FolderHeart className="w-5 h-5" />
                                          ) : (
                                            <Music className="w-5 h-5" />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <h3 className="text-xs sm:text-sm md:text-base font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors duration-300">
                                            {folder.name}
                                          </h3>
                                          <p className="text-[9px] sm:text-[10px] text-foreground/40 mt-0.5">
                                            {isAlbumsOnly
                                              ? `${folderItemCount} ألبوم`
                                              : `${folderItemCount} قصيدة`
                                            }
                                          </p>
                                        </div>
                                      </div>
                                      {/* Arrow indicator */}
                                      <div className="w-8 h-8 rounded-xl border border-primary/15 bg-primary/5 flex items-center justify-center text-primary/50 group-hover:text-primary group-hover:border-primary/30 group-hover:bg-primary/10 transition-all duration-300 shrink-0">
                                        <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                                      </div>
                                    </CardContent>
                                  </Card>
                                </button>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* ── Album Tabs Content ── */}
                  <TabsContent value="sorrow" className="mt-0 focus-visible:outline-none">
                    <AlbumGrid
                      albums={visibleAlbums}
                      onPlay={onPlay}
                      onAction={handleAction}
                      onIncrementStat={incrementTrackStat}
                      expandedAlbumId={expandedAlbumId}
                      setExpandedAlbumId={setExpandedAlbumId}
                      viewMode={viewMode}
                      highlightedTrackId={highlightedTrackId}
                      highlightedAlbumId={highlightedAlbumId}
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
                      viewMode={viewMode}
                      highlightedTrackId={highlightedTrackId}
                      highlightedAlbumId={highlightedAlbumId}
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
                      viewMode={viewMode}
                      highlightedTrackId={highlightedTrackId}
                      highlightedAlbumId={highlightedAlbumId}
                    />
                  </TabsContent>

                  {/* Show All Button */}
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
                          onClick={handleShowAll}
                          whileHover={{ scale: 1.03, translateY: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className="relative group overflow-hidden flex items-center justify-center gap-2 px-5 h-10 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md transition-all duration-500 hover:border-primary/50 hover:bg-primary/10 shadow-[0_5px_20px_rgba(0,0,0,0.3)] text-primary text-xs font-bold cursor-pointer"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                          <span className="relative z-10">عرض الكل</span>
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
  setExpandedAlbumId,
  viewMode = "list",
  highlightedTrackId,
  highlightedAlbumId
}: {
  albums: any[],
  onPlay: any,
  onAction: (action: string, track: any) => void,
  onIncrementStat: (trackId: string | number, type: "listens" | "downloads") => void,
  expandedAlbumId: string | number | null,
  setExpandedAlbumId: (id: string | number | null) => void,
  viewMode?: "list" | "grid",
  highlightedTrackId?: string | number | null,
  highlightedAlbumId?: string | number | null
}) {
  const [playerState, setPlayerState] = useState<{ isActive: boolean; isMinimized: boolean }>(() => {
    if (typeof window !== "undefined" && (window as any).__playerState) {
      return (window as any).__playerState;
    }
    return { isActive: false, isMinimized: false };
  });

  useEffect(() => {
    const handlePlayerStateChange = (e: Event) => {
      const customEvt = e as CustomEvent<{ isActive: boolean; isMinimized: boolean }>;
      if (customEvt.detail) {
        setPlayerState(customEvt.detail);
      }
    };

    if (typeof window !== "undefined" && (window as any).__playerState) {
      setPlayerState((window as any).__playerState);
    }

    window.addEventListener("player-state-change", handlePlayerStateChange);
    return () => {
      window.removeEventListener("player-state-change", handlePlayerStateChange);
    };
  }, []);

  // Lock background body scroll & touch interactions when Grid view album is expanded to prevent scroll leakage
  useEffect(() => {
    if (viewMode === "grid" && expandedAlbumId) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [viewMode, expandedAlbumId]);

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

  const selectedAlbumForGrid = albums.find((a) => a.id === expandedAlbumId);

  return (
    <>
      <div
        dir="rtl"
        className={cn(
          "grid transition-all duration-500",
          viewMode === "grid"
            ? "grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4 md:gap-6 max-w-6xl mx-auto"
            : "grid-cols-1 gap-3 max-w-5xl mx-auto"
        )}
      >
        <AnimatePresence mode="popLayout">
          {albums.map((album, idx) => {
            const totalListens = album.tracks
              ? album.tracks.reduce((sum: number, t: any) => sum + (t.listens_count || 0), 0)
              : 0;
            const totalDownloads = album.tracks
              ? album.tracks.reduce((sum: number, t: any) => sum + (t.downloads_count || 0), 0)
              : 0;

            if (viewMode === "grid") {
              return (
                <motion.div
                  key={album.id}
                  id={`album-${album.id}`}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.96 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                    delay: idx < 6 ? idx * 0.04 : (idx % 6) * 0.04,
                  }}
                  className="flex"
                >
                  <Card className={cn(
                    "bg-card/40 border-primary/10 hover:border-primary/30 transition-all duration-500 overflow-hidden group backdrop-blur-2xl rounded-2xl sm:rounded-3xl md:rounded-[1.8rem] shadow-xl flex flex-col justify-between aspect-square p-2.5 sm:p-4 md:p-5 text-start items-start w-full relative",
                    highlightedAlbumId && String(highlightedAlbumId) === String(album.id) && !highlightedTrackId &&
                    "ring-2 ring-primary border-primary/60 bg-primary/10 animate-pulse shadow-[0_0_30px_rgba(197,160,89,0.4)]"
                  )} dir="rtl">
                    {/* Decorative background glow */}
                    <div className="absolute top-0 start-0 w-20 sm:w-32 h-20 sm:h-32 bg-primary/5 rounded-full blur-xl sm:blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors" />

                    {/* Top Bar: Quick Play Button (Right / Start) + Status Label & Year Badges (Left / End - Strictly Single Line) */}
                    <div className="flex items-center justify-between gap-1 relative z-10 w-full" dir="rtl">
                      <button
                        onClick={() => handleAlbumPlay(album, idx)}
                        className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary border border-primary/20 flex items-center justify-center transition-all hover:scale-110 hover:bg-primary/25 duration-300 shrink-0 shadow-md cursor-pointer group/btn"
                        title="تشغيل الألبوم كاملاً"
                      >
                        <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 fill-current translate-x-[-1px] group-hover/btn:scale-110 transition-transform duration-300" />
                      </button>
                      <div className="flex flex-row flex-nowrap items-center gap-1 justify-end shrink-0 whitespace-nowrap overflow-hidden">
                        {album.status_label && (
                          <span className="inline-flex items-center text-[10px] sm:text-xs font-light text-primary bg-primary/20 px-1.5 sm:px-2 py-0.5 rounded-full border border-primary/15 shadow-sm shrink-0">
                            {album.status_label}
                          </span>
                        )}
                        <span className="inline-flex items-center text-[10px] sm:text-xs font-light text-zinc-400/80 bg-foreground/5 px-1.5 sm:px-2 py-0.5 rounded-full border border-foreground/10 shadow-sm shrink-0">
                          {album.year}
                        </span>
                      </div>
                    </div>

                    {/* Middle Section: Album Title Only (Bottom year removed) */}
                    <div className="my-auto relative z-10 text-start w-full" dir="rtl">
                      <h3 className="text-[11px] sm:text-sm md:text-base font-bold tracking-tight text-foreground leading-snug line-clamp-3">
                        {album.title}
                      </h3>
                    </div>

                    {/* Bottom Section: Compact Inline Stats Container (Right) & Sleek Expand Icon Button (Left) */}
                    <div className="flex items-center justify-between gap-1 relative z-10 w-full" dir="rtl">
                      {/* Compact inline statistics container (w-auto, justify-start, gap-2) */}
                      <div className="inline-flex items-center justify-start gap-1 sm:gap-2 text-[8px] sm:text-[10px] text-foreground/50 dark:text-gray-400 bg-foreground/5 border border-foreground/10 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg backdrop-blur-sm w-auto shrink-0">
                        <div className="flex items-center gap-0.5">
                          <Headphones className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary shrink-0 opacity-80" />
                          <span className="font-medium">{totalListens.toLocaleString("en-US")}</span>
                        </div>
                        <div className="w-px h-2 bg-foreground/15 mx-0.5" />
                        <div className="flex items-center gap-0.5">
                          <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary shrink-0 opacity-80" />
                          <span className="font-medium">{totalDownloads.toLocaleString("en-US")}</span>
                        </div>
                      </div>

                      {/* Minimalist expand icon button (No track count text) */}
                      <button
                        onClick={() => setExpandedAlbumId(album.id)}
                        className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg sm:rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/20 text-primary flex items-center justify-center transition-all cursor-pointer shadow-sm group/btn shrink-0"
                        title="تصفح القصائد"
                      >
                        <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover/btn:translate-y-0.5 transition-transform" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            }

            // LIST VIEW (Refined with strict RTL layout & subtle typography)
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
                  delay: idx < 5 ? idx * 0.05 : (idx % 5) * 0.05,
                }}
              >
                <Card className={cn(
                  "bg-card/40 border-primary/10 hover:border-primary/30 transition-all duration-500 overflow-hidden group backdrop-blur-2xl rounded-[2rem] shadow-2xl text-start",
                  highlightedAlbumId && String(highlightedAlbumId) === String(album.id) && !highlightedTrackId &&
                  "ring-2 ring-primary border-primary/60 bg-primary/10 animate-pulse shadow-[0_0_30px_rgba(197,160,89,0.4)]"
                )} dir="rtl">
                  <CardContent className="p-0" dir="rtl">
                    {/* ترويسة الألبوم */}
                    <div className="p-3 sm:p-4 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent flex items-center justify-between gap-4 flex-wrap md:flex-nowrap" dir="rtl">
                      <div className="flex items-center gap-3 sm:gap-4 text-start">
                        <button
                          onClick={() => handleAlbumPlay(album, idx)}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary border border-primary/20 flex items-center justify-center transition-all hover:scale-110 hover:bg-primary/25 duration-500 shrink-0 shadow-lg cursor-pointer group/btn"
                          title="تشغيل الألبوم كاملاً"
                        >
                          <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current translate-x-[-1px] group-hover/btn:scale-110 transition-transform duration-300" />
                        </button>
                        <div className="text-start min-w-0">
                          <h3 className="text-xs sm:text-sm md:text-base font-bold tracking-tight mb-0.5 truncate text-foreground">
                            {album.title}
                          </h3>
                          <div className="flex items-center gap-2 justify-start">
                            {album.status_label && (
                              <span className="inline-flex items-center text-[10px] sm:text-xs font-light text-primary bg-primary/20 px-1.5 sm:px-2 py-0.5 rounded-full border border-primary/15 shadow-sm shrink-0">
                                {album.status_label}
                              </span>
                            )}
                            <p className="inline-flex items-center text-[10px] sm:text-xs font-light text-zinc-400/80 bg-foreground/5 px-1.5 sm:px-2 py-0.5 rounded-full border border-foreground/10 shadow-sm shrink-0">
                              {album.year}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* إحصائيات الألبوم الكلية */}
                      <div className="flex items-center gap-2.5 text-[9px] sm:text-[10px] md:text-xs text-foreground/40 dark:text-gray-400 bg-foreground/5 border border-foreground/10 px-3 py-1.5 rounded-2xl backdrop-blur-sm shrink-0 self-center">
                        <div className="flex items-center gap-1">
                          <Headphones className="w-3 h-3 text-primary opacity-80" />
                          <span className="font-normal text-foreground/40 dark:text-gray-400">
                            {totalListens.toLocaleString("en-US")}
                          </span>
                        </div>
                        <div className="w-px h-3 bg-foreground/15" />
                        <div className="flex items-center gap-1">
                          <Download className="w-3 h-3 text-primary opacity-80" />
                          <span className="font-normal text-foreground/40 dark:text-gray-400">
                            {totalDownloads.toLocaleString("en-US")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* قائمة القصائد */}
                    <div className="px-2 pb-1.5" dir="rtl">
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
                          <AccordionTrigger className="hover:no-underline py-2.5 px-4 rounded-xl hover:bg-primary/5 transition-all text-[9px] uppercase opacity-70 hover:opacity-100 flex gap-2 justify-between flex-row group/trigger">
                            <div className="flex items-center gap-2 flex-row">
                              <span className="group-data-[state=open]/text-primary uppercase text-[9px] md:text-xs font-light">
                                تصفح القصائد
                              </span>
                              <span className="w-5 h-5 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-[9px] border border-primary/10">
                                {album.tracks ? album.tracks.length : 0}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 space-y-1.5 px-2 max-h-80 overflow-y-auto pb-8 pe-1.5 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary/60 [scrollbar-width:thin] [scrollbar-color:rgba(197,160,89,0.3)_transparent]">
                            {album.tracks &&
                              album.tracks.map((track: any, trackIdx: number) => (
                                <div
                                  key={track.id}
                                  id={`track-${track.id}`}
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded-xl bg-foreground/5 hover:bg-primary/10 group/item transition-all border border-transparent hover:border-primary/5 gap-2 flex-row",
                                    highlightedTrackId && String(highlightedTrackId) === String(track.id) &&
                                    "ring-2 ring-primary border-primary/50 bg-primary/20 animate-pulse shadow-[0_0_20px_rgba(197,160,89,0.4)]"
                                  )}
                                  dir="rtl"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0 flex-row">
                                    <div className="flex items-center gap-3 flex-row">
                                      <Button
                                        onClick={() => handleTrackPlay(track, album)}
                                        className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0 p-0 shadow-sm"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                      </Button>
                                      <div className="flex items-center justify-center min-w-[1.8rem] h-6 rounded-md bg-white dark:bg-primary/5 border border-primary/10">
                                        <span className="text-[10px] font-light text-primary/60">
                                          {(track.order || trackIdx + 1)
                                            .toString()
                                            .padStart(2, "0")}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="min-w-0 text-start flex-1 cursor-default">
                                      <span className="text-[11px] md:text-sm font-light block truncate leading-tight group-hover/item:text-primary transition-colors text-foreground">
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

      {/* Modern Glassmorphic Container & Full-Screen Blurred Backdrop for Grid View Tracklist */}
      <AnimatePresence mode="wait">
        {viewMode === "grid" && selectedAlbumForGrid && (() => {
          const modalListens = selectedAlbumForGrid.tracks
            ? selectedAlbumForGrid.tracks.reduce((sum: number, t: any) => sum + (t.listens_count || 0), 0)
            : 0;
          const modalDownloads = selectedAlbumForGrid.tracks
            ? selectedAlbumForGrid.tracks.reduce((sum: number, t: any) => sum + (t.downloads_count || 0), 0)
            : 0;

          // Dynamic top and bottom boundary offsets for strict viewport isolation (above nav bar z-[110] and audio player z-[160])
          const topOffsetClass = "top-20 sm:top-24 md:top-28";
          let bottomOffsetClass = "bottom-[6.5rem] sm:bottom-[7rem]"; // Stops strictly ABOVE bottom navigation bar (fixed bottom-6)

          if (playerState.isActive) {
            if (playerState.isMinimized) {
              // Mini player active: lock bottom edge right above mini player bar
              bottomOffsetClass = "bottom-[10.5rem] sm:bottom-[11.5rem]";
            } else {
              // Full player active: lock bottom edge right above full player bar
              bottomOffsetClass = "bottom-[14.5rem] sm:bottom-[15.5rem]";
            }
          }

          return (
            <React.Fragment key={`grid-album-portal-${selectedAlbumForGrid.id}`}>
              {/* 1. Full Screen Viewport Backdrop Overlay (z-40) with touch-none and overscroll-contain */}
              <motion.div
                key="grid-album-full-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 w-screen h-screen z-40 bg-black/60 backdrop-blur-md cursor-pointer touch-none overscroll-contain"
                onClick={() => setExpandedAlbumId(null)}
              />

              {/* 2. Expanded Album Card Wrapper (z-50) */}
              <motion.div
                key="grid-album-card-wrapper"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "fixed inset-x-0 z-50 flex items-start justify-center px-3 sm:px-4 pointer-events-none transition-all duration-500 ease-in-out overscroll-contain",
                  topOffsetClass,
                  bottomOffsetClass
                )}
                dir="rtl"
              >
                <motion.div
                  key={`grid-album-modal-${selectedAlbumForGrid.id}`}
                  initial={{ scale: 0.96, opacity: 0, y: -16 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.96, opacity: 0, y: -16 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="pointer-events-auto relative w-[calc(100vw-1.5rem)] max-w-lg h-auto max-h-full bg-card/95 dark:bg-black/95 border border-primary/20 backdrop-blur-3xl rounded-3xl sm:rounded-[2.2rem] p-3.5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col text-start transition-all duration-500 ease-in-out overscroll-contain cursor-default"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Background Glow */}
                  <div className="absolute top-0 start-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-primary/10 shrink-0 gap-2">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <button
                        onClick={() =>
                          handleAlbumPlay(
                            selectedAlbumForGrid,
                            albums.findIndex((a) => a.id === selectedAlbumForGrid.id)
                          )
                        }
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary border border-primary/20 flex items-center justify-center hover:scale-105 transition-all shadow-lg cursor-pointer shrink-0 group/playbtn"
                        title="تشغيل الألبوم كاملاً"
                      >
                        <Play className="w-4 h-4 fill-current translate-x-[-1px] group-hover/playbtn:scale-110 transition-transform duration-300" />
                      </button>
                      <div className="text-start min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base md:text-lg font-bold text-foreground truncate leading-snug">
                          {selectedAlbumForGrid.title}
                        </h3>
                        {/* Sleek RTL flex row for Year, Status Label & Stats */}
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-foreground/70 flex-wrap mt-0.5">
                          <span className="font-semibold text-foreground/80 text-[10px] sm:text-xs">{selectedAlbumForGrid.year}</span>
                          {selectedAlbumForGrid.status_label && (
                            <span className="inline-flex items-center bg-primary/20 text-primary px-1.5 sm:px-2 py-0.5 rounded-full font-bold text-[9px] sm:text-[10px] border border-primary/15 shadow-sm">
                              {selectedAlbumForGrid.status_label}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 text-[9px] sm:text-[11px] text-foreground/50 dark:text-gray-400 bg-foreground/5 border border-foreground/10 px-1.5 sm:px-2 py-0.5 rounded-lg backdrop-blur-sm">
                            <div className="flex items-center gap-1">
                              <Headphones className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary opacity-80" />
                              <span>{modalListens.toLocaleString("en-US")}</span>
                            </div>
                            <div className="w-px h-2.5 bg-foreground/15" />
                            <div className="flex items-center gap-1">
                              <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary opacity-80" />
                              <span>{modalDownloads.toLocaleString("en-US")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedAlbumId(null)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground/40 hover:text-foreground flex items-center justify-center transition-all cursor-pointer shrink-0"
                      title="إغلاق"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  {/* Premium Custom Scrollbar Tracklist with Mobile Touch-Pan Isolation */}
                  <div
                    className="py-2.5 sm:py-3 space-y-1.5 sm:space-y-2 overflow-y-auto flex-1 pe-1 ps-0.5 transition-all duration-500 ease-in-out [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary/60 [scrollbar-width:thin] [scrollbar-color:rgba(197,160,89,0.3)_transparent] overscroll-contain touch-pan-y"
                    style={{ touchAction: "pan-y" }}
                  >
                    {selectedAlbumForGrid.tracks &&
                      selectedAlbumForGrid.tracks.map((track: any, trackIdx: number) => (
                        <div
                          key={track.id}
                          id={`track-${track.id}`}
                          className={cn(
                            "flex items-center justify-between p-2 sm:p-3 rounded-xl bg-foreground/5 hover:bg-primary/10 transition-all border border-transparent hover:border-primary/10 gap-2 sm:gap-3 group/item",
                            highlightedTrackId && String(highlightedTrackId) === String(track.id) &&
                            "ring-2 ring-primary border-primary/50 bg-primary/20 animate-pulse shadow-[0_0_20px_rgba(197,160,89,0.4)]"
                          )}
                        >
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <Button
                              onClick={() => handleTrackPlay(track, selectedAlbumForGrid)}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0 p-0 shadow-sm"
                            >
                              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                            </Button>

                            <div className="flex items-center justify-center min-w-[1.5rem] sm:min-w-[1.8rem] h-5 sm:h-6 rounded-md bg-white dark:bg-primary/5 border border-primary/10 shrink-0">
                              <span className="text-[9px] sm:text-[10px] font-light text-primary/60">
                                {(track.order || trackIdx + 1).toString().padStart(2, "0")}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1 text-start">
                              <span className="text-xs sm:text-sm font-medium block truncate text-foreground group-hover/item:text-primary transition-colors">
                                {track.title}
                              </span>
                              {track.duration && (
                                <span className="text-[9px] sm:text-[10px] text-foreground/40 font-mono block truncate">
                                  {track.duration}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onAction("download", track)}
                              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg hover:bg-primary/20 text-foreground/30 hover:text-primary transition-all p-0"
                              title="تنزيل"
                            >
                              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onAction("share", track)}
                              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg hover:bg-primary/20 text-foreground/30 hover:text-primary transition-all p-0"
                              title="مشاركة"
                            >
                              <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </motion.div>
              </motion.div>
            </React.Fragment>
          );
        })()}
      </AnimatePresence>
    </>
  );
}
