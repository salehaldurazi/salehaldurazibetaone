"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import {
  LayoutDashboard, FolderHeart, Music, Mail, LogOut,
  Plus, Edit2, Trash2, ExternalLink, Loader2, Search,
  CheckCircle2, RefreshCw, Eye, AlertTriangle, Link2,
  Youtube, Video, X, ChevronDown, ChevronRight, EyeOff,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

// ─────────────────────────────────────────────
// YOUTUBE HELPERS
// ─────────────────────────────────────────────
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
// TYPES
// ─────────────────────────────────────────────
interface Album {
  id: number;
  title: string;
  year?: string | number | null;
  category?: string | null;
  is_visible?: boolean;
  created_at?: string | null;
}

interface AudioTrack {
  id: number;
  title: string;
  audio_url?: string | null;
  album_id?: number | null;
  duration?: string | null;
  order?: number | null;
  is_visible?: boolean;
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

function getCategoryColor(cat: string | null | undefined): string {
  switch (cat) {
    case "sorrow":
      return "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40";
    case "supplications":
      return "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40";
    case "joy":
      return "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40";
    default:
      return "bg-muted text-foreground/60 border-border";
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
type Tab = "overview" | "management" | "messages" | "videos";

export default function AdminDashboard() {
  const router = useRouter();

  // ── Core State ──────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [audios, setAudios] = useState<AudioTrack[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Accordion ────────────────────────────────
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());

  // ── Modal flags ──────────────────────────────
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [poemModalOpen, setPoemModalOpen] = useState(false);
  const [editPoemModalOpen, setEditPoemModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // ── Album form ───────────────────────────────
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumYear, setAlbumYear] = useState("");
  const [albumCategory, setAlbumCategory] = useState("sorrow");

  // ── Add-Poems form (multi-entry) ─────────────
  const [poemModalAlbumId, setPoemModalAlbumId] = useState<number | null>(null);
  const [poemEntries, setPoemEntries] = useState<{ title: string; url: string; order: string }[]>(
    [{ title: "", url: "", order: "1" }],
  );

  // ── Edit single poem form ────────────────────
  const [editingAudio, setEditingAudio] = useState<AudioTrack | null>(null);
  const [editAudioTitle, setEditAudioTitle] = useState("");
  const [editAudioUrl, setEditAudioUrl] = useState("");
  const [editAudioOrder, setEditAudioOrder] = useState("0");
  const [editAudioAlbumId, setEditAudioAlbumId] = useState("");
  const [editAudioDuration, setEditAudioDuration] = useState("");

  // ── Video form ───────────────────────────────
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState("");
  const [videoCategory, setVideoCategory] = useState("new");
  const [videoSubCategory, setVideoSubCategory] = useState("");
  const [videoOrder, setVideoOrder] = useState("0");
  const [videoUrlError, setVideoUrlError] = useState("");
  const videoPreviewId = extractYouTubeId(videoYoutubeUrl);

  // ── Message viewer ───────────────────────────
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // ── Delete target ────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "album" | "audio" | "message" | "video";
    id: number | string;
    label?: string;
  } | null>(null);

  // ─────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    // Albums — fatal if fails
    try {
      const { data, error } = await supabase
        .from("albums")
        .select("id, title, year, category, is_visible, created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(`albums: ${error.message}`);
      setAlbums(data ?? []);
    } catch (err: any) {
      setFetchError(err.message);
      setLoading(false);
      return;
    }

    // Audios — non-fatal
    try {
      const { data, error } = await supabase
        .from("audios")
        .select(`id, title, audio_url, album_id, duration, "order", is_visible, created_at`)
        .order("order", { ascending: true });
      if (error) {
        toast({ title: "تحذير – القصائد", description: error.message, variant: "destructive" });
        setAudios([]);
      } else {
        setAudios(data ?? []);
      }
    } catch { setAudios([]); }

    // Videos — non-fatal
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, description, youtube_url, category, sub_category, display_order, created_at")
        .order("display_order", { ascending: true });
      if (error) {
        toast({ title: "تحذير – المرئيات", description: error.message, variant: "destructive" });
        setVideos([]);
      } else {
        setVideos(data ?? []);
      }
    } catch { setVideos([]); }

    // Messages — non-fatal
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id, name, email, subject, message, created_at")
        .order("created_at", { ascending: false });
      if (error) setMessages([]);
      else setMessages(data ?? []);
    } catch { setMessages([]); }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      router.push("/admin/login");
      router.refresh();
    } catch (e: any) { console.error("[Dashboard] Logout:", e); }
  };

  // ─────────────────────────────────────────────
  // ACCORDION
  // ─────────────────────────────────────────────
  function toggleAlbumExpand(id: number) {
    setExpandedAlbums(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ─────────────────────────────────────────────
  // VISIBILITY TOGGLE  (optimistic)
  // ─────────────────────────────────────────────
  async function handleToggleVisibility(
    table: "albums" | "audios",
    id: number,
    currentVisible: boolean,
  ) {
    const newVisible = !currentVisible;
    if (table === "albums") {
      setAlbums(prev => prev.map(a => a.id === id ? { ...a, is_visible: newVisible } : a));
    } else {
      setAudios(prev => prev.map(a => a.id === id ? { ...a, is_visible: newVisible } : a));
    }
    try {
      const { error } = await supabase.from(table).update({ is_visible: newVisible }).eq("id", id);
      if (error) throw error;
      toast({
        title: newVisible ? "✓ ظاهر الآن" : "✓ مخفي الآن",
        description: newVisible ? "سيظهر العنصر في الموقع." : "لن يظهر العنصر في الموقع.",
      });
    } catch (err: any) {
      // revert
      if (table === "albums") {
        setAlbums(prev => prev.map(a => a.id === id ? { ...a, is_visible: currentVisible } : a));
      } else {
        setAudios(prev => prev.map(a => a.id === id ? { ...a, is_visible: currentVisible } : a));
      }
      toast({ title: "خطأ في التحديث", description: err.message, variant: "destructive" });
    }
  }

  // ─────────────────────────────────────────────
  // ALBUM CRUD
  // ─────────────────────────────────────────────
  function openCreateAlbumModal() {
    setEditingAlbum(null);
    setAlbumTitle("");
    setAlbumYear(new Date().getFullYear().toString());
    setAlbumCategory("sorrow");
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
    const payload = {
      title: albumTitle.trim(),
      year: isNaN(yearNum) ? null : yearNum,
      category: albumCategory,
    };
    setActionLoading(true);
    try {
      if (editingAlbum) {
        const { error } = await supabase.from("albums").update(payload).eq("id", editingAlbum.id);
        if (error) throw error;
        toast({ title: "✓ تم التحديث", description: "تم تحديث بيانات الألبوم." });
      } else {
        const { error } = await supabase.from("albums").insert([{ ...payload, is_visible: true }]);
        if (error) throw error;
        toast({ title: "✓ تم الإضافة", description: "تم إنشاء الألبوم بنجاح." });
      }
      setAlbumModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  }

  // ─────────────────────────────────────────────
  // ADD POEMS  (multi-entry)
  // ─────────────────────────────────────────────
  function openAddPoemsForAlbum(albumId: number) {
    setPoemModalAlbumId(albumId);
    const albumAudios = audios.filter(a => a.album_id === albumId);
    const nextOrder = albumAudios.length > 0
      ? Math.max(...albumAudios.map(a => a.order ?? 0)) + 1
      : 1;
    setPoemEntries([{ title: "", url: "", order: String(nextOrder) }]);
    setPoemModalOpen(true);
  }
  function addPoemEntry() {
    setPoemEntries(prev => {
      const last = parseInt(prev[prev.length - 1]?.order ?? "0", 10);
      return [...prev, { title: "", url: "", order: String(isNaN(last) ? prev.length + 1 : last + 1) }];
    });
  }
  function removePoemEntry(idx: number) {
    setPoemEntries(prev => prev.filter((_, i) => i !== idx));
  }
  function updatePoemEntry(idx: number, field: "title" | "url" | "order", value: string) {
    setPoemEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }
  async function handleSavePoems(e: React.FormEvent) {
    e.preventDefault();
    if (poemModalAlbumId === null) return;
    const validEntries = poemEntries.filter(e => e.url.trim());
    if (validEntries.length === 0) {
      toast({ title: "خطأ", description: "يرجى إدخال رابط صوتي لقصيدة واحدة على الأقل.", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      const payloads = validEntries.map((entry, i) => ({
        title: entry.title.trim() || `قصيدة ${i + 1}`,
        audio_url: entry.url.trim(),
        album_id: poemModalAlbumId,
        order: parseInt(entry.order, 10) || (i + 1),
        is_visible: true,
      }));
      const { error } = await supabase.from("audios").insert(payloads);
      if (error) throw error;
      toast({ title: "✓ تم الإضافة", description: `تمت إضافة ${payloads.length} قصيدة بنجاح.` });
      setPoemModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  }

  // ─────────────────────────────────────────────
  // EDIT SINGLE POEM
  // ─────────────────────────────────────────────
  function openEditPoemModal(audio: AudioTrack) {
    setEditingAudio(audio);
    setEditAudioTitle(safeStr(audio.title, ""));
    setEditAudioUrl(safeStr(audio.audio_url, ""));
    setEditAudioOrder(audio.order != null ? String(audio.order) : "0");
    setEditAudioAlbumId(audio.album_id != null ? String(audio.album_id) : "");
    setEditAudioDuration(safeStr(audio.duration, ""));
    setEditPoemModalOpen(true);
  }
  async function handleSaveEditPoem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAudio) return;
    if (!editAudioTitle.trim() || !editAudioUrl.trim()) {
      toast({ title: "خطأ", description: "العنوان والرابط مطلوبان.", variant: "destructive" }); return;
    }
    const albumIdNum = parseInt(editAudioAlbumId, 10);
    const orderNum = parseInt(editAudioOrder, 10);
    const payload = {
      title: editAudioTitle.trim(),
      audio_url: editAudioUrl.trim(),
      album_id: isNaN(albumIdNum) ? null : albumIdNum,
      duration: editAudioDuration.trim() || null,
      order: isNaN(orderNum) ? 0 : orderNum,
    };
    setActionLoading(true);
    try {
      const { error } = await supabase.from("audios").update(payload).eq("id", editingAudio.id);
      if (error) throw error;
      toast({ title: "✓ تم التحديث", description: "تم تحديث بيانات القصيدة." });
      setEditPoemModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  }

  // ─────────────────────────────────────────────
  // VIDEO CRUD
  // ─────────────────────────────────────────────
  function openCreateVideoModal() {
    setEditingVideo(null);
    setVideoTitle(""); setVideoDescription(""); setVideoYoutubeUrl("");
    setVideoCategory("new"); setVideoSubCategory(""); setVideoOrder("0"); setVideoUrlError("");
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
    setVideoUrlError(url && !isValidYouTubeUrl(url) ? "الرابط غير صالح. يرجى لصق رابط يوتيوب صحيح." : "");
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
      title: videoTitle.trim(), description: videoDescription.trim(),
      youtube_url: videoYoutubeUrl.trim(), category: videoCategory,
      sub_category: videoSubCategory.trim(),
      display_order: isNaN(orderNum) ? 0 : orderNum,
    };
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
      setVideoModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  }

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────
  function requestDelete(type: "album" | "audio" | "message" | "video", id: number | string, label?: string) {
    setDeleteTarget({ type, id, label });
    setDeleteConfirmOpen(true);
  }
  async function executeDelete() {
    if (!deleteTarget) return;
    const tableMap: Record<string, string> = {
      album: "albums", audio: "audios", message: "messages", video: "videos",
    };
    setActionLoading(true);
    try {
      const { error } = await supabase.from(tableMap[deleteTarget.type]).delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "✓ تم الحذف", description: "تم حذف العنصر بنجاح." });
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      if (messageModalOpen) setMessageModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "خطأ في الحذف", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  }

  // ─────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────
  const q = searchQuery.toLowerCase().trim();

  const filteredAlbums = albums.filter(a =>
    !q ||
    safeStr(a.title).toLowerCase().includes(q) ||
    safeStr(a.year).includes(q) ||
    getCategoryLabel(a.category).includes(q),
  );

  const getAlbumPoems = (albumId: number) =>
    audios
      .filter(a => a.album_id === albumId && (!q || safeStr(a.title).toLowerCase().includes(q)))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const filteredVideos = videos.filter(v =>
    !q ||
    safeStr(v.title).toLowerCase().includes(q) ||
    safeStr(v.youtube_url).toLowerCase().includes(q) ||
    getVideoCategoryLabel(v.category).includes(q),
  );

  const filteredMessages = messages.filter(m =>
    !q ||
    safeStr(m.name).toLowerCase().includes(q) ||
    safeStr(m.email).toLowerCase().includes(q) ||
    safeStr(m.subject).toLowerCase().includes(q) ||
    safeStr(m.message).toLowerCase().includes(q),
  );

  const poemModalAlbum = albums.find(a => a.id === poemModalAlbumId);

  // ─────────────────────────────────────────────
  // REUSABLE UI
  // ─────────────────────────────────────────────
  const NavBtn = ({ tab, icon: Icon, label, count }: {
    tab: Tab; icon: React.ElementType; label: string; count?: number;
  }) => (
    <button
      onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
      className={`w-full flex items-center gap-3 px-3.5 h-10 rounded-xl text-xs font-semibold transition-all duration-150 ${
        activeTab === tab
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-foreground/55 hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-right truncate">{label}</span>
      {count != null && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums min-w-[1.25rem] text-center ${
          activeTab === tab
            ? "bg-white/20 text-primary-foreground"
            : "bg-muted text-foreground/40"
        }`}>{count}</span>
      )}
    </button>
  );

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-muted/20 flex text-foreground" dir="rtl">

      {/* ── SIDEBAR ─────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 bg-card border-l border-border flex-col justify-between py-5 px-3.5 shadow-sm">
        <div className="space-y-5">
          {/* Brand */}
          <div className="px-1.5 pb-4 border-b border-border">
            <h2 className="text-sm font-bold text-primary">صالح الدرازي</h2>
            <p className="text-[9px] text-foreground/35 mt-0.5 font-medium tracking-widest uppercase">لوحة التحكم</p>
          </div>
          {/* Nav */}
          <nav className="space-y-0.5">
            <NavBtn tab="overview" icon={LayoutDashboard} label="الإحصائيات" />
            <NavBtn tab="management" icon={FolderHeart} label="الألبومات والقصائد" count={albums.length} />
            <NavBtn tab="videos" icon={Youtube} label="المرئيات" count={videos.length} />
            <NavBtn tab="messages" icon={Mail} label="الرسائل" count={messages.length} />
          </nav>
        </div>
        {/* Footer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1.5 mb-1">
            <span className="text-[9px] text-foreground/30 font-bold uppercase tracking-widest">المظهر</span>
            <ThemeSwitcher />
          </div>
          <a href="/" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-3 h-9 text-[11px] font-medium text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> عرض الموقع
          </a>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 h-9 text-[11px] font-medium text-red-500 border border-red-200 dark:border-red-900/20 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border shadow-sm sticky top-0 z-10">
          <span className="text-sm font-bold text-primary">صالح الدرازي</span>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Select value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <SelectTrigger className="h-8 text-xs bg-background border-border w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">الإحصائيات</SelectItem>
                <SelectItem value="management">الألبومات</SelectItem>
                <SelectItem value="videos">المرئيات</SelectItem>
                <SelectItem value="messages">الرسائل</SelectItem>
              </SelectContent>
            </Select>
            <button onClick={handleLogout}
              className="h-8 w-8 flex items-center justify-center text-red-500 border border-red-200 dark:border-red-900/20 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content area */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <p className="text-xs text-foreground/40">جاري تحميل البيانات…</p>
          </div>
        ) : fetchError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-destructive">فشل تحميل البيانات</p>
              <p className="text-xs text-foreground/40 mt-1 max-w-sm">{fetchError}</p>
            </div>
            <Button onClick={fetchData} size="sm" className="rounded-xl">
              <RefreshCw className="w-3.5 h-3.5 ml-2" /> إعادة المحاولة
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 md:p-7 max-w-5xl mx-auto w-full space-y-5">

            {/* Page header */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  {activeTab === "overview" && "الإحصائيات العامة"}
                  {activeTab === "management" && "إدارة الألبومات والقصائد"}
                  {activeTab === "videos" && "إدارة المرئيات"}
                  {activeTab === "messages" && "الرسائل الواردة"}
                </h1>
                <p className="text-[11px] text-foreground/40 mt-0.5">
                  {activeTab === "overview" && "ملخص شامل لمحتوى قاعدة البيانات."}
                  {activeTab === "management" && "انقر على ألبوم لعرض قصائده وإدارتها."}
                  {activeTab === "videos" && "أضف مرئيات يوتيوب بلصق الرابط مباشرةً."}
                  {activeTab === "messages" && "الرسائل الواردة من نموذج التواصل."}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="icon" onClick={fetchData}
                  className="h-9 w-9 rounded-xl bg-background border-border hover:bg-muted" title="تحديث">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                {activeTab === "management" && (
                  <Button onClick={openCreateAlbumModal}
                    className="h-9 px-4 text-xs font-bold rounded-xl shadow-sm">
                    <Plus className="w-3.5 h-3.5 ml-1.5" /> ألبوم جديد
                  </Button>
                )}
                {activeTab === "videos" && (
                  <Button onClick={openCreateVideoModal}
                    className="h-9 px-4 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm">
                    <Plus className="w-3.5 h-3.5 ml-1.5" /> فيديو جديد
                  </Button>
                )}
              </div>
            </div>

            {/* Search bar */}
            {activeTab !== "overview" && (
              <div className="relative max-w-xs">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === "management" ? "ابحث في الألبومات والقصائد…"
                    : activeTab === "videos" ? "ابحث في المرئيات…"
                    : "ابحث في الرسائل…"
                  }
                  className="pr-8 h-9 text-xs bg-background border-border rounded-xl text-right"
                />
              </div>
            )}

            {/* ══ OVERVIEW ══════════════════════ */}
            {activeTab === "overview" && (
              <div className="space-y-5">
                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: FolderHeart, label: "الألبومات", count: albums.length, tab: "management" as Tab, color: "text-primary" },
                    { icon: Music, label: "القصائد", count: audios.length, tab: "management" as Tab, color: "text-primary" },
                    { icon: Youtube, label: "المرئيات", count: videos.length, tab: "videos" as Tab, color: "text-red-500" },
                    { icon: Mail, label: "الرسائل", count: messages.length, tab: "messages" as Tab, color: "text-amber-500" },
                  ].map(({ icon: Icon, label, count, tab, color }) => (
                    <button key={label} onClick={() => setActiveTab(tab)}
                      className="bg-card border border-border rounded-2xl p-4 text-right hover:border-primary/25 hover:shadow-md transition-all group text-left">
                      <div className="flex items-start justify-between">
                        <div className={`p-1.5 rounded-lg bg-muted group-hover:scale-110 transition-transform`}>
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                      </div>
                      <div className={`text-3xl font-light mt-3 tabular-nums ${color}`}>{count}</div>
                      <p className="text-[11px] font-medium text-foreground/50 mt-1">{label}</p>
                    </button>
                  ))}
                </div>

                {/* Visibility summary */}
                <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">ملخص الظهور</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <p className="text-foreground/40 font-bold uppercase tracking-wider text-[9px]">الألبومات</p>
                      <div className="flex gap-3">
                        <span className="text-emerald-600 font-semibold">{albums.filter(a => a.is_visible !== false).length} ظاهر</span>
                        <span className="text-foreground/30">{albums.filter(a => a.is_visible === false).length} مخفي</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-foreground/40 font-bold uppercase tracking-wider text-[9px]">القصائد</p>
                      <div className="flex gap-3">
                        <span className="text-emerald-600 font-semibold">{audios.filter(a => a.is_visible !== false).length} ظاهرة</span>
                        <span className="text-foreground/30">{audios.filter(a => a.is_visible === false).length} مخفية</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">إرشادات سريعة</h3>
                  <ul className="space-y-2">
                    {[
                      "أنشئ ألبوماً أولاً ثم أضف قصائده مباشرةً من صفحة الإدارة.",
                      "في صفحة الإدارة، انقر على اسم الألبوم لعرض قصائده المرتبة وإدارتها.",
                      "يمكنك إضافة عدة قصائد دفعةً واحدة (عنوان + رابط + رقم المقطع لكل منها).",
                      "اضبط مفتاح الظهور لإخفاء أي قصيدة أو ألبوم دون حذفه من قاعدة البيانات.",
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-foreground/55">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ══ MANAGEMENT (accordion) ════════ */}
            {activeTab === "management" && (
              <div className="space-y-2.5">
                {filteredAlbums.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl py-16 text-center space-y-3">
                    <FolderHeart className="w-10 h-10 text-foreground/15 mx-auto" />
                    <p className="text-sm text-foreground/40">
                      {searchQuery ? "لا توجد نتائج مطابقة." : "لا توجد ألبومات. أضف ألبومك الأول!"}
                    </p>
                    {!searchQuery && (
                      <Button onClick={openCreateAlbumModal} size="sm" className="rounded-xl">
                        <Plus className="w-3.5 h-3.5 ml-1.5" /> ألبوم جديد
                      </Button>
                    )}
                  </div>
                ) : filteredAlbums.map(album => {
                  const albumPoems = getAlbumPoems(album.id);
                  const isExpanded = expandedAlbums.has(album.id);
                  const isVisible = album.is_visible !== false;
                  const totalPoems = audios.filter(a => a.album_id === album.id).length;

                  return (
                    <div key={album.id}
                      className={`bg-card border rounded-2xl overflow-hidden shadow-sm transition-all ${
                        isVisible ? "border-border" : "border-border/50 opacity-65"
                      } ${isExpanded ? "ring-1 ring-primary/15" : ""}`}
                    >
                      {/* ── Album header row ── */}
                      <div className={`flex items-center gap-2 px-4 py-3 ${isExpanded ? "border-b border-border bg-muted/20" : ""}`}>

                        {/* Expand toggle (left icon + name) */}
                        <button
                          onClick={() => toggleAlbumExpand(album.id)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-right group"
                          aria-expanded={isExpanded}
                        >
                          <div className={`p-1 rounded-lg shrink-0 transition-colors ${
                            isExpanded ? "bg-primary/10 text-primary" : "text-foreground/35 group-hover:text-primary group-hover:bg-primary/8"
                          }`}>
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4" />
                              : <ChevronRight className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-semibold leading-tight ${isVisible ? "text-foreground" : "text-foreground/40"}`}>
                                {safeStr(album.title)}
                              </span>
                              {album.year && (
                                <span className="text-[10px] font-mono text-foreground/30">{album.year}</span>
                              )}
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${getCategoryColor(album.category)}`}>
                                {getCategoryLabel(album.category)}
                              </span>
                            </div>
                            <p className="text-[10px] text-foreground/35 mt-0.5 flex items-center gap-2">
                              <span>{totalPoems} قصيدة</span>
                              {!isVisible && <span className="text-foreground/25">· مخفي</span>}
                            </p>
                          </div>
                        </button>

                        {/* Right controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Add poem — hidden on small screens */}
                          <Button
                            size="sm" variant="outline"
                            onClick={() => openAddPoemsForAlbum(album.id)}
                            className="hidden sm:flex h-7 px-2.5 text-[10px] font-bold rounded-lg border-primary/25 text-primary hover:bg-primary/8 gap-1"
                          >
                            <Plus className="w-3 h-3" /> قصيدة
                          </Button>

                          {/* Visibility switch */}
                          <VisibilityToggle
                            checked={isVisible}
                            onCheckedChange={() => handleToggleVisibility("albums", album.id, isVisible)}
                          />

                          {/* Edit */}
                          <button
                            onClick={() => openEditAlbumModal(album)}
                            className="p-1.5 rounded-lg text-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="تعديل الألبوم"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => requestDelete("album", album.id, safeStr(album.title))}
                            className="p-1.5 rounded-lg text-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="حذف الألبوم"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* ── Poems (expanded) ── */}
                      {isExpanded && (
                        <div>
                          {/* Mobile add poem */}
                          <div className="sm:hidden px-4 py-2 border-b border-border/50">
                            <Button size="sm" variant="outline"
                              onClick={() => openAddPoemsForAlbum(album.id)}
                              className="h-7 text-[10px] font-bold text-primary border-primary/25 hover:bg-primary/8 rounded-lg">
                              <Plus className="w-3 h-3 ml-1" /> إضافة قصيدة لهذا الألبوم
                            </Button>
                          </div>

                          {albumPoems.length === 0 ? (
                            <div className="py-10 text-center space-y-3">
                              <Music className="w-7 h-7 text-foreground/15 mx-auto" />
                              <p className="text-xs text-foreground/35">لا توجد قصائد في هذا الألبوم.</p>
                              <Button size="sm" onClick={() => openAddPoemsForAlbum(album.id)}
                                className="rounded-xl text-xs h-8">
                                <Plus className="w-3.5 h-3.5 ml-1" /> أضف أول قصيدة
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border/60">
                                      <th className="text-right text-foreground/35 font-bold px-4 py-2.5 w-12 text-[10px] tracking-wider">#</th>
                                      <th className="text-right text-foreground/35 font-bold px-3 py-2.5 text-[10px] tracking-wider">عنوان القصيدة</th>
                                      <th className="text-right text-foreground/35 font-bold px-3 py-2.5 text-[10px] tracking-wider hidden md:table-cell">رابط الملف الصوتي</th>
                                      <th className="text-center text-foreground/35 font-bold px-3 py-2.5 w-20 text-[10px] tracking-wider">الظهور</th>
                                      <th className="text-center text-foreground/35 font-bold px-3 py-2.5 w-20 text-[10px] tracking-wider">إجراءات</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {albumPoems.map((poem, pIdx) => {
                                      const poemVisible = poem.is_visible !== false;
                                      return (
                                        <tr key={poem.id}
                                          className={`border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors ${
                                            !poemVisible ? "opacity-45" : ""
                                          }`}
                                        >
                                          {/* Order # */}
                                          <td className="px-4 py-3 font-mono text-foreground/30 text-center text-xs">
                                            {poem.order ?? pIdx + 1}
                                          </td>
                                          {/* Title */}
                                          <td className="px-3 py-3">
                                            <span className="font-medium text-foreground">{safeStr(poem.title)}</span>
                                            {poem.duration && (
                                              <span className="block font-mono text-foreground/30 text-[9px] mt-0.5">{poem.duration}</span>
                                            )}
                                          </td>
                                          {/* URL */}
                                          <td className="px-3 py-3 hidden md:table-cell max-w-[200px]">
                                            {poem.audio_url ? (
                                              <a href={poem.audio_url} target="_blank" rel="noreferrer"
                                                className="flex items-center gap-1.5 text-foreground/30 hover:text-primary transition-colors group/link">
                                                <Link2 className="w-3 h-3 text-primary shrink-0" />
                                                <span className="truncate font-mono text-[9px] group-hover/link:text-primary">
                                                  {poem.audio_url}
                                                </span>
                                              </a>
                                            ) : (
                                              <span className="text-foreground/20 text-[9px]">لا يوجد رابط</span>
                                            )}
                                          </td>
                                          {/* Visibility toggle */}
                                          <td className="px-3 py-3">
                                            <VisibilityToggle
                                              checked={poemVisible}
                                              onCheckedChange={() => handleToggleVisibility("audios", poem.id, poemVisible)}
                                            />
                                          </td>
                                          {/* Actions */}
                                          <td className="px-3 py-3">
                                            <div className="flex items-center justify-center gap-0.5">
                                              <button onClick={() => openEditPoemModal(poem)}
                                                className="p-1.5 rounded-lg text-foreground/35 hover:text-primary hover:bg-primary/10 transition-colors">
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                              <button onClick={() => requestDelete("audio", poem.id, safeStr(poem.title))}
                                                className="p-1.5 rounded-lg text-foreground/35 hover:text-destructive hover:bg-destructive/10 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Footer: add more */}
                              <div className="border-t border-border/40 px-4 py-2.5">
                                <button onClick={() => openAddPoemsForAlbum(album.id)}
                                  className="flex items-center gap-1.5 text-[10px] font-bold text-primary/60 hover:text-primary transition-colors">
                                  <Plus className="w-3 h-3" /> إضافة المزيد من القصائد
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ══ VIDEOS ════════════════════════ */}
            {activeTab === "videos" && (
              <div className="space-y-2.5">
                {filteredVideos.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl py-16 text-center">
                    <Youtube className="w-10 h-10 text-foreground/15 mx-auto mb-3" />
                    <p className="text-sm text-foreground/40">{searchQuery ? "لا نتائج." : "لا توجد مرئيات."}</p>
                    {!searchQuery && (
                      <Button onClick={openCreateVideoModal} size="sm" className="mt-4 rounded-xl bg-red-600 hover:bg-red-700 text-white">
                        <Plus className="w-3.5 h-3.5 ml-1.5" /> إضافة فيديو
                      </Button>
                    )}
                  </div>
                ) : filteredVideos.map(video => {
                  const vid = extractYouTubeId(safeStr(video.youtube_url, ""));
                  return (
                    <div key={video.id}
                      className="bg-card border border-border rounded-2xl flex items-center gap-4 p-4 hover:border-red-200 dark:hover:border-red-900/30 hover:shadow-sm transition-all">
                      {vid ? (
                        <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt={safeStr(video.title)}
                          className="w-20 h-12 object-cover rounded-xl border border-border shrink-0" />
                      ) : (
                        <div className="w-20 h-12 bg-muted rounded-xl border border-border flex items-center justify-center shrink-0">
                          <Video className="w-5 h-5 text-foreground/20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{safeStr(video.title)}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-500 border border-red-200 dark:border-red-900/30">
                            {getVideoCategoryLabel(video.category)}
                          </span>
                          {video.sub_category && (
                            <span className="text-[9px] text-foreground/40">{safeStr(video.sub_category)}</span>
                          )}
                          <span className="text-[9px] text-foreground/25 font-mono">#{video.display_order ?? 0}</span>
                        </div>
                        {video.youtube_url && (
                          <a href={safeStr(video.youtube_url)} target="_blank" rel="noreferrer"
                            className="text-[9px] text-foreground/25 hover:text-red-500 transition-colors font-mono truncate block mt-0.5">
                            {safeStr(video.youtube_url)}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => openEditVideoModal(video)}
                          className="p-2 rounded-xl text-foreground/35 hover:text-primary hover:bg-primary/10 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => requestDelete("video", video.id, safeStr(video.title))}
                          className="p-2 rounded-xl text-foreground/35 hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ══ MESSAGES ══════════════════════ */}
            {activeTab === "messages" && (
              <div className="space-y-2.5">
                {filteredMessages.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl py-16 text-center">
                    <Mail className="w-10 h-10 text-foreground/15 mx-auto mb-3" />
                    <p className="text-sm text-foreground/40">{searchQuery ? "لا نتائج." : "لا توجد رسائل."}</p>
                  </div>
                ) : filteredMessages.map(msg => (
                  <div key={msg.id}
                    onClick={() => { setSelectedMessage(msg); setMessageModalOpen(true); }}
                    className="bg-card border border-border rounded-2xl p-4 hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{safeStr(msg.name)}</span>
                          <span className="text-[10px] text-foreground/30 font-mono" style={{ direction: "ltr" }}>
                            {safeStr(msg.email, "")}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-primary">{safeStr(msg.subject)}</p>
                        <p className="text-[11px] text-foreground/40 mt-1 truncate">{safeStr(msg.message)}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <span className="text-[9px] text-foreground/25 whitespace-nowrap">{safeDate(msg.created_at)}</span>
                        <button
                          onClick={e => { e.stopPropagation(); requestDelete("message", msg.id, safeStr(msg.subject)); }}
                          className="p-1.5 rounded-lg text-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════
          MODALS
      ══════════════════════════════════════ */}

      {/* Album modal */}
      <Dialog open={albumModalOpen} onOpenChange={setAlbumModalOpen}>
        <DialogContent className="bg-background border-border text-right max-w-md rounded-[1.5rem] shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingAlbum ? "تعديل الألبوم" : "إنشاء ألبوم جديد"}
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/40">
              {editingAlbum ? "عدّل التفاصيل ثم احفظ." : "أدخل تفاصيل الألبوم الجديد."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAlbum} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">اسم الألبوم *</label>
              <Input value={albumTitle} onChange={e => setAlbumTitle(e.target.value)} disabled={actionLoading}
                placeholder="مثال: ذكريات عاشوراء ١٤٤٧هـ"
                className="h-11 text-sm text-right bg-muted/30 border-border rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">سنة الإصدار</label>
                <Input value={albumYear} onChange={e => setAlbumYear(e.target.value)} disabled={actionLoading}
                  placeholder="2026" className="h-11 text-sm text-right bg-muted/30 border-border rounded-xl font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">الفئة *</label>
                <Select value={albumCategory} onValueChange={setAlbumCategory} disabled={actionLoading}>
                  <SelectTrigger className="h-11 text-sm bg-muted/30 border-border rounded-xl text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sorrow">الأحزان (عزاء)</SelectItem>
                    <SelectItem value="joy">الأفراح والمواليد</SelectItem>
                    <SelectItem value="supplications">الأدعية والمناجاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex gap-2 pt-1">
              <Button type="submit" disabled={actionLoading}
                className="h-10 px-6 text-xs font-bold rounded-xl">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAlbumModalOpen(false)}
                disabled={actionLoading} className="h-10 px-4 text-xs rounded-xl border-border">
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add poems modal (multi-entry) */}
      <Dialog open={poemModalOpen} onOpenChange={setPoemModalOpen}>
        <DialogContent
          className="bg-background border-border text-right max-w-2xl rounded-[1.5rem] shadow-2xl flex flex-col"
          style={{ maxHeight: "90vh" }}
          dir="rtl"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Music className="w-4 h-4 text-primary" />
              إضافة قصائد
              {poemModalAlbum && (
                <span className="text-sm font-normal text-foreground/40">
                  — {safeStr(poemModalAlbum.title)}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/40">
              أدخل بيانات كل قصيدة. اضغط على الزر أدناه لإضافة المزيد دفعةً واحدة.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePoems} className="flex flex-col flex-1 min-h-0 mt-3 gap-3">
            {/* Scrollable entries */}
            <div className="overflow-y-auto space-y-3 flex-1" style={{ maxHeight: "50vh" }}>
              {poemEntries.map((entry, idx) => (
                <div key={idx} className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
                  {/* Entry header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">
                      القصيدة {idx + 1}
                    </span>
                    {poemEntries.length > 1 && (
                      <button type="button" onClick={() => removePoemEntry(idx)} disabled={actionLoading}
                        className="p-1 rounded-lg text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Three fields: title | url | order */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_5rem] gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-foreground/35 uppercase tracking-wider">العنوان</label>
                      <Input
                        value={entry.title}
                        onChange={e => updatePoemEntry(idx, "title", e.target.value)}
                        disabled={actionLoading}
                        placeholder="عنوان القصيدة (اختياري)"
                        className="h-9 text-xs text-right bg-background border-border rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-foreground/35 uppercase tracking-wider">رابط الملف الصوتي *</label>
                      <Input
                        type="url"
                        value={entry.url}
                        onChange={e => updatePoemEntry(idx, "url", e.target.value)}
                        disabled={actionLoading}
                        placeholder="https://…/track.mp3"
                        className="h-9 text-xs text-left font-mono bg-background border-border rounded-xl"
                        style={{ direction: "ltr" }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-foreground/35 uppercase tracking-wider">رقم المقطع</label>
                      <Input
                        type="number" min="0"
                        value={entry.order}
                        onChange={e => updatePoemEntry(idx, "order", e.target.value)}
                        disabled={actionLoading}
                        className="h-9 text-xs text-center font-mono bg-background border-border rounded-xl"
                        style={{ direction: "ltr" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add more button */}
            <button type="button" onClick={addPoemEntry} disabled={actionLoading}
              className="shrink-0 w-full h-10 flex items-center justify-center gap-2 text-xs font-bold text-primary border border-dashed border-primary/40 rounded-xl hover:bg-primary/5 hover:border-primary/60 transition-all">
              <Plus className="w-3.5 h-3.5" /> إضافة قصيدة أخرى
            </button>

            <DialogFooter className="flex gap-2 pt-1 shrink-0">
              <Button type="submit" disabled={actionLoading}
                className="h-10 px-6 text-xs font-bold rounded-xl">
                {actionLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : `إضافة ${poemEntries.filter(e => e.url.trim()).length || 1} قصيدة`
                }
              </Button>
              <Button type="button" variant="outline" onClick={() => setPoemModalOpen(false)}
                disabled={actionLoading} className="h-10 px-4 text-xs rounded-xl border-border">
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit single poem modal */}
      <Dialog open={editPoemModalOpen} onOpenChange={setEditPoemModalOpen}>
        <DialogContent className="bg-background border-border text-right max-w-md rounded-[1.5rem] shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">تعديل القصيدة</DialogTitle>
            <DialogDescription className="text-xs text-foreground/40">عدّل بيانات هذه القصيدة ثم احفظ.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEditPoem} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">العنوان *</label>
              <Input value={editAudioTitle} onChange={e => setEditAudioTitle(e.target.value)} disabled={actionLoading}
                placeholder="عنوان القصيدة"
                className="h-11 text-sm text-right bg-muted/30 border-border rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">رابط الملف الصوتي *</label>
              <Input type="url" value={editAudioUrl} onChange={e => setEditAudioUrl(e.target.value)}
                disabled={actionLoading} placeholder="https://…/track.mp3"
                className="h-11 text-xs text-left font-mono bg-muted/30 border-border rounded-xl"
                style={{ direction: "ltr" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">الألبوم</label>
                <Select value={editAudioAlbumId} onValueChange={setEditAudioAlbumId} disabled={actionLoading}>
                  <SelectTrigger className="h-11 text-sm bg-muted/30 border-border rounded-xl text-right">
                    <SelectValue placeholder="اختر ألبوماً…" />
                  </SelectTrigger>
                  <SelectContent>
                    {albums.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>{safeStr(a.title)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">رقم المقطع</label>
                <Input type="number" min="0" value={editAudioOrder} onChange={e => setEditAudioOrder(e.target.value)}
                  disabled={actionLoading}
                  className="h-11 text-sm text-center font-mono bg-muted/30 border-border rounded-xl"
                  style={{ direction: "ltr" }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">المدة (مم:ثث)</label>
              <Input placeholder="07:15" value={editAudioDuration} onChange={e => setEditAudioDuration(e.target.value)}
                disabled={actionLoading}
                className="h-11 text-sm text-left font-mono bg-muted/30 border-border rounded-xl"
                style={{ direction: "ltr" }} />
            </div>
            <DialogFooter className="flex gap-2 pt-1">
              <Button type="submit" disabled={actionLoading}
                className="h-10 px-6 text-xs font-bold rounded-xl">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديلات"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditPoemModalOpen(false)}
                disabled={actionLoading} className="h-10 px-4 text-xs rounded-xl border-border">
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Video modal */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="bg-background border-border text-right max-w-lg rounded-[1.5rem] shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-500 flex items-center gap-2">
              <Youtube className="w-4 h-4" />
              {editingVideo ? "تعديل الفيديو" : "إضافة فيديو يوتيوب"}
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/40">
              الصق رابط يوتيوب — يُستخرج معرّف الفيديو تلقائياً.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveVideo} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">عنوان الفيديو *</label>
              <Input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} disabled={actionLoading}
                placeholder="مثال: إحياء مجلس عاشوراء ١٤٤٧هـ"
                className="h-11 text-sm text-right bg-muted/30 border-border rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">رابط يوتيوب *</label>
                {videoPreviewId && (
                  <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> صالح · {videoPreviewId}
                  </span>
                )}
              </div>
              <Input type="url" value={videoYoutubeUrl} onChange={e => handleVideoUrlChange(e.target.value)}
                disabled={actionLoading} placeholder="https://www.youtube.com/watch?v=…"
                className={`h-11 text-xs text-left font-mono bg-muted/30 rounded-xl ${
                  videoUrlError ? "border-red-400" : "border-border"
                }`}
                style={{ direction: "ltr" }} />
              {videoUrlError && <p className="text-[10px] text-red-500">{videoUrlError}</p>}
              {videoPreviewId && (
                <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-border mt-1">
                  <img
                    src={`https://img.youtube.com/vi/${videoPreviewId}/maxresdefault.jpg`}
                    alt="معاينة" className="w-full h-full object-cover opacity-70"
                    onError={e => {
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoPreviewId}/mqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-red-600/80 rounded-full flex items-center justify-center">
                      <Youtube className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[9px] px-2 py-0.5 rounded-full">
                    معاينة مباشرة
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">الفئة *</label>
                <Select value={videoCategory} onValueChange={setVideoCategory} disabled={actionLoading}>
                  <SelectTrigger className="h-11 text-sm bg-muted/30 border-border rounded-xl text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">الجديد</SelectItem>
                    <SelectItem value="popular">الأكثر مشاهدة</SelectItem>
                    <SelectItem value="featured">مختارات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">ترتيب العرض</label>
                <Input type="number" min="0" value={videoOrder} onChange={e => setVideoOrder(e.target.value)}
                  disabled={actionLoading}
                  className="h-11 text-sm text-center font-mono bg-muted/30 border-border rounded-xl"
                  style={{ direction: "ltr" }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">التصنيف الفرعي (اختياري)</label>
              <Input value={videoSubCategory} onChange={e => setVideoSubCategory(e.target.value)} disabled={actionLoading}
                placeholder="مثال: مجالس العزاء - محرم"
                className="h-11 text-sm text-right bg-muted/30 border-border rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">وصف (اختياري)</label>
              <Textarea value={videoDescription} onChange={e => setVideoDescription(e.target.value)}
                disabled={actionLoading} placeholder="وصف مختصر عن الفيديو…"
                className="text-sm text-right bg-muted/30 border-border rounded-xl resize-none min-h-[60px]" />
            </div>
            <DialogFooter className="flex gap-2 pt-1">
              <Button type="submit" disabled={actionLoading || !!videoUrlError}
                className="h-10 px-6 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الفيديو"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setVideoModalOpen(false)}
                disabled={actionLoading} className="h-10 px-4 text-xs rounded-xl border-border">
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Message detail modal */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="bg-background border-border text-right max-w-lg rounded-[1.5rem] shadow-2xl" dir="rtl">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-base font-bold text-foreground">تفاصيل الرسالة</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-foreground/35 font-bold text-[9px] mb-1 uppercase tracking-wider">المرسل</span>
                  <span className="font-semibold text-foreground">{safeStr(selectedMessage.name)}</span>
                </div>
                <div>
                  <span className="block text-foreground/35 font-bold text-[9px] mb-1 uppercase tracking-wider">البريد</span>
                  <span className="text-foreground" style={{ direction: "ltr" }}>{safeStr(selectedMessage.email)}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-foreground/35 font-bold text-[9px] mb-1 uppercase tracking-wider">الموضوع</span>
                  <span className="font-semibold text-primary">{safeStr(selectedMessage.subject)}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-foreground/35 font-bold text-[9px] mb-1 uppercase tracking-wider">التاريخ</span>
                  <span className="text-foreground/50">{safeDate(selectedMessage.created_at)}</span>
                </div>
              </div>
              <div>
                <span className="block text-foreground/35 font-bold text-[9px] mb-2 uppercase tracking-wider">نص الرسالة</span>
                <div className="bg-muted/40 border border-border rounded-xl p-4 text-xs text-foreground/70 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {safeStr(selectedMessage.message)}
                </div>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => { setMessageModalOpen(false); requestDelete("message", selectedMessage.id, safeStr(selectedMessage.subject)); }}
                  className="h-9 text-xs text-red-500 border-red-200 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl px-4">
                  <Trash2 className="w-3.5 h-3.5 ml-1.5" /> حذف
                </Button>
                <Button variant="outline" onClick={() => setMessageModalOpen(false)}
                  className="h-9 text-xs rounded-xl border-border px-5">إغلاق</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-background border border-red-200 dark:border-red-900/30 text-right max-w-sm rounded-[1.5rem] shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-500">تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-foreground/55 py-2 leading-relaxed">
            هل أنت متأكد من حذف{" "}
            <span className="font-semibold text-foreground">"{deleteTarget?.label ?? "هذا العنصر"}"</span>{" "}
            نهائياً؟ لا يمكن التراجع عن هذه العملية.
          </p>
          <DialogFooter className="flex gap-2">
            <Button onClick={executeDelete} disabled={actionLoading}
              className="h-10 px-6 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف نهائي"}
            </Button>
            <Button variant="outline"
              onClick={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }}
              disabled={actionLoading} className="h-10 px-4 text-xs rounded-xl border-border">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
