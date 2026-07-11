"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard, FolderHeart, Music, Mail, LogOut,
  Plus, Edit2, Trash2, ExternalLink, Loader2, Search,
  CheckCircle2, RefreshCw, Eye, AlertTriangle, Link2,
  Youtube, Video,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

// ─────────────────────────────────────────────
// YOUTUBE HELPERS
// ─────────────────────────────────────────────
/**
 * Extracts a YouTube video ID from any valid YouTube URL format:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * Returns null if the URL doesn't match any known format.
 */
function extractYouTubeId(url: string): string | null {
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

function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

// ─────────────────────────────────────────────
// TYPES  –  all optional fields to be defensive
// ─────────────────────────────────────────────
interface Album {
  id: number;
  title: string;
  year?: string | number | null;
  category?: string | null;
  created_at?: string | null;
}

interface AudioTrack {
  id: number;
  title: string;
  audio_url?: string | null;
  album_id?: number | null;
  duration?: string | null;
  order?: number | null;
  created_at?: string | null;
}

interface Message {
  id: number | string;
  name?: string | null;
  email?: string | null;
  subject?: string | null;
  message?: string | null;
  created_at?: string | null;
}

interface VideoItem {
  id: number | string;
  title?: string | null;
  description?: string | null;
  youtube_url?: string | null;
  category?: string | null;
  sub_category?: string | null;
  display_order?: number | null;
  created_at?: string | null;
}

// ─────────────────────────────────────────────
// SAFE HELPERS
// ─────────────────────────────────────────────
function safeStr(val: unknown, fallback = "—"): string {
  if (val === null || val === undefined || val === "") return fallback;
  return String(val);
}

function safeDate(val: unknown): string {
  if (!val) return "—";
  try {
    return new Date(String(val)).toLocaleDateString("ar-BH", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return "—"; }
}

function getCategoryLabel(cat: string | null | undefined): string {
  switch (cat) {
    case "sorrow": return "الأحزان (عزاء)";
    case "supplications": return "الأدعية والمناجاة";
    case "joy": return "الأفراح والمواليد";
    default: return safeStr(cat, "غير مصنف");
  }
}

function getVideoCategoryLabel(cat: string | null | undefined): string {
  switch (cat) {
    case "new": return "الجديد";
    case "popular": return "الأكثر مشاهدة";
    case "featured": return "مختارات";
    default: return safeStr(cat, "—");
  }
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
type Tab = "overview" | "albums" | "audios" | "messages" | "videos";

export default function AdminDashboard() {
  const router = useRouter();

  // ── state ──────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [audios, setAudios] = useState<AudioTrack[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // modal visibility
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // album form
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumYear, setAlbumYear] = useState("");
  const [albumCategory, setAlbumCategory] = useState("sorrow");

  // audio form
  const [editingAudio, setEditingAudio] = useState<AudioTrack | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioAlbumId, setAudioAlbumId] = useState("");
  const [audioDuration, setAudioDuration] = useState("");
  const [audioOrder, setAudioOrder] = useState("0");

  // video form
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState("");
  const [videoCategory, setVideoCategory] = useState("new");
  const [videoSubCategory, setVideoSubCategory] = useState("");
  const [videoOrder, setVideoOrder] = useState("0");
  const [videoUrlError, setVideoUrlError] = useState("");
  // live preview ID derived from typed URL
  const videoPreviewId = extractYouTubeId(videoYoutubeUrl);

  // message viewer
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // delete
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "album" | "audio" | "message" | "video";
    id: number | string;
    label?: string;
  } | null>(null);

  // ── DATA FETCHING ───────────────────────────
  const fetchData = useCallback(async () => {
    console.log("[Dashboard] Starting data fetch…");
    setLoading(true);
    setFetchError(null);

    // --- albums (required, fatal if fails) ---
    try {
      console.log("[Dashboard] Fetching albums…");
      const { data, error } = await supabase
        .from("albums")
        .select("id, title, year, category, created_at");
      if (error) throw new Error(`albums: ${error.message}`);
      console.log(`[Dashboard] Albums OK – ${data?.length ?? 0} rows`);
      setAlbums(data ?? []);
    } catch (err: any) {
      console.error("[Dashboard] Albums fetch failed:", err);
      setFetchError(err.message);
      setLoading(false);
      return;
    }

    // --- audios (non-fatal) ---
    try {
      console.log("[Dashboard] Fetching audios…");
      const { data, error } = await supabase
        .from("audios")
        .select(`id, title, audio_url, album_id, duration, "order", created_at`);
      if (error) {
        console.error("[Dashboard] Audios error:", error);
        toast({ title: "تحذير – القصائد", description: error.message, variant: "destructive" });
        setAudios([]);
      } else {
        console.log(`[Dashboard] Audios OK – ${data?.length ?? 0} rows`);
        setAudios(data ?? []);
      }
    } catch (err: any) {
      console.error("[Dashboard] Audios exception:", err);
      setAudios([]);
    }

    // --- videos (non-fatal) ---
    try {
      console.log("[Dashboard] Fetching videos…");
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, description, youtube_url, category, sub_category, display_order, created_at");
      if (error) {
        console.error("[Dashboard] Videos error:", error);
        toast({ title: "تحذير – المرئيات", description: error.message, variant: "destructive" });
        setVideos([]);
      } else {
        console.log(`[Dashboard] Videos OK – ${data?.length ?? 0} rows`);
        setVideos(data ?? []);
      }
    } catch (err: any) {
      console.error("[Dashboard] Videos exception:", err);
      setVideos([]);
    }

    // --- messages (non-fatal) ---
    try {
      console.log("[Dashboard] Fetching messages…");
      const { data, error } = await supabase
        .from("messages")
        .select("id, name, email, subject, message, created_at");
      if (error) {
        console.error("[Dashboard] Messages error:", error);
        setMessages([]);
      } else {
        console.log(`[Dashboard] Messages OK – ${data?.length ?? 0} rows`);
        setMessages(data ?? []);
      }
    } catch (err: any) {
      console.error("[Dashboard] Messages exception:", err);
      setMessages([]);
    }

    setLoading(false);
    console.log("[Dashboard] Fetch complete.");
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── LOGOUT ──────────────────────────────────
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      router.push("/admin/login");
      router.refresh();
    } catch (e: any) { console.error("[Dashboard] Logout error:", e); }
  };

  // ── ALBUM CRUD ──────────────────────────────
  function openCreateAlbumModal() {
    setEditingAlbum(null);
    setAlbumTitle(""); setAlbumYear(new Date().getFullYear().toString()); setAlbumCategory("sorrow");
    setAlbumModalOpen(true);
  }
  function openEditAlbumModal(album: Album) {
    setEditingAlbum(album);
    setAlbumTitle(safeStr(album.title, ""));
    setAlbumYear(safeStr(album.year, new Date().getFullYear().toString()));
    setAlbumCategory(album.category ?? "sorrow");
    setAlbumModalOpen(true);
  }
  async function handleSaveAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!albumTitle.trim()) {
      toast({ title: "خطأ", description: "اسم الألبوم مطلوب.", variant: "destructive" }); return;
    }
    const yearNum = parseInt(albumYear, 10);
    const payload = { title: albumTitle.trim(), year: isNaN(yearNum) ? null : yearNum, category: albumCategory };
    console.log("[Dashboard] Saving album:", payload);
    setActionLoading(true);
    try {
      if (editingAlbum) {
        const { error } = await supabase.from("albums").update(payload).eq("id", editingAlbum.id);
        if (error) throw error;
        toast({ title: "✓ تم التحديث", description: "تم تحديث بيانات الألبوم." });
      } else {
        const { error } = await supabase.from("albums").insert([payload]);
        if (error) throw error;
        toast({ title: "✓ تم الإضافة", description: "تم إنشاء الألبوم بنجاح." });
      }
      setAlbumModalOpen(false); await fetchData();
    } catch (err: any) {
      console.error("[Dashboard] Save album error:", err);
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  }

  // ── AUDIO CRUD ──────────────────────────────
  function openCreateAudioModal() {
    setEditingAudio(null);
    setAudioTitle(""); setAudioUrl(""); setAudioAlbumId(albums[0]?.id?.toString() ?? "");
    setAudioDuration(""); setAudioOrder("0");
    setAudioModalOpen(true);
  }
  function openEditAudioModal(audio: AudioTrack) {
    setEditingAudio(audio);
    setAudioTitle(safeStr(audio.title, ""));
    setAudioUrl(safeStr(audio.audio_url, ""));
    setAudioAlbumId(audio.album_id != null ? String(audio.album_id) : "");
    setAudioDuration(safeStr(audio.duration, ""));
    setAudioOrder(audio.order != null ? String(audio.order) : "0");
    setAudioModalOpen(true);
  }
  async function handleSaveAudio(e: React.FormEvent) {
    e.preventDefault();
    if (!audioTitle.trim() || !audioUrl.trim()) {
      toast({ title: "خطأ", description: "العنوان والرابط الصوتي مطلوبان.", variant: "destructive" }); return;
    }
    const orderNum = parseInt(audioOrder, 10);
    const albumIdNum = parseInt(audioAlbumId, 10);
    const payload = {
      title: audioTitle.trim(), audio_url: audioUrl.trim(),
      album_id: isNaN(albumIdNum) ? null : albumIdNum,
      duration: audioDuration.trim() || null,
      order: isNaN(orderNum) ? 0 : orderNum,
    };
    console.log("[Dashboard] Saving audio:", payload);
    setActionLoading(true);
    try {
      if (editingAudio) {
        const { error } = await supabase.from("audios").update(payload).eq("id", editingAudio.id);
        if (error) throw error;
        toast({ title: "✓ تم التحديث", description: "تم تحديث بيانات القصيدة." });
      } else {
        const { error } = await supabase.from("audios").insert([payload]);
        if (error) throw error;
        toast({ title: "✓ تم الإضافة", description: "تمت إضافة القصيدة بنجاح." });
      }
      setAudioModalOpen(false); await fetchData();
    } catch (err: any) {
      console.error("[Dashboard] Save audio error:", err);
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  }

  // ── VIDEO CRUD ──────────────────────────────
  function openCreateVideoModal() {
    setEditingVideo(null);
    setVideoTitle(""); setVideoDescription(""); setVideoYoutubeUrl("");
    setVideoCategory("new"); setVideoSubCategory(""); setVideoOrder("0");
    setVideoUrlError("");
    setVideoModalOpen(true);
  }
  function openEditVideoModal(video: VideoItem) {
    setEditingVideo(video);
    setVideoTitle(safeStr(video.title, ""));
    setVideoDescription(safeStr(video.description, ""));
    setVideoYoutubeUrl(safeStr(video.youtube_url, ""));
    setVideoCategory(video.category ?? "new");
    setVideoSubCategory(safeStr(video.sub_category, ""));
    setVideoOrder(video.display_order != null ? String(video.display_order) : "0");
    setVideoUrlError("");
    setVideoModalOpen(true);
  }
  function handleVideoUrlChange(url: string) {
    setVideoYoutubeUrl(url);
    if (url && !isValidYouTubeUrl(url)) {
      setVideoUrlError("الرابط غير صالح. يرجى لصق رابط يوتيوب صحيح.");
    } else {
      setVideoUrlError("");
    }
  }
  async function handleSaveVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!videoTitle.trim()) {
      toast({ title: "خطأ", description: "عنوان الفيديو مطلوب.", variant: "destructive" }); return;
    }
    if (!videoYoutubeUrl.trim() || !isValidYouTubeUrl(videoYoutubeUrl)) {
      toast({ title: "خطأ", description: "يرجى إدخال رابط يوتيوب صالح.", variant: "destructive" }); return;
    }
    const orderNum = parseInt(videoOrder, 10);
    const payload = {
      title: videoTitle.trim(),
      description: videoDescription.trim(),
      youtube_url: videoYoutubeUrl.trim(),
      category: videoCategory,
      sub_category: videoSubCategory.trim(),
      display_order: isNaN(orderNum) ? 0 : orderNum,
    };
    console.log("[Dashboard] Saving video:", payload);
    setActionLoading(true);
    try {
      if (editingVideo) {
        const { error } = await supabase.from("videos").update(payload).eq("id", editingVideo.id);
        if (error) throw error;
        toast({ title: "✓ تم التحديث", description: "تم تحديث بيانات الفيديو." });
      } else {
        const { error } = await supabase.from("videos").insert([payload]);
        if (error) throw error;
        toast({ title: "✓ تم الإضافة", description: "تمت إضافة الفيديو بنجاح." });
      }
      setVideoModalOpen(false); await fetchData();
    } catch (err: any) {
      console.error("[Dashboard] Save video error:", err);
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  }

  // ── DELETE ──────────────────────────────────
  function requestDelete(
    type: "album" | "audio" | "message" | "video",
    id: number | string, label?: string,
  ) { setDeleteTarget({ type, id, label }); setDeleteConfirmOpen(true); }

  async function executeDelete() {
    if (!deleteTarget) return;
    const tableMap: Record<string, string> = {
      album: "albums", audio: "audios", message: "messages", video: "videos",
    };
    const tableName = tableMap[deleteTarget.type];
    console.log(`[Dashboard] Deleting from ${tableName}, id=${deleteTarget.id}`);
    setActionLoading(true);
    try {
      const { error } = await supabase.from(tableName).delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "✓ تم الحذف", description: "تم حذف العنصر بنجاح." });
      setDeleteConfirmOpen(false); setDeleteTarget(null);
      if (messageModalOpen) setMessageModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error("[Dashboard] Delete error:", err);
      toast({ title: "خطأ في الحذف", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  }

  // ── DERIVED DATA ────────────────────────────
  const getAlbumTitle = (id: number | null | undefined) => {
    if (id == null) return "—";
    return albums.find((a) => a.id === id)?.title ?? `ألبوم #${id}`;
  };
  const q = searchQuery.toLowerCase();
  const filteredAlbums = albums.filter(a =>
    safeStr(a.title).toLowerCase().includes(q) || safeStr(a.year).includes(q) || getCategoryLabel(a.category).includes(q));
  const filteredAudios = audios.filter(a =>
    safeStr(a.title).toLowerCase().includes(q) || getAlbumTitle(a.album_id).toLowerCase().includes(q) || safeStr(a.audio_url).toLowerCase().includes(q));
  const filteredVideos = videos.filter(v =>
    safeStr(v.title).toLowerCase().includes(q) || safeStr(v.youtube_url).toLowerCase().includes(q) || getVideoCategoryLabel(v.category).includes(q));
  const filteredMessages = messages.filter(m =>
    safeStr(m.name).toLowerCase().includes(q) || safeStr(m.email).toLowerCase().includes(q) ||
    safeStr(m.subject).toLowerCase().includes(q) || safeStr(m.message).toLowerCase().includes(q));

  // ── REUSABLE UI PIECES ──────────────────────
  const NavBtn = ({ tab, icon: Icon, label, count }: { tab: Tab; icon: React.ElementType; label: string; count?: number }) => (
    <button
      onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
      className={`w-full flex items-center gap-3 px-4 h-12 rounded-xl text-xs font-semibold transition-all duration-200 ${activeTab === tab ? "bg-primary text-primary-foreground shadow-lg" : "text-foreground/60 hover:bg-white/5 hover:text-foreground"
        }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}{count != null ? ` (${count})` : ""}</span>
    </button>
  );

  const SearchBar = ({ placeholder }: { placeholder: string }) => (
    <div className="relative max-w-md">
      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 pointer-events-none" />
      <Input
        placeholder={placeholder} value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="bg-card/20 border-primary/10 rounded-xl pr-10 h-11 text-sm text-right text-white focus:border-primary/30"
      />
    </div>
  );

  const EmptyState = ({ msg }: { msg: string }) => (
    <div className="py-16 text-center text-foreground/40 text-xs tracking-wide">{msg}</div>
  );

  const ActionBtns = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
    <div className="flex items-center justify-center gap-1.5">
      <Button variant="ghost" size="icon" onClick={onEdit}
        className="h-8 w-8 text-primary hover:bg-primary/20 rounded-lg" title="تعديل">
        <Edit2 className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete}
        className="h-8 w-8 text-red-400 hover:bg-red-950/40 rounded-lg" title="حذف">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0f0e0c] flex text-foreground font-light" dir="rtl">

      {/* ── SIDEBAR ── */}
      <aside className="hidden md:flex w-64 shrink-0 border-l border-primary/10 bg-black/20 backdrop-blur-2xl p-6 flex-col justify-between">
        <div className="space-y-8">
          <div className="text-center py-2 border-b border-primary/5 space-y-0.5">
            <h2 className="text-xl font-light tracking-wider text-primary">صالح الدرازي</h2>
            <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/40 font-bold">لوحة التحكم والمحتوى</p>
          </div>
          <nav className="space-y-1.5">
            <NavBtn tab="overview" icon={LayoutDashboard} label="الإحصائيات العامة" />
            <NavBtn tab="albums" icon={FolderHeart} label="الألبومات" count={albums.length} />
            <NavBtn tab="audios" icon={Music} label="القصائد" count={audios.length} />
            <NavBtn tab="videos" icon={Youtube} label="المرئيات" count={videos.length} />
            <NavBtn tab="messages" icon={Mail} label="الرسائل" count={messages.length} />
          </nav>
        </div>
        <div className="space-y-2 border-t border-primary/5 pt-4">
          <a href="/" target="_blank"
            className="w-full flex items-center justify-center gap-2 h-11 text-[11px] font-medium text-primary hover:bg-primary/10 border border-primary/15 rounded-xl transition-all">
            <ExternalLink className="w-3.5 h-3.5" /><span>عرض الموقع الرسمي</span>
          </a>
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 h-11 text-[11px] font-medium text-red-400/80 hover:bg-red-950/20 hover:text-red-400 border border-red-900/10 hover:border-red-900/30 rounded-xl transition-all">
            <LogOut className="w-3.5 h-3.5" /><span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-5 py-3 border-b border-primary/10 bg-black/30 backdrop-blur-md">
          <span className="text-sm text-primary font-light">صالح الدرازي — لوحة التحكم</span>
          <div className="flex gap-2">
            <Select value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <SelectTrigger className="h-8 text-xs bg-background/50 border-primary/10 text-primary w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-primary/20">
                <SelectItem value="overview">الإحصائيات</SelectItem>
                <SelectItem value="albums">الألبومات</SelectItem>
                <SelectItem value="audios">القصائد</SelectItem>
                <SelectItem value="videos">المرئيات</SelectItem>
                <SelectItem value="messages">الرسائل</SelectItem>
              </SelectContent>
            </Select>
            <button onClick={handleLogout} className="p-2 text-red-400/70 border border-red-900/10 rounded-lg">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-foreground/40 tracking-wider">جاري جلب البيانات من Supabase…</p>
          </div>
        ) : fetchError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="p-4 rounded-2xl bg-red-950/20 border border-red-900/30">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-red-300 font-medium">فشل جلب البيانات</p>
              <p className="text-xs text-foreground/50 max-w-sm">{fetchError}</p>
            </div>
            <Button onClick={fetchData} className="bg-primary text-primary-foreground rounded-xl text-xs">
              <RefreshCw className="w-3.5 h-3.5 ml-2" /> إعادة المحاولة
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-6xl mx-auto w-full space-y-6">

            {/* Page header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-primary/5">
              <div className="space-y-0.5">
                <h1 className="text-2xl font-light text-primary">
                  {activeTab === "overview" && "الإحصائيات العامة"}
                  {activeTab === "albums" && "إدارة الألبومات"}
                  {activeTab === "audios" && "إدارة القصائد الصوتية"}
                  {activeTab === "videos" && "إدارة المرئيات على يوتيوب"}
                  {activeTab === "messages" && "رسائل الجمهور"}
                </h1>
                <p className="text-xs text-foreground/40">
                  {activeTab === "overview" && "ملخص المحتوى في قاعدة البيانات."}
                  {activeTab === "albums" && "إنشاء وتعديل وحذف ألبومات القصائد."}
                  {activeTab === "audios" && "إدارة التسجيلات الصوتية عبر روابط خارجية."}
                  {activeTab === "videos" && "أضف مرئيات يوتيوب بلصق الرابط — يستخرج النظام ID تلقائياً."}
                  {activeTab === "messages" && "قائمة الرسائل الواردة من نموذج التواصل."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={fetchData}
                  className="h-10 w-10 bg-card/20 border-primary/10 text-primary hover:bg-primary/5 rounded-xl" title="تحديث">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                {activeTab === "albums" && (
                  <Button onClick={openCreateAlbumModal} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-10 px-4 text-xs font-bold shadow-lg">
                    <Plus className="w-4 h-4 ml-2" /> ألبوم جديد
                  </Button>
                )}
                {activeTab === "audios" && (
                  <Button onClick={openCreateAudioModal} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-10 px-4 text-xs font-bold shadow-lg">
                    <Plus className="w-4 h-4 ml-2" /> إضافة قصيدة
                  </Button>
                )}
                {activeTab === "videos" && (
                  <Button onClick={openCreateVideoModal} className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 px-4 text-xs font-bold shadow-lg">
                    <Plus className="w-4 h-4 ml-2" /> إضافة فيديو
                  </Button>
                )}
              </div>
            </div>

            {/* ══ OVERVIEW ══ */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  {[
                    { icon: FolderHeart, label: "الألبومات", count: albums.length, sub: "ألبوم مسجّل" },
                    { icon: Music, label: "القصائد", count: audios.length, sub: "قصيدة صوتية" },
                    { icon: Youtube, label: "المرئيات", count: videos.length, sub: "فيديو يوتيوب" },
                    { icon: Mail, label: "الرسائل", count: messages.length, sub: "رسالة واردة" },
                  ].map(({ icon: Icon, label, count, sub }) => (
                    <Card key={label} className="bg-card/10 border-primary/10 rounded-2xl shadow-xl hover:border-primary/25 transition-all">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-medium text-foreground/50">{label}</CardTitle>
                        <Icon className="w-4 h-4 text-primary" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-light text-primary">{count}</div>
                        <p className="text-[10px] text-foreground/30 mt-1">{sub}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="bg-card/10 border border-primary/5 p-6 rounded-[2rem] space-y-4">
                  <h3 className="text-sm font-semibold text-primary">إرشادات سريعة</h3>
                  <ul className="text-xs text-foreground/60 space-y-3 leading-relaxed">
                    {[
                      "أنشئ ألبوماً أولاً قبل إضافة القصائد الصوتية لربطها به.",
                      "لإضافة فيديو يوتيوب، الصق الرابط الكامل (youtube.com/watch?v=… أو youtu.be/…) وسيستخرج النظام معرّف الفيديو تلقائياً.",
                      "قاعدة البيانات محمية بسياسات RLS — الزوار يقرؤون فقط، والتعديل للمسؤول المصادق عليه.",
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(["albums", "audios", "videos", "messages"] as Tab[]).map((t) => (
                    <Button key={t} variant="outline" onClick={() => setActiveTab(t)}
                      className="bg-black/20 border-primary/10 text-xs rounded-xl h-11 hover:bg-primary hover:text-primary-foreground transition-all">
                      {t === "albums" ? "الألبومات" : t === "audios" ? "القصائد" : t === "videos" ? "المرئيات" : "الرسائل"}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* ══ ALBUMS ══ */}
            {activeTab === "albums" && (
              <div className="space-y-5">
                <SearchBar placeholder="ابحث عن ألبوم…" />
                <div className="bg-card/10 border border-primary/5 rounded-2xl overflow-hidden shadow-xl">
                  {filteredAlbums.length === 0 ? <EmptyState msg={searchQuery ? "لا نتائج للبحث." : "لا توجد ألبومات."} /> : (
                    <Table>
                      <TableHeader className="bg-black/30">
                        <TableRow className="border-primary/5 hover:bg-transparent">
                          <TableHead className="text-right text-primary/70 text-xs w-16">#</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">الألبوم</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">السنة</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">الفئة</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">تاريخ الإضافة</TableHead>
                          <TableHead className="text-center text-primary/70 text-xs w-28">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAlbums.map((album) => (
                          <TableRow key={album.id} className="border-primary/5 hover:bg-white/4 transition-colors">
                            <TableCell className="text-foreground/40 text-xs">{album.id}</TableCell>
                            <TableCell className="text-white text-xs font-medium">{safeStr(album.title)}</TableCell>
                            <TableCell className="text-foreground/50 text-xs">{safeStr(album.year)}</TableCell>
                            <TableCell className="text-xs">
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/10 text-[10px]">
                                {getCategoryLabel(album.category)}
                              </span>
                            </TableCell>
                            <TableCell className="text-foreground/40 text-xs">{safeDate(album.created_at)}</TableCell>
                            <TableCell><ActionBtns onEdit={() => openEditAlbumModal(album)} onDelete={() => requestDelete("album", album.id, safeStr(album.title))} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}

            {/* ══ AUDIOS ══ */}
            {activeTab === "audios" && (
              <div className="space-y-5">
                <SearchBar placeholder="ابحث عن قصيدة أو ألبوم…" />
                <div className="bg-card/10 border border-primary/5 rounded-2xl overflow-hidden shadow-xl">
                  {filteredAudios.length === 0 ? <EmptyState msg={searchQuery ? "لا نتائج." : "لا توجد قصائد."} /> : (
                    <Table>
                      <TableHeader className="bg-black/30">
                        <TableRow className="border-primary/5 hover:bg-transparent">
                          <TableHead className="text-right text-primary/70 text-xs w-12">ترتيب</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">العنوان</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">الألبوم</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs w-20">المدة</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">الرابط الصوتي</TableHead>
                          <TableHead className="text-center text-primary/70 text-xs w-28">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAudios.map((track) => (
                          <TableRow key={track.id} className="border-primary/5 hover:bg-white/4 transition-colors">
                            <TableCell className="font-mono text-foreground/40 text-xs">{track.order ?? "—"}</TableCell>
                            <TableCell className="text-white text-xs font-medium">{safeStr(track.title)}</TableCell>
                            <TableCell className="text-foreground/60 text-xs">{getAlbumTitle(track.album_id)}</TableCell>
                            <TableCell className="font-mono text-foreground/40 text-xs">{safeStr(track.duration)}</TableCell>
                            <TableCell className="text-xs max-w-[180px]">
                              {track.audio_url ? (
                                <a href={track.audio_url} target="_blank" rel="noreferrer" title={track.audio_url}
                                  className="flex items-center gap-1.5 text-foreground/40 hover:text-primary transition-colors">
                                  <Link2 className="w-3 h-3 text-primary shrink-0" />
                                  <span className="truncate">{track.audio_url}</span>
                                </a>
                              ) : <span className="text-foreground/25">لا يوجد رابط</span>}
                            </TableCell>
                            <TableCell><ActionBtns onEdit={() => openEditAudioModal(track)} onDelete={() => requestDelete("audio", track.id, safeStr(track.title))} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}

            {/* ══ VIDEOS ══ */}
            {activeTab === "videos" && (
              <div className="space-y-5">
                <SearchBar placeholder="ابحث عن فيديو أو رابط…" />
                <div className="bg-card/10 border border-primary/5 rounded-2xl overflow-hidden shadow-xl">
                  {filteredVideos.length === 0 ? <EmptyState msg={searchQuery ? "لا نتائج." : "لا توجد مرئيات. أضف فيديوك الأول!"} /> : (
                    <Table>
                      <TableHeader className="bg-black/30">
                        <TableRow className="border-primary/5 hover:bg-transparent">
                          <TableHead className="text-right text-primary/70 text-xs w-20">معاينة</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">العنوان</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">الفئة</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">التصنيف الفرعي</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs w-16">ترتيب</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">رابط يوتيوب</TableHead>
                          <TableHead className="text-center text-primary/70 text-xs w-28">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVideos.map((video) => {
                          const vid = extractYouTubeId(safeStr(video.youtube_url, ""));
                          return (
                            <TableRow key={video.id} className="border-primary/5 hover:bg-white/4 transition-colors">
                              <TableCell>
                                {vid ? (
                                  <img
                                    src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                                    alt={safeStr(video.title)}
                                    className="w-16 h-10 object-cover rounded-lg border border-primary/10"
                                  />
                                ) : (
                                  <div className="w-16 h-10 rounded-lg bg-black/30 border border-primary/5 flex items-center justify-center">
                                    <Video className="w-4 h-4 text-foreground/20" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-white text-xs font-medium max-w-[160px] truncate">{safeStr(video.title)}</TableCell>
                              <TableCell className="text-xs">
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-600/10 text-red-400 border border-red-600/10 text-[10px]">
                                  {getVideoCategoryLabel(video.category)}
                                </span>
                              </TableCell>
                              <TableCell className="text-foreground/50 text-xs">{safeStr(video.sub_category)}</TableCell>
                              <TableCell className="font-mono text-foreground/40 text-xs text-center">{video.display_order ?? 0}</TableCell>
                              <TableCell className="text-xs max-w-[180px]">
                                {video.youtube_url ? (
                                  <a href={safeStr(video.youtube_url)} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1.5 text-foreground/40 hover:text-red-400 transition-colors">
                                    <Youtube className="w-3 h-3 text-red-500 shrink-0" />
                                    <span className="truncate">{safeStr(video.youtube_url)}</span>
                                  </a>
                                ) : <span className="text-foreground/25">لا يوجد رابط</span>}
                              </TableCell>
                              <TableCell>
                                <ActionBtns onEdit={() => openEditVideoModal(video)} onDelete={() => requestDelete("video", video.id, safeStr(video.title))} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}

            {/* ══ MESSAGES ══ */}
            {activeTab === "messages" && (
              <div className="space-y-5">
                <SearchBar placeholder="ابحث في الرسائل…" />
                <div className="bg-card/10 border border-primary/5 rounded-2xl overflow-hidden shadow-xl">
                  {filteredMessages.length === 0 ? <EmptyState msg={searchQuery ? "لا نتائج." : "لا توجد رسائل."} /> : (
                    <Table>
                      <TableHeader className="bg-black/30">
                        <TableRow className="border-primary/5 hover:bg-transparent">
                          <TableHead className="text-right text-primary/70 text-xs">التاريخ</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">المرسل</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">البريد</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">الموضوع</TableHead>
                          <TableHead className="text-right text-primary/70 text-xs">مقتطف</TableHead>
                          <TableHead className="text-center text-primary/70 text-xs w-28">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMessages.map((msg) => (
                          <TableRow key={msg.id} className="border-primary/5 hover:bg-white/4 transition-colors">
                            <TableCell className="text-foreground/40 text-xs whitespace-nowrap">{safeDate(msg.created_at)}</TableCell>
                            <TableCell className="text-white text-xs font-medium">{safeStr(msg.name)}</TableCell>
                            <TableCell className="text-foreground/50 text-xs" style={{ direction: "ltr", textAlign: "right" }}>{safeStr(msg.email)}</TableCell>
                            <TableCell className="text-primary/80 text-xs font-medium">{safeStr(msg.subject)}</TableCell>
                            <TableCell className="text-foreground/40 text-xs max-w-[200px] truncate">{safeStr(msg.message)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1.5">
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedMessage(msg); setMessageModalOpen(true); }}
                                  className="h-8 w-8 text-primary hover:bg-primary/20 rounded-lg" title="عرض">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => requestDelete("message", msg.id, safeStr(msg.subject))}
                                  className="h-8 w-8 text-red-400 hover:bg-red-950/40 rounded-lg" title="حذف">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══════════ MODALS ══════════ */}

      {/* Album Modal */}
      <Dialog open={albumModalOpen} onOpenChange={setAlbumModalOpen}>
        <DialogContent className="bg-[#0f0e0c] border border-primary/15 text-right max-w-md rounded-[2rem] p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-primary">{editingAlbum ? "تعديل الألبوم" : "إنشاء ألبوم جديد"}</DialogTitle>
            <DialogDescription className="text-foreground/40 text-xs">أدخل تفاصيل الألبوم.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAlbum} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">اسم الألبوم *</label>
              <Input value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} disabled={actionLoading}
                placeholder="مثال: ذكريات عاشوراء ١٤٤٧هـ"
                className="bg-white/5 border-primary/10 focus:border-primary/40 rounded-xl h-11 text-sm text-right text-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">سنة الإصدار</label>
              <Input value={albumYear} onChange={(e) => setAlbumYear(e.target.value)} disabled={actionLoading} placeholder="2026"
                className="bg-white/5 border-primary/10 focus:border-primary/40 rounded-xl h-11 text-sm text-right font-mono text-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">الفئة *</label>
              <Select value={albumCategory} onValueChange={setAlbumCategory} disabled={actionLoading}>
                <SelectTrigger className="bg-white/5 border-primary/10 rounded-xl h-11 text-sm text-right text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111] border-primary/20">
                  <SelectItem value="sorrow">الأحزان (عزاء)</SelectItem>
                  <SelectItem value="joy">الأفراح والمواليد</SelectItem>
                  <SelectItem value="supplications">الأدعية والمناجاة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="flex gap-2 pt-2">
              <Button type="submit" disabled={actionLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11 text-xs font-bold px-6">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAlbumModalOpen(false)} disabled={actionLoading}
                className="border-primary/10 text-primary hover:bg-primary/5 rounded-xl h-11 text-xs">إلغاء</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Audio Modal */}
      <Dialog open={audioModalOpen} onOpenChange={setAudioModalOpen}>
        <DialogContent className="bg-[#0f0e0c] border border-primary/15 text-right max-w-lg rounded-[2rem] p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-primary">{editingAudio ? "تعديل القصيدة" : "إضافة قصيدة جديدة"}</DialogTitle>
            <DialogDescription className="text-foreground/40 text-xs">الرابط يُخزَّن مباشرةً في عمود audio_url.</DialogDescription>
          </DialogHeader>
          {albums.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-foreground/50">أنشئ ألبوماً أولاً لربط القصيدة به.</p>
              <Button onClick={() => { setAudioModalOpen(false); openCreateAlbumModal(); }} className="bg-primary text-primary-foreground rounded-xl text-xs">إنشاء ألبوم</Button>
            </div>
          ) : (
            <form onSubmit={handleSaveAudio} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">عنوان القصيدة *</label>
                <Input value={audioTitle} onChange={(e) => setAudioTitle(e.target.value)} disabled={actionLoading}
                  placeholder="مثال: يا غريب كربلاء"
                  className="bg-white/5 border-primary/10 focus:border-primary/40 rounded-xl h-11 text-sm text-right text-white" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">رابط الملف الصوتي *</label>
                  <span className="text-[9px] text-primary/70 font-bold bg-primary/10 px-2 py-0.5 rounded-full">audio_url</span>
                </div>
                <Input type="url" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} disabled={actionLoading}
                  placeholder="https://example.com/audio/track.mp3"
                  className="bg-white/5 border-primary/10 focus:border-primary/40 rounded-xl h-11 text-xs text-left font-mono text-white"
                  style={{ direction: "ltr" }} />
                <p className="text-[9px] text-foreground/30">رابط مباشر للملف (MP3, OGG…)</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">الألبوم</label>
                <Select value={audioAlbumId} onValueChange={setAudioAlbumId} disabled={actionLoading}>
                  <SelectTrigger className="bg-white/5 border-primary/10 rounded-xl h-11 text-sm text-right text-white"><SelectValue placeholder="اختر ألبوماً…" /></SelectTrigger>
                  <SelectContent className="bg-[#111] border-primary/20">
                    {albums.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{safeStr(a.title)} {a.year ? `(${a.year})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">المدة (مم:ثث)</label>
                  <Input placeholder="07:15" value={audioDuration} onChange={(e) => setAudioDuration(e.target.value)} disabled={actionLoading}
                    className="bg-white/5 border-primary/10 rounded-xl h-11 text-sm text-left font-mono text-white" style={{ direction: "ltr" }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">رقم الترتيب</label>
                  <Input type="number" min="0" placeholder="0" value={audioOrder} onChange={(e) => setAudioOrder(e.target.value)} disabled={actionLoading}
                    className="bg-white/5 border-primary/10 rounded-xl h-11 text-sm text-left font-mono text-white" style={{ direction: "ltr" }} />
                </div>
              </div>
              <DialogFooter className="flex gap-2 pt-2">
                <Button type="submit" disabled={actionLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11 text-xs font-bold px-6">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setAudioModalOpen(false)} disabled={actionLoading}
                  className="border-primary/10 text-primary hover:bg-primary/5 rounded-xl h-11 text-xs">إلغاء</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="bg-[#0f0e0c] border border-red-900/20 text-right max-w-lg rounded-[2rem] p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-red-400 flex items-center gap-2">
              <Youtube className="w-5 h-5" />
              {editingVideo ? "تعديل الفيديو" : "إضافة فيديو يوتيوب"}
            </DialogTitle>
            <DialogDescription className="text-foreground/40 text-xs">
              الصق رابط يوتيوب — يُستخرج معرّف الفيديو تلقائياً ويُعرض في الموقع.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveVideo} className="space-y-4 mt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">عنوان الفيديو *</label>
              <Input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} disabled={actionLoading}
                placeholder="مثال: إحياء مجلس عاشوراء ١٤٤٧هـ"
                className="bg-white/5 border-primary/10 focus:border-primary/40 rounded-xl h-11 text-sm text-right text-white" />
            </div>
            {/* YouTube URL + live validation */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">رابط يوتيوب *</label>
                {videoPreviewId && (
                  <span className="text-[9px] text-green-400 font-bold bg-green-950/30 px-2 py-0.5 rounded-full border border-green-800/30 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> ID: {videoPreviewId}
                  </span>
                )}
              </div>
              <Input
                type="url"
                value={videoYoutubeUrl}
                onChange={(e) => handleVideoUrlChange(e.target.value)}
                disabled={actionLoading}
                placeholder="https://www.youtube.com/watch?v=…"
                className={`bg-white/5 rounded-xl h-11 text-xs text-left font-mono text-white transition-all ${videoUrlError ? "border-red-500/50 focus:border-red-500" : "border-primary/10 focus:border-primary/40"
                  }`}
                style={{ direction: "ltr" }}
              />
              {videoUrlError && <p className="text-[10px] text-red-400">{videoUrlError}</p>}
              {/* Live thumbnail preview */}
              {videoPreviewId && (
                <div className="relative rounded-xl overflow-hidden border border-primary/10 aspect-video bg-black mt-2">
                  <img
                    src={`https://img.youtube.com/vi/${videoPreviewId}/maxresdefault.jpg`}
                    alt="معاينة"
                    className="w-full h-full object-cover opacity-80"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoPreviewId}/mqdefault.jpg`; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-red-600/80 rounded-full flex items-center justify-center shadow-xl">
                      <Youtube className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full">معاينة مباشرة</div>
                </div>
              )}
            </div>
            {/* Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">الفئة *</label>
                <Select value={videoCategory} onValueChange={setVideoCategory} disabled={actionLoading}>
                  <SelectTrigger className="bg-white/5 border-primary/10 rounded-xl h-11 text-sm text-right text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111] border-primary/20">
                    <SelectItem value="new">الجديد</SelectItem>
                    <SelectItem value="popular">الأكثر مشاهدة</SelectItem>
                    <SelectItem value="featured">مختارات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">ترتيب العرض</label>
                <Input type="number" min="0" placeholder="0" value={videoOrder} onChange={(e) => setVideoOrder(e.target.value)} disabled={actionLoading}
                  className="bg-white/5 border-primary/10 rounded-xl h-11 text-sm text-left font-mono text-white" style={{ direction: "ltr" }} />
              </div>
            </div>
            {/* Sub-category */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">التصنيف الفرعي (اختياري)</label>
              <Input value={videoSubCategory} onChange={(e) => setVideoSubCategory(e.target.value)} disabled={actionLoading}
                placeholder="مثال: مجالس العزاء - محرم"
                className="bg-white/5 border-primary/10 focus:border-primary/40 rounded-xl h-11 text-sm text-right text-white" />
            </div>
            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">وصف (اختياري)</label>
              <Textarea value={videoDescription} onChange={(e) => setVideoDescription(e.target.value)} disabled={actionLoading}
                placeholder="وصف مختصر عن الفيديو…"
                className="bg-white/5 border-primary/10 focus:border-primary/40 rounded-xl text-sm text-right text-white resize-none min-h-[70px]" />
            </div>
            <DialogFooter className="flex gap-2 pt-2">
              <Button type="submit" disabled={actionLoading || !!videoUrlError}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 text-xs font-bold px-6">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الفيديو"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setVideoModalOpen(false)} disabled={actionLoading}
                className="border-primary/10 text-primary hover:bg-primary/5 rounded-xl h-11 text-xs">إلغاء</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Message Detail Modal */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="bg-[#0f0e0c] border border-primary/15 text-right max-w-lg rounded-[2rem] p-8 shadow-2xl">
          <DialogHeader className="border-b border-primary/10 pb-4 mb-2">
            <DialogTitle className="text-lg font-medium text-primary">تفاصيل الرسالة</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div><span className="block text-foreground/40 font-bold text-[10px] mb-1">المرسل</span><span className="text-white font-medium">{safeStr(selectedMessage.name)}</span></div>
                <div><span className="block text-foreground/40 font-bold text-[10px] mb-1">البريد</span><span className="text-white" style={{ direction: "ltr" }}>{safeStr(selectedMessage.email)}</span></div>
                <div className="col-span-2"><span className="block text-foreground/40 font-bold text-[10px] mb-1">الموضوع</span><span className="text-primary font-medium">{safeStr(selectedMessage.subject)}</span></div>
                <div className="col-span-2"><span className="block text-foreground/40 font-bold text-[10px] mb-1">التاريخ</span><span className="text-foreground/60">{safeDate(selectedMessage.created_at)}</span></div>
              </div>
              <div className="border-t border-primary/5 pt-4">
                <span className="block text-foreground/40 font-bold text-[10px] mb-2">نص الرسالة</span>
                <div className="bg-black/30 border border-primary/5 rounded-2xl p-4 text-foreground/80 text-xs leading-relaxed max-h-52 overflow-y-auto whitespace-pre-wrap">
                  {safeStr(selectedMessage.message)}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                <Button onClick={() => { setMessageModalOpen(false); requestDelete("message", selectedMessage.id, safeStr(selectedMessage.subject)); }}
                  className="bg-red-950/20 border border-red-900/20 text-red-400 hover:bg-red-900/50 hover:text-white rounded-xl text-xs h-10 px-4">
                  <Trash2 className="w-3.5 h-3.5 ml-1.5" /> حذف الرسالة
                </Button>
                <Button variant="outline" onClick={() => setMessageModalOpen(false)}
                  className="border-primary/15 text-primary hover:bg-primary/5 rounded-xl text-xs h-10 px-5">إغلاق</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-[#0f0e0c] border border-red-900/30 text-right max-w-sm rounded-[2rem] p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-red-400">تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-xs text-foreground/60 leading-relaxed">
              هل أنت متأكد من حذف{" "}
              <span className="text-white font-medium">"{deleteTarget?.label ?? "هذا العنصر"}"</span>{" "}
              نهائياً من قاعدة البيانات؟ لا يمكن التراجع.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button onClick={executeDelete} disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 text-xs font-bold px-6">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف نهائي"}
            </Button>
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }} disabled={actionLoading}
              className="border-primary/10 text-primary hover:bg-primary/5 rounded-xl h-11 text-xs">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
