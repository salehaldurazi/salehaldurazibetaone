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
  Bell, Sparkles, ArrowRight, Folder, FolderOpen, Volume2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { normalizeArabic } from "@/lib/utils";

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
interface AudioFolder {
  id: number;
  name: string;
  category: string;
  folder_type: "qasaed_only" | "albums_only";
  display_order: number;
  is_visible: boolean;
  created_at?: string | null;
}

interface Album {
  id: number;
  title: string;
  year?: string | number | null;
  category?: string | null;
  folder_id?: number | null;
  is_visible?: boolean;
  created_at?: string | null;
}

interface AudioTrack {
  id: number;
  title: string;
  audio_url?: string | null;
  album_id?: number | null;
  folder_id?: number | null;
  category?: string | null;
  duration?: string | null;
  order?: number | null;
  description?: string | null;
  release_year?: number | null;
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

interface SiteUpdate {
  id: number | string;
  content: string;
  link?: string | null;
  is_visible?: boolean;
  created_at?: string | null;
}

const FALLBACK_SITE_UPDATES: SiteUpdate[] = [
  {
    id: "f-1",
    content: "تم إضافة إصدار جديد: ألبوم 'يا جرح علي' في مكتبة الصوتيات",
    link: "#audio",
    is_visible: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "f-2",
    content: "تحديث أدعية ومناجاة ليلة الجمعة المباركة بمرئيات عالية الجودة",
    link: "#audio",
    is_visible: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "f-3",
    content: "مكتبة المرئيات الرسمية أصبحت متاحة الآن مع باقة من اللطميات المصورة",
    link: "#videos",
    is_visible: true,
    created_at: new Date().toISOString(),
  },
];

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

function isSupplicationCategory(cat: string | null | undefined): boolean {
  if (!cat) return false;
  const c = String(cat).trim().toLowerCase();
  return c === "supplications" || c === "duas" || c === "dua" || c === "الأدعية" || c === "ادعية";
}

function filterAudioTrack(t: AudioTrack, trackFilterType: string, searchQuery: string): boolean {
  if (searchQuery.trim()) {
    const q = normalizeArabic(searchQuery);
    const titleMatch = normalizeArabic(safeStr(t.title)).includes(q);
    const urlMatch = safeStr(t.audio_url).toLowerCase().includes(searchQuery.toLowerCase());
    if (!titleMatch && !urlMatch) return false;
  }
  if (trackFilterType === "supplications") return isSupplicationCategory(t.category);
  if (trackFilterType === "albums") return t.album_id != null;
  if (trackFilterType === "folders") return t.folder_id != null && t.album_id == null;
  if (trackFilterType === "standalone") return t.album_id == null && t.folder_id == null && !isSupplicationCategory(t.category);
  return true;
}

function getCategoryLabel(cat: string | null | undefined): string {
  if (isSupplicationCategory(cat)) return "الأدعية والمناجاة";
  switch (cat) {
    case "sorrow": return "الأحزان (عزاء)";
    case "joy": return "الأفراح والمواليد";
    default: return safeStr(cat, "غير مصنف");
  }
}

function getCategoryColor(cat: string | null | undefined): string {
  if (isSupplicationCategory(cat)) {
    return "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40";
  }
  switch (cat) {
    case "sorrow":
      return "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40";
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
type Tab = "overview" | "management" | "updates" | "messages" | "videos";

export default function AdminDashboard() {
  const router = useRouter();

  // ── Core State ──────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [audios, setAudios] = useState<AudioTrack[]>([]);
  const [folders, setFolders] = useState<AudioFolder[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [siteUpdates, setSiteUpdates] = useState<SiteUpdate[]>(FALLBACK_SITE_UPDATES);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Accordion ────────────────────────────────
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  // ── Folder modal ──────────────────────────────
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<AudioFolder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderCategory, setFolderCategory] = useState("sorrow");
  const [folderType, setFolderType] = useState<"qasaed_only" | "albums_only">("albums_only");
  const [folderOrder, setFolderOrder] = useState("0");

  // ── Modal flags ──────────────────────────────
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [poemModalOpen, setPoemModalOpen] = useState(false);
  const [editPoemModalOpen, setEditPoemModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // ── Album form ───────────────────────────────
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumYear, setAlbumYear] = useState("");
  const [albumCategory, setAlbumCategory] = useState("sorrow");
  const [albumFolderIdField, setAlbumFolderIdField] = useState<string>("none");

  // ── Site Update form ────────────────────────
  const [editingUpdate, setEditingUpdate] = useState<SiteUpdate | null>(null);
  const [updateContentText, setUpdateContentText] = useState("");
  const [updateLinkUrl, setUpdateLinkUrl] = useState("");

  // ── Add-Poems form ──
  const [poemModalAlbumIdStr, setPoemModalAlbumIdStr] = useState<string>("none");
  const [poemModalFolderIdStr, setPoemModalFolderIdStr] = useState<string>("none");
  const [poemEntries, setPoemEntries] = useState<{
    title: string;
    url: string;
    duration: string;
    order: string;
    release_year: string;
    description: string;
  }[]>([
    { title: "", url: "", duration: "", order: "1", release_year: "", description: "" },
  ]);

  // ── Edit single poem form ────────────────────
  const [editingAudio, setEditingAudio] = useState<AudioTrack | null>(null);
  const [editAudioTitle, setEditAudioTitle] = useState("");
  const [editAudioUrl, setEditAudioUrl] = useState("");
  const [editAudioOrder, setEditAudioOrder] = useState("0");
  const [editAudioAlbumId, setEditAudioAlbumId] = useState<string>("none");
  const [editAudioFolderId, setEditAudioFolderId] = useState<string>("none");
  const [editAudioDuration, setEditAudioDuration] = useState("");
  const [editAudioReleaseYear, setEditAudioReleaseYear] = useState("");
  const [editAudioDescription, setEditAudioDescription] = useState("");

  // ── Sub-tab & filters for management ─────────
  const [managementSubTab, setManagementSubTab] = useState<"folders_albums" | "all_audios">("folders_albums");
  const [trackFilterType, setTrackFilterType] = useState<string>("all");

  // ── Add/Edit Audio Track Form (Direct URL) ──
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [audioTrackTitle, setAudioTrackTitle] = useState("");
  const [audioTrackUrl, setAudioTrackUrl] = useState("");
  const [audioAssignmentType, setAudioAssignmentType] = useState<"supplications" | "album" | "folder" | "standalone">("supplications");
  const [audioTargetAlbumId, setAudioTargetAlbumId] = useState<string>("none");
  const [audioTargetFolderId, setAudioTargetFolderId] = useState<string>("none");
  const [audioCategory, setAudioCategory] = useState("sorrow");
  const [audioDuration, setAudioDuration] = useState("");
  const [audioOrder, setAudioOrder] = useState("1");
  const [audioReleaseYear, setAudioReleaseYear] = useState("");
  const [audioDescription, setAudioDescription] = useState("");

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
    type: "album" | "audio" | "message" | "video" | "update" | "folder";
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
        .select("id, title, year, category, folder_id, is_visible, created_at")
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
        .select(`id, title, audio_url, album_id, folder_id, category, duration, "order", description, release_year, is_visible, created_at`)
        .order("order", { ascending: true });
      if (error) {
        toast({ title: "تحذير – القصائد", description: error.message, variant: "destructive" });
        setAudios([]);
      } else {
        setAudios((data ?? []) as AudioTrack[]);
      }
    } catch { setAudios([]); }

    // Folders — non-fatal
    try {
      const { data, error } = await supabase
        .from("audio_folders")
        .select("id, name, category, folder_type, display_order, is_visible, created_at")
        .order("display_order", { ascending: true });
      if (!error && data) setFolders(data as AudioFolder[]);
    } catch { setFolders([]); }

    // Site Updates — non-fatal
    try {
      const { data, error } = await supabase
        .from("site_updates")
        .select("id, content, link, is_visible, created_at")
        .order("created_at", { ascending: false });
      if (error) setSiteUpdates(FALLBACK_SITE_UPDATES);
      else setSiteUpdates(data && data.length > 0 ? data : FALLBACK_SITE_UPDATES);
    } catch {
      setSiteUpdates(FALLBACK_SITE_UPDATES);
    }

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

  function toggleFolderExpand(id: number) {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ─────────────────────────────────────────────
  // FOLDER CRUD
  // ─────────────────────────────────────────────
  function openCreateFolderModal() {
    setEditingFolder(null);
    setFolderName("");
    setFolderCategory("sorrow");
    setFolderType("albums_only");
    setFolderOrder("0");
    setFolderModalOpen(true);
  }

  function openEditFolderModal(folder: AudioFolder) {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderCategory(folder.category);
    setFolderType(folder.folder_type ?? "albums_only");
    setFolderOrder(String(folder.display_order ?? 0));
    setFolderModalOpen(true);
  }

  async function handleSaveFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!folderName.trim()) {
      toast({ title: "خطأ", description: "اسم المجلد مطلوب.", variant: "destructive" }); return;
    }
    const orderNum = parseInt(folderOrder, 10);
    const payload = {
      name: folderName.trim(),
      category: folderCategory,
      folder_type: folderType,
      display_order: isNaN(orderNum) ? 0 : orderNum,
    };
    setActionLoading(true);
    try {
      if (editingFolder) {
        const { error } = await supabase.from("audio_folders").update(payload).eq("id", editingFolder.id);
        if (error) throw error;
        toast({ title: "✓ تم التحديث", description: "تم تحديث المجلد." });
      } else {
        const { error } = await supabase.from("audio_folders").insert([{ ...payload, is_visible: true }]);
        if (error) throw error;
        toast({ title: "✓ تم الإضافة", description: "تم إنشاء المجلد بنجاح." });
      }
      setFolderModalOpen(false);
      await fetchData();
      router.refresh();
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  }

  async function handleToggleFolderVisibility(folder: AudioFolder) {
    const newVisible = !folder.is_visible;
    setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, is_visible: newVisible } : f));
    try {
      const { error } = await supabase.from("audio_folders").update({ is_visible: newVisible }).eq("id", folder.id);
      if (error) throw error;
      toast({ title: newVisible ? "✓ المجلد ظاهر الآن" : "✓ المجلد مخفي الآن" });
    } catch (err: any) {
      setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, is_visible: folder.is_visible } : f));
      toast({ title: "خطأ في التحديث", description: err.message, variant: "destructive" });
    }
  }

  // ─────────────────────────────────────────────
  // VISIBILITY TOGGLE (optimistic)
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
  function openCreateAlbumModal(folderId?: number) {
    setEditingAlbum(null);
    setAlbumTitle("");
    setAlbumYear(new Date().getFullYear().toString());
    setAlbumCategory("sorrow");
    setAlbumFolderIdField(folderId ? String(folderId) : "none");
    setAlbumModalOpen(true);
  }
  function openEditAlbumModal(album: Album) {
    setEditingAlbum(album);
    setAlbumTitle(safeStr(album.title, ""));
    setAlbumYear(safeStr(album.year, new Date().getFullYear().toString()));
    setAlbumCategory(album.category ?? "sorrow");
    setAlbumFolderIdField(album.folder_id ? String(album.folder_id) : "none");
    setAlbumModalOpen(true);
  }
  async function handleSaveAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!albumTitle.trim()) {
      toast({ title: "خطأ", description: "اسم الألبوم مطلوب.", variant: "destructive" }); return;
    }
    const yearNum = parseInt(albumYear, 10);
    const folderIdNum = albumFolderIdField && albumFolderIdField !== "none" ? parseInt(albumFolderIdField, 10) : null;
    const payload = {
      title: albumTitle.trim(),
      year: isNaN(yearNum) ? null : yearNum,
      category: albumCategory,
      folder_id: folderIdNum && !isNaN(folderIdNum) ? Number(folderIdNum) : null,
    };
    console.log("[Admin handleSaveAlbum] Payload:", payload);
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
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("library-data-updated"));
      }
    } catch (err: any) {
      console.error("[Admin handleSaveAlbum] Error:", err);
      toast({
        title: "خطأ في حفظ الألبوم",
        description: `${err.message || err} ${err.details ? " - " + err.details : ""}`,
        variant: "destructive"
      });
    } finally { setActionLoading(false); }
  }

  // ─────────────────────────────────────────────
  // ADD POEMS / QASAED
  // ─────────────────────────────────────────────
  function openAddPoemsForAlbum(albumId: number) {
    setPoemModalAlbumIdStr(String(albumId));
    setPoemModalFolderIdStr("none");
    const albumAudios = audios.filter(a => a.album_id === albumId);
    const nextOrder = albumAudios.length > 0
      ? Math.max(...albumAudios.map(a => a.order ?? 0)) + 1
      : 1;
    setPoemEntries([{ title: "", url: "", duration: "", order: String(nextOrder), release_year: "", description: "" }]);
    setPoemModalOpen(true);
  }

  function openAddPoemForFolder(folderId: number) {
    setPoemModalFolderIdStr(String(folderId));
    setPoemModalAlbumIdStr("none");
    const folderAudios = audios.filter(a => a.folder_id === folderId);
    const nextOrder = folderAudios.length > 0
      ? Math.max(...folderAudios.map(a => a.order ?? 0)) + 1
      : 1;
    setPoemEntries([{ title: "", url: "", duration: "", order: String(nextOrder), release_year: "", description: "" }]);
    setPoemModalOpen(true);
  }

  function addPoemEntry() {
    setPoemEntries(prev => {
      const last = parseInt(prev[prev.length - 1]?.order ?? "0", 10);
      return [...prev, { title: "", url: "", duration: "", order: String(isNaN(last) ? prev.length + 1 : last + 1), release_year: "", description: "" }];
    });
  }

  function removePoemEntry(idx: number) {
    setPoemEntries(prev => prev.filter((_, i) => i !== idx));
  }

  function updatePoemEntry(idx: number, field: "title" | "url" | "duration" | "order" | "release_year" | "description", value: string) {
    setPoemEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  async function handleSavePoems(e: React.FormEvent) {
    e.preventDefault();
    const validEntries = poemEntries.filter(e => e.url.trim());
    if (validEntries.length === 0) {
      toast({ title: "خطأ", description: "يرجى إدخال رابط صوتي لقصيدة واحدة على الأقل.", variant: "destructive" });
      return;
    }

    const targetAlbumId = poemModalAlbumIdStr && poemModalAlbumIdStr !== "none"
      ? parseInt(poemModalAlbumIdStr, 10)
      : null;
    const targetFolderId = poemModalFolderIdStr && poemModalFolderIdStr !== "none"
      ? parseInt(poemModalFolderIdStr, 10)
      : null;

    if (!targetAlbumId && !targetFolderId) {
      toast({ title: "خطأ", description: "يجب اختيار ألبوم أو مجلد قصائد لربط القصائد به.", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      const payloads = validEntries.map((entry, i) => {
        const yearNum = entry.release_year ? parseInt(entry.release_year, 10) : NaN;
        const base: Record<string, any> = {
          title: entry.title.trim() || `قصيدة ${i + 1}`,
          audio_url: entry.url.trim(),
          duration: entry.duration.trim() || null,
          order: parseInt(entry.order, 10) || (i + 1),
          release_year: !isNaN(yearNum) ? yearNum : null,
          description: entry.description.trim() || null,
          is_visible: true,
        };
        if (targetAlbumId && !isNaN(targetAlbumId)) {
          base.album_id = Number(targetAlbumId);
        } else {
          base.album_id = null;
        }
        if (targetFolderId && !isNaN(targetFolderId)) {
          base.folder_id = Number(targetFolderId);
        } else {
          base.folder_id = null;
        }
        return base;
      });
      console.log("[Admin handleSavePoems] Payloads:", payloads);
      const { error } = await supabase.from("audios").insert(payloads);
      if (error) {
        console.error("[Admin handleSavePoems] Supabase insert error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }
      toast({ title: "✓ تم الإضافة", description: `تمت إضافة ${payloads.length} قصيدة بنجاح.` });
      setPoemModalOpen(false);
      await fetchData();
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("library-data-updated"));
      }
    } catch (err: any) {
      console.error("[Admin handleSavePoems] Exception caught:", err);
      toast({
        title: "خطأ في حفظ القصائد",
        description: `${err.message || err} ${err.details ? " - " + err.details : ""} ${err.hint ? " (" + err.hint + ")" : ""}`,
        variant: "destructive",
      });
    } finally { setActionLoading(false); }
  }

  // ─────────────────────────────────────────────
  // SINGLE AUDIO TRACK CRUD (Direct Link / URL)
  // ─────────────────────────────────────────────
  function openCreateAudioModal(defaultAlbumId?: number, defaultFolderId?: number) {
    setEditingAudio(null);
    setAudioTrackTitle("");
    setAudioTrackUrl("");
    if (defaultAlbumId) {
      setAudioAssignmentType("album");
      setAudioTargetAlbumId(String(defaultAlbumId));
      setAudioTargetFolderId("none");
    } else if (defaultFolderId) {
      setAudioAssignmentType("folder");
      setAudioTargetFolderId(String(defaultFolderId));
      setAudioTargetAlbumId("none");
    } else {
      setAudioAssignmentType("supplications");
      setAudioTargetAlbumId("none");
      setAudioTargetFolderId("none");
    }
    setAudioCategory("sorrow");
    setAudioDuration("");
    setAudioOrder(String(audios.length + 1));
    setAudioReleaseYear(new Date().getFullYear().toString());
    setAudioDescription("");
    setAudioModalOpen(true);
  }

  function openEditPoemModal(audio: AudioTrack) {
    setEditingAudio(audio);
    setAudioTrackTitle(safeStr(audio.title, ""));
    setAudioTrackUrl(safeStr(audio.audio_url, ""));
    if (isSupplicationCategory(audio.category)) {
      setAudioAssignmentType("supplications");
      setAudioTargetAlbumId("none");
      setAudioTargetFolderId("none");
    } else if (audio.album_id) {
      setAudioAssignmentType("album");
      setAudioTargetAlbumId(String(audio.album_id));
      setAudioTargetFolderId("none");
    } else if (audio.folder_id) {
      setAudioAssignmentType("folder");
      setAudioTargetFolderId(String(audio.folder_id));
      setAudioTargetAlbumId("none");
    } else {
      setAudioAssignmentType("standalone");
      setAudioTargetAlbumId("none");
      setAudioTargetFolderId("none");
    }
    setAudioCategory(audio.category ?? "sorrow");
    setAudioDuration(safeStr(audio.duration, ""));
    setAudioOrder(audio.order != null ? String(audio.order) : "1");
    setAudioReleaseYear(audio.release_year != null ? String(audio.release_year) : "");
    setAudioDescription(safeStr(audio.description, ""));
    setAudioModalOpen(true);
  }

  async function handleSaveAudioTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!audioTrackTitle.trim() || !audioTrackUrl.trim()) {
      toast({ title: "خطأ", description: "عنوان المقطع ورابط الصوت المباشر مطلوبان.", variant: "destructive" });
      return;
    }

    const orderNum = parseInt(audioOrder, 10);
    const yearNum = audioReleaseYear ? parseInt(audioReleaseYear, 10) : NaN;

    let albumIdVal: number | null = null;
    let folderIdVal: number | null = null;
    let categoryVal: string | null = null;

    if (audioAssignmentType === "supplications") {
      categoryVal = "supplications";
      albumIdVal = null;
      folderIdVal = null;
    } else if (audioAssignmentType === "album") {
      const albId = parseInt(audioTargetAlbumId, 10);
      albumIdVal = !isNaN(albId) ? albId : null;
      folderIdVal = null;
      const matchedAlbum = albums.find(a => a.id === albumIdVal);
      categoryVal = matchedAlbum?.category ?? "sorrow";
    } else if (audioAssignmentType === "folder") {
      const fId = parseInt(audioTargetFolderId, 10);
      folderIdVal = !isNaN(fId) ? fId : null;
      albumIdVal = null;
      const matchedFolder = folders.find(f => f.id === folderIdVal);
      categoryVal = matchedFolder?.category ?? "sorrow";
    } else {
      categoryVal = audioCategory || "sorrow";
      albumIdVal = null;
      folderIdVal = null;
    }

    const payload: Record<string, any> = {
      title: audioTrackTitle.trim(),
      audio_url: audioTrackUrl.trim(),
      category: categoryVal,
      album_id: albumIdVal,
      folder_id: folderIdVal,
      duration: audioDuration.trim() || null,
      order: isNaN(orderNum) ? 1 : orderNum,
      release_year: !isNaN(yearNum) ? yearNum : null,
      description: audioDescription.trim() || null,
    };

    setActionLoading(true);
    try {
      if (editingAudio) {
        const { error } = await supabase.from("audios").update(payload).eq("id", editingAudio.id);
        if (error) throw error;
        toast({ title: "✓ تم التحديث", description: "تم تحديث بيانات المقطع الصوتي." });
      } else {
        const { error } = await supabase.from("audios").insert([{ ...payload, is_visible: true }]);
        if (error) throw error;
        toast({ title: "✓ تم الإضافة", description: "تمت إضافة المقطع الصوتي بنجاح." });
      }
      setAudioModalOpen(false);
      await fetchData();
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("library-data-updated"));
      }
    } catch (err: any) {
      console.error("[Admin handleSaveAudioTrack] Error:", err);
      toast({
        title: "خطأ في حفظ المقطع الصوتي",
        description: err.message || "حدث خطأ أثناء الحفظ.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemovePoemFromFolder(poem: AudioTrack) {
    setActionLoading(true);
    try {
      const { error } = await supabase.from("audios").update({ folder_id: null }).eq("id", poem.id);
      if (error) throw error;
      toast({ title: "✓ تم إزالة القصيدة من المجلد" });
      await fetchData();
    } catch (err: any) {
      toast({ title: "خطأ في إزالة القصيدة", description: err.message, variant: "destructive" });
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
      setVideoUrlError("الرابط غير صالح. يرجى لصق رابط يوتيوب صحيح."); return;
    }
    const orderNum = parseInt(videoOrder, 10);
    const payload = {
      title: videoTitle.trim(),
      description: videoDescription.trim() || null,
      youtube_url: videoYoutubeUrl.trim(),
      category: videoCategory,
      sub_category: videoSubCategory.trim() || null,
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
        toast({ title: "✓ تم الإضافة", description: "تم إنشاء الفيديو بنجاح." });
      }
      setVideoModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  }

  // ─────────────────────────────────────────────
  // SITE UPDATES CRUD
  // ─────────────────────────────────────────────
  function openCreateUpdateModal() {
    setEditingUpdate(null);
    setUpdateContentText("");
    setUpdateLinkUrl("");
    setUpdateModalOpen(true);
  }
  function openEditUpdateModal(up: SiteUpdate) {
    setEditingUpdate(up);
    setUpdateContentText(up.content);
    setUpdateLinkUrl(up.link ?? "");
    setUpdateModalOpen(true);
  }
  async function handleSaveUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!updateContentText.trim()) {
      toast({ title: "خطأ", description: "محتوى التحديث مطلوب.", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    const payload = {
      content: updateContentText.trim(),
      link: updateLinkUrl.trim() || null,
    };
    try {
      if (editingUpdate) {
        const { error } = await supabase.from("site_updates").update(payload).eq("id", editingUpdate.id);
        if (error) throw error;
        toast({ title: "✓ تم التحديث", description: "تم تحديث بيانات التحديث بنجاح." });
      } else {
        const { error } = await supabase.from("site_updates").insert([{ ...payload, is_visible: true }]);
        if (error) throw error;
        toast({ title: "✓ تم الإضافة", description: "تم إضافة التحديث الجديد بنجاح." });
      }
      setUpdateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleUpdateVisibility(up: SiteUpdate) {
    const newVis = !(up.is_visible !== false);
    setSiteUpdates(prev => prev.map(item => item.id === up.id ? { ...item, is_visible: newVis } : item));
    try {
      const { error } = await supabase.from("site_updates").update({ is_visible: newVis }).eq("id", up.id);
      if (error) throw error;
      toast({ title: newVis ? "✓ تم إظهار التحديث" : "✓ تم إخفاء التحديث" });
    } catch (err: any) {
      setSiteUpdates(prev => prev.map(item => item.id === up.id ? { ...item, is_visible: up.is_visible } : item));
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  }

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────
  function requestDelete(type: "album" | "audio" | "message" | "video" | "update" | "folder", id: number | string, label?: string) {
    setDeleteTarget({ type, id, label });
    setDeleteConfirmOpen(true);
  }
  async function executeDelete() {
    if (!deleteTarget) return;
    const tableMap: Record<string, string> = {
      album: "albums", audio: "audios", message: "messages", video: "videos", update: "site_updates", folder: "audio_folders",
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
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("library-data-updated"));
      }
    } catch (err: any) {
      toast({ title: "خطأ في الحذف", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  }

  // ─────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────
  const poemModalAlbum = albums.find(a => String(a.id) === poemModalAlbumIdStr);
  const poemModalFolder = folders.find(f => String(f.id) === poemModalFolderIdStr);

  const filteredAlbums = albums.filter(a => {
    if (!searchQuery.trim()) return true;
    const q = normalizeArabic(searchQuery);
    return normalizeArabic(safeStr(a.title)).includes(q) || safeStr(a.year).includes(q);
  });

  function getAlbumPoems(albumId: number) {
    return audios.filter(a => a.album_id === albumId);
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground font-sans dir-rtl antialiased selection:bg-primary/20 selection:text-primary">

      {/* ══ HEADER ════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Title / Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">
                لوحة التحكم الإدارية
              </h1>
              <p className="text-[11px] text-foreground/50 hidden sm:block">
                مكتبة الشيخ صالح الدرازي
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="h-9 w-9 p-0 rounded-xl text-foreground/70 hover:text-foreground hover:bg-muted"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
            </Button>

            <ThemeSwitcher />

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-xl text-foreground/70 hover:text-foreground bg-muted/60 hover:bg-muted border border-border transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>الموقع العام</span>
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-9 px-3 text-xs font-bold rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-colors gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ══ SUB-HEADER (Tabs & Quick Action) ════ */}
      <div className="bg-card/50 border-b border-border py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
            {[
              { id: "overview" as Tab, label: "نظرة عامة", icon: LayoutDashboard },
              { id: "management" as Tab, label: "المجلدات والألبومات", icon: FolderHeart, count: albums.length },
              { id: "updates" as Tab, label: "شريط الأخبار", icon: Bell, count: siteUpdates.length },
              { id: "videos" as Tab, label: "المرئيات", icon: Youtube, count: videos.length },
              { id: "messages" as Tab, label: "الرسائل", icon: Mail, count: messages.length },
            ].map(({ id, label, icon: Icon, count }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/60 hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  {count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground/60"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action buttons on tab switch */}
          {activeTab === "management" && (
            <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
              <Button
                onClick={() => openCreateAudioModal()}
                size="sm"
                className="h-9 px-4 text-xs font-bold rounded-xl shadow-sm gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مقطع صوتي</span>
              </Button>

              <Button
                onClick={openCreateFolderModal}
                size="sm"
                variant="outline"
                className="h-9 px-3.5 text-xs font-bold rounded-xl border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
              >
                <Folder className="w-4 h-4" />
                <span>مجلد جديد</span>
              </Button>

              <Button
                onClick={() => openCreateAlbumModal()}
                size="sm"
                variant="outline"
                className="h-9 px-4 text-xs font-bold rounded-xl border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>ألبوم جديد</span>
              </Button>
            </div>
          )}

          {activeTab === "updates" && (
            <div className="flex items-center justify-end w-full md:w-auto">
              <Button
                onClick={openCreateUpdateModal}
                size="sm"
                className="h-9 px-4 text-xs font-bold rounded-xl shadow-sm gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>تحديث جديد</span>
              </Button>
            </div>
          )}

          {activeTab === "videos" && (
            <div className="flex items-center justify-end w-full md:w-auto">
              <Button
                onClick={openCreateVideoModal}
                size="sm"
                className="h-9 px-4 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>فيديو جديد</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ══ MAIN BODY ═════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Global Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-foreground/40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-semibold">جاري جلب البيانات من السيرفر...</p>
          </div>
        )}

        {/* Fetch Error state */}
        {fetchError && !loading && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
            <h3 className="text-sm font-bold text-destructive">فشل تحميل البيانات الأساسية</h3>
            <p className="text-xs text-foreground/60 max-w-md mx-auto">{fetchError}</p>
            <Button onClick={fetchData} size="sm" variant="outline" className="rounded-xl text-xs font-bold border-destructive/40">
              إعادة المحاولة
            </Button>
          </div>
        )}

        {!loading && !fetchError && (
          <div>
            {/* ══ OVERVIEW ══════════════════════ */}
            {activeTab === "overview" && (
              <div className="space-y-6">

                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: Folder, label: "المجلدات", count: folders.length, tab: "management" as Tab, color: "text-primary" },
                    { icon: FolderHeart, label: "الألبومات", count: albums.length, tab: "management" as Tab, color: "text-primary" },
                    { icon: Music, label: "القصائد", count: audios.length, tab: "management" as Tab, color: "text-primary" },
                    { icon: Youtube, label: "المرئيات", count: videos.length, tab: "videos" as Tab, color: "text-red-500" },
                  ].map(({ icon: Icon, label, count, tab, color }) => (
                    <button key={label} onClick={() => setActiveTab(tab)}
                      className="bg-card border border-border rounded-2xl p-4 text-right hover:border-primary/25 hover:shadow-md transition-all group">
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
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <p className="text-foreground/40 font-bold uppercase tracking-wider text-[9px]">المجلدات</p>
                      <div className="flex gap-3">
                        <span className="text-emerald-600 font-semibold">{folders.filter(f => f.is_visible !== false).length} ظاهر</span>
                        <span className="text-foreground/30">{folders.filter(f => f.is_visible === false).length} مخفي</span>
                      </div>
                    </div>
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
                      "يمكنك إضافة نوعين من المجلدات: مجلدات خاصة بالألبومات فقط، ومجلدات خاصة بالقصائد المستقلة فقط.",
                      "أنشئ الألبوم أو المجلد أولاً ثم أضف القصائد إليه بسهولة.",
                      "تظهر المجلدات في الواجهة الرئيسية للموقع كشبكة مستطيلة بلمسات ذهبية أنيقة.",
                      "عند الضغط على المجلد في الموقع يتم فتح محتوياته في نفس الصفحة مع زر تشغيل عشوائي مخصص لمحتويات المجلد.",
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

            {/* ══ MANAGEMENT ════════════════════ */}
            {activeTab === "management" && (
              <div className="space-y-6">

                {/* Sub-Nav Bar & Search & Category Filter */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border rounded-2xl p-2 shadow-sm">
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      onClick={() => setManagementSubTab("folders_albums")}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        managementSubTab === "folders_albums"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground/60 hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <FolderHeart className="w-3.5 h-3.5" />
                      <span>الألبومات والمجلدات ({albums.length + folders.length})</span>
                    </button>

                    <button
                      onClick={() => setManagementSubTab("all_audios")}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        managementSubTab === "all_audios"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground/60 hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Music className="w-3.5 h-3.5" />
                      <span>جميع المقاطع الصوتية ({audios.length})</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {managementSubTab === "all_audios" && (
                      <Select value={trackFilterType} onValueChange={setTrackFilterType}>
                        <SelectTrigger className="h-9 text-xs bg-muted/40 border-border rounded-xl text-right min-w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="all">جميع الفئات</SelectItem>
                          <SelectItem value="supplications">الأدعية والمناجاة</SelectItem>
                          <SelectItem value="albums">مقاطع الألبومات</SelectItem>
                          <SelectItem value="folders">مقاطع المجلدات</SelectItem>
                          <SelectItem value="standalone">مقاطع مستقلة</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                      <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="البحث بالنص أو السنة..."
                        className="pr-9 h-9 text-xs bg-muted/40 border-border rounded-xl text-right"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── SUB-TAB 1: FOLDERS & ALBUMS ── */}
                {managementSubTab === "folders_albums" && (
                  <div className="space-y-6">
                    {/* Folders Section */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold text-foreground">المجلدات المُخصصة</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">{folders.length}</span>
                        </div>
                        <Button
                          onClick={openCreateFolderModal}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[10px] font-bold rounded-lg border-primary/30 text-primary gap-1"
                        >
                          <Plus className="w-3 h-3" /> مجلد جديد
                        </Button>
                      </div>

                      {folders.length === 0 ? (
                        <div className="py-8 text-center text-xs text-foreground/40">
                          لا توجد مجلدات بعد. أنشئ مجلداً لتجميع الألبومات أو القصائد.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/40 p-2 space-y-1.5">
                          {folders.map(folder => {
                            const isVisible = folder.is_visible !== false;
                            const folderAlbums = albums.filter(a => a.folder_id === folder.id);
                            const folderQasaed = audios.filter(a => a.folder_id === folder.id);
                            const isAlbumsOnly = folder.folder_type === "albums_only";
                            const isFolderExpanded = expandedFolders.has(folder.id);

                            return (
                              <div
                                key={folder.id}
                                className={`rounded-xl bg-card border transition-all ${
                                  isVisible ? "border-border/50" : "border-border/30 opacity-65"
                                } ${isFolderExpanded ? "ring-1 ring-primary/15" : ""}`}
                              >
                                <div className="flex items-center justify-between p-3 gap-2">
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleFolderExpand(folder.id)}
                                      className="p-1 rounded-lg shrink-0 text-foreground/35 hover:text-primary hover:bg-primary/10 transition-colors"
                                      title={isFolderExpanded ? "إغلاق محتويات المجلد" : "عرض محتويات المجلد"}
                                    >
                                      {isFolderExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                      {isAlbumsOnly ? <FolderHeart className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-xs text-foreground truncate">{folder.name}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${getCategoryColor(folder.category)}`}>
                                          {getCategoryLabel(folder.category)}
                                        </span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                          isAlbumsOnly ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                        }`}>
                                          {isAlbumsOnly ? "مجلد ألبومات" : "مجلد قصائد"}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-foreground/40 mt-0.5">
                                        {isAlbumsOnly ? `${folderAlbums.length} ألبوم` : `${folderQasaed.length} قصيدة`}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-row items-center justify-center gap-1.5 shrink-0">
                                    {isAlbumsOnly ? (
                                      <button
                                        type="button"
                                        onClick={() => openCreateAlbumModal(folder.id)}
                                        className="w-8 h-8 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/25 text-primary flex items-center justify-center shrink-0 aspect-square shadow-sm transition-all hover:scale-110 cursor-pointer"
                                        title="إضافة ألبوم للمجلد"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => openCreateAudioModal(undefined, folder.id)}
                                        className="w-8 h-8 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/25 text-primary flex items-center justify-center shrink-0 aspect-square shadow-sm transition-all hover:scale-110 cursor-pointer"
                                        title="إضافة مقطع صوتي للمجلد"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => openEditFolderModal(folder)}
                                      className="w-8 h-8 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/25 text-primary flex items-center justify-center shrink-0 aspect-square shadow-sm transition-all hover:scale-110 cursor-pointer"
                                      title="تعديل المجلد"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => requestDelete("folder", folder.id, folder.name)}
                                      className="w-8 h-8 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/25 text-red-500 flex items-center justify-center shrink-0 aspect-square shadow-sm transition-all hover:scale-110 cursor-pointer"
                                      title="حذف المجلد"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <VisibilityToggle
                                      checked={isVisible}
                                      onCheckedChange={() => handleToggleFolderVisibility(folder)}
                                    />
                                  </div>
                                </div>

                                {isFolderExpanded && (
                                  <div className="border-t border-border/40 p-3 bg-muted/20 space-y-2">
                                    {isAlbumsOnly ? (
                                      folderAlbums.length === 0 ? (
                                        <p className="text-[11px] text-foreground/40 text-center py-3">لا توجد ألبومات في هذا المجلد بعد.</p>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {folderAlbums.map(alb => (
                                            <div key={alb.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/40 text-xs">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <FolderHeart className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                                                <span className="font-semibold text-foreground truncate">{safeStr(alb.title)}</span>
                                                {alb.year && <span className="text-[10px] font-mono text-foreground/40">({alb.year})</span>}
                                              </div>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => openEditAlbumModal(alb)}
                                                  className="w-7 h-7 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/25 text-primary flex items-center justify-center"
                                                  title="تعديل الألبوم"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )
                                    ) : (
                                      folderQasaed.length === 0 ? (
                                        <p className="text-[11px] text-foreground/40 text-center py-3">لا توجد قصائد في هذا المجلد بعد.</p>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {folderQasaed.map(poem => {
                                            const poemVisible = poem.is_visible !== false;
                                            return (
                                              <div
                                                key={poem.id}
                                                className={`flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/40 text-xs ${
                                                  poemVisible ? "" : "opacity-50"
                                                }`}
                                              >
                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono text-[10px] text-foreground/30 w-4 text-center shrink-0">
                                                      {poem.order ?? "—"}
                                                    </span>
                                                    <Music className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                                                    <span className="font-medium text-foreground truncate">{safeStr(poem.title)}</span>
                                                    {poem.release_year && (
                                                      <span className="text-[9px] font-mono font-bold bg-primary/15 text-primary px-1.5 py-0.2 rounded-full border border-primary/20">
                                                        سنة {poem.release_year}
                                                      </span>
                                                    )}
                                                    {poem.duration && (
                                                      <span className="text-[10px] font-mono text-foreground/40">({poem.duration})</span>
                                                    )}
                                                  </div>
                                                  {poem.description && (
                                                    <p className="text-[11px] text-foreground/50 line-clamp-1 pr-6">
                                                      {poem.description}
                                                    </p>
                                                  )}
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0 me-1">
                                                  {poem.audio_url && (
                                                    <audio controls preload="none" src={poem.audio_url} className="h-7 w-36 sm:w-48 rounded-lg border border-border/40" />
                                                  )}
                                                  <button
                                                    type="button"
                                                    onClick={() => openEditPoemModal(poem)}
                                                    className="w-7 h-7 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/25 text-primary flex items-center justify-center transition-all hover:scale-110"
                                                    title="تعديل القصيدة والبيانات"
                                                  >
                                                    <Edit2 className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleRemovePoemFromFolder(poem)}
                                                    className="w-7 h-7 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/25 text-amber-500 flex items-center justify-center transition-all hover:scale-110"
                                                    title="إزالة القصيدة من هذا المجلد"
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => requestDelete("audio", poem.id, safeStr(poem.title))}
                                                    className="w-7 h-7 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/25 text-red-500 flex items-center justify-center transition-all hover:scale-110"
                                                    title="حذف القصيدة نهائياً"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                  <VisibilityToggle
                                                    checked={poemVisible}
                                                    onCheckedChange={() => handleToggleVisibility("audios", poem.id, poemVisible)}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Albums List Section */}
                    {filteredAlbums.length === 0 ? (
                      <div className="bg-card border border-border rounded-2xl py-16 text-center space-y-3">
                        <FolderHeart className="w-10 h-10 text-foreground/15 mx-auto" />
                        <p className="text-sm text-foreground/40">
                          {searchQuery ? "لا توجد نتائج مطابقة." : "لا توجد ألبومات. أضف ألبومك الأول!"}
                        </p>
                        {!searchQuery && (
                          <Button onClick={() => openCreateAlbumModal()} size="sm" className="rounded-xl">
                            <Plus className="w-3.5 h-3.5 ml-1.5" /> ألبوم جديد
                          </Button>
                        )}
                      </div>
                    ) : filteredAlbums.map(album => {
                      const albumPoems = getAlbumPoems(album.id);
                      const isExpanded = expandedAlbums.has(album.id);
                      const isVisible = album.is_visible !== false;
                      const parentFolder = folders.find(f => f.id === album.folder_id);

                      return (
                        <div key={album.id}
                          className={`bg-card border rounded-2xl overflow-hidden shadow-sm transition-all ${
                            isVisible ? "border-border" : "border-border/50 opacity-65"
                          } ${isExpanded ? "ring-1 ring-primary/15" : ""}`}
                        >
                          <div className={`flex items-center gap-2 px-4 py-3 ${isExpanded ? "border-b border-border bg-muted/20" : ""}`}>
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
                                  {parentFolder && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                                      <Folder className="w-2.5 h-2.5" />
                                      {parentFolder.name}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-foreground/35 mt-0.5 flex items-center gap-2">
                                  <span>{albumPoems.length} قصيدة</span>
                                  {!isVisible && <span className="text-foreground/25">· مخفي</span>}
                                </p>
                              </div>
                            </button>

                            <div className="flex flex-row items-center justify-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openCreateAudioModal(album.id)}
                                className="w-8 h-8 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/25 text-primary flex items-center justify-center shrink-0 aspect-square shadow-sm transition-all hover:scale-110 cursor-pointer"
                                title="إضافة مقطع صوتي للألبوم"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditAlbumModal(album)}
                                className="w-8 h-8 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/25 text-primary flex items-center justify-center shrink-0 aspect-square shadow-sm transition-all hover:scale-110 cursor-pointer"
                                title="تعديل الألبوم"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDelete("album", album.id, safeStr(album.title))}
                                className="w-8 h-8 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/25 text-red-500 flex items-center justify-center shrink-0 aspect-square shadow-sm transition-all hover:scale-110 cursor-pointer"
                                title="حذف الألبوم"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <VisibilityToggle
                                checked={isVisible}
                                onCheckedChange={() => handleToggleVisibility("albums", album.id, isVisible)}
                              />
                            </div>
                          </div>

                          {isExpanded && (
                            <div>
                              {albumPoems.length === 0 ? (
                                <div className="py-8 text-center space-y-2">
                                  <p className="text-xs text-foreground/40">لا توجد قصائد في هذا الألبوم بعد.</p>
                                  <Button
                                    size="sm" variant="outline"
                                    onClick={() => openCreateAudioModal(album.id)}
                                    className="h-7 text-[11px] rounded-lg border-primary/25 text-primary"
                                  >
                                    <Plus className="w-3 h-3 ml-1" /> إضافة مقطع صوتي
                                  </Button>
                                </div>
                              ) : (
                                <div className="divide-y divide-border/40 p-2 space-y-1.5">
                                  {albumPoems.map(poem => {
                                    const poemVisible = poem.is_visible !== false;
                                    return (
                                      <div
                                        key={poem.id}
                                        className={`flex items-center justify-between p-2.5 rounded-xl bg-card/60 border border-border/40 text-xs transition-opacity ${
                                          poemVisible ? "" : "opacity-50"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="font-mono text-[10px] text-foreground/30 w-5 text-center shrink-0">
                                            {poem.order ?? "—"}
                                          </span>
                                          <Music className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                                          <span className="font-medium text-foreground truncate">{safeStr(poem.title)}</span>
                                          {poem.duration && (
                                            <span className="text-[10px] font-mono text-foreground/40">({poem.duration})</span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          {poem.audio_url && (
                                            <audio controls preload="none" src={poem.audio_url} className="h-7 w-36 sm:w-48 rounded-lg border border-border/40" />
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => openEditPoemModal(poem)}
                                            className="w-7 h-7 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/25 text-primary flex items-center justify-center shrink-0 aspect-square shadow-sm transition-all hover:scale-110 cursor-pointer"
                                            title="تعديل القصيدة"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => requestDelete("audio", poem.id, safeStr(poem.title))}
                                            className="w-7 h-7 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/25 text-red-500 flex items-center justify-center shrink-0 aspect-square shadow-sm transition-all hover:scale-110 cursor-pointer"
                                            title="حذف القصيدة"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                          <VisibilityToggle
                                            checked={poemVisible}
                                            onCheckedChange={() => handleToggleVisibility("audios", poem.id, poemVisible)}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── SUB-TAB 2: ALL AUDIO TRACKS ── */}
                {managementSubTab === "all_audios" && (
                  <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">قائمة المقاطع الصوتية</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {audios.filter(t => filterAudioTrack(t, trackFilterType, searchQuery)).length} مقطع
                        </span>
                      </div>

                      <Button
                        onClick={() => openCreateAudioModal()}
                        size="sm"
                        className="h-8 px-3 text-xs font-bold rounded-xl gap-1.5 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> إضافة مقطع جديد
                      </Button>
                    </div>

                    {audios.filter(t => filterAudioTrack(t, trackFilterType, searchQuery)).length === 0 ? (
                      <div className="py-12 text-center text-xs text-foreground/40 space-y-2">
                        <Music className="w-8 h-8 mx-auto text-foreground/20" />
                        <p>لا توجد مقاطع صوتية مطابقة للتصفية.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/40 space-y-2">
                        {audios.filter(t => filterAudioTrack(t, trackFilterType, searchQuery)).map(track => {
                          const isVisible = track.is_visible !== false;
                          const parentAlbum = albums.find(a => a.id === track.album_id);
                          const parentFolder = folders.find(f => f.id === track.folder_id);

                          return (
                            <div key={track.id} className={`pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${!isVisible ? "opacity-55" : ""}`}>
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                  <Music className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-xs text-foreground truncate">{safeStr(track.title)}</span>

                                    {isSupplicationCategory(track.category) ? (
                                      <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                                        الأدعية والمناجاة
                                      </span>
                                    ) : parentAlbum ? (
                                      <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1">
                                        <FolderHeart className="w-2.5 h-2.5" />
                                        ألبوم: {parentAlbum.title}
                                      </span>
                                    ) : parentFolder ? (
                                      <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                                        <Folder className="w-2.5 h-2.5" />
                                        مجلد: {parentFolder.name}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-muted text-foreground/60 border border-border">
                                        مطع مستقل
                                      </span>
                                    )}

                                    {track.duration && (
                                      <span className="text-[10px] font-mono text-foreground/40">({track.duration})</span>
                                    )}
                                    {track.release_year && (
                                      <span className="text-[9px] font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.2 rounded-full">
                                        سنة {track.release_year}
                                      </span>
                                    )}
                                  </div>

                                  {track.audio_url && (
                                    <div className="flex items-center gap-1 text-[10px] font-mono text-foreground/40 truncate" style={{ direction: "ltr" }}>
                                      <Link2 className="w-3 h-3 text-primary shrink-0" />
                                      <span className="truncate max-w-sm">{track.audio_url}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                                {track.audio_url && (
                                  <audio
                                    controls
                                    preload="none"
                                    src={track.audio_url}
                                    className="h-8 max-w-[210px] rounded-lg border border-border bg-card shadow-sm"
                                  />
                                )}

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditPoemModal(track)}
                                    className="w-8 h-8 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/25 text-primary flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                                    title="تعديل المقطع الصوتي والبيانات"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => requestDelete("audio", track.id, safeStr(track.title))}
                                    className="w-8 h-8 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/25 text-red-500 flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                                    title="حذف المقطع الصوتي"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <VisibilityToggle
                                    checked={isVisible}
                                    onCheckedChange={() => handleToggleVisibility("audios", track.id, isVisible)}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══ SITE UPDATES TAB ══════════════ */}
            {activeTab === "updates" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground">التحديثات المعلنة في أعلى الموقع</h2>
                </div>

                <div className="divide-y divide-border border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
                  {siteUpdates.map(up => {
                    const isVisible = up.is_visible !== false;
                    return (
                      <div key={up.id} className={`p-4 flex items-center justify-between gap-4 ${!isVisible ? "opacity-50" : ""}`}>
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground leading-relaxed">{up.content}</p>
                          {up.link && (
                            <p className="text-[10px] font-mono text-primary flex items-center gap-1">
                              <Link2 className="w-3 h-3" /> {up.link}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <VisibilityToggle
                            checked={isVisible}
                            onCheckedChange={() => handleToggleUpdateVisibility(up)}
                          />
                          <button
                            onClick={() => openEditUpdateModal(up)}
                            className="p-1.5 rounded-lg text-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => requestDelete("update", up.id, up.content)}
                            className="p-1.5 rounded-lg text-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ VIDEOS TAB ════════════════════ */}
            {activeTab === "videos" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-foreground/40 bg-card border border-border rounded-2xl">
                      لا توجد مقاطع فيديو مضافة بعد.
                    </div>
                  ) : videos.map(vid => {
                    const vidId = extractYouTubeId(vid.youtube_url ?? "");
                    return (
                      <div key={vid.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                        <div>
                          {vidId ? (
                            <div className="relative aspect-video bg-black">
                              <img
                                src={`https://img.youtube.com/vi/${vidId}/mqdefault.jpg`}
                                alt={safeStr(vid.title)}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="aspect-video bg-muted flex items-center justify-center text-foreground/40 text-xs">
                              بدون معاينة
                            </div>
                          )}
                          <div className="p-4 space-y-2">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                              {getVideoCategoryLabel(vid.category)}
                            </span>
                            <h3 className="text-xs font-bold text-foreground leading-snug">{safeStr(vid.title)}</h3>
                            {vid.description && <p className="text-[11px] text-foreground/50 line-clamp-2">{vid.description}</p>}
                          </div>
                        </div>
                        <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-muted/20">
                          <button
                            onClick={() => openEditVideoModal(vid)}
                            className="p-1.5 rounded-lg text-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => requestDelete("video", vid.id, safeStr(vid.title))}
                            className="p-1.5 rounded-lg text-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ MESSAGES TAB ══════════════════ */}
            {activeTab === "messages" && (
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="py-16 text-center text-foreground/40 bg-card border border-border rounded-2xl">
                    لا توجد رسائل واردة بعد.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        onClick={() => { setSelectedMessage(msg); setMessageModalOpen(true); }}
                        className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{safeStr(msg.name)}</span>
                            <span className="text-[10px] text-foreground/40">({safeDate(msg.created_at)})</span>
                          </div>
                          <p className="text-xs font-semibold text-primary truncate">{safeStr(msg.subject)}</p>
                          <p className="text-[11px] text-foreground/50 truncate max-w-lg">{safeStr(msg.message)}</p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); requestDelete("message", msg.id, safeStr(msg.subject)); }}
                          className="p-2 rounded-xl text-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════
          MODALS
      ══════════════════════════════════════ */}

      {/* Folder Modal */}
      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent className="bg-background border-border text-right max-w-md rounded-[1.5rem] shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingFolder ? "تعديل المجلد" : "إنشاء مجلد جديد"}
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/40">
              المجلدات تُنظّم المكتبة الصوتية إلى مجلدات للألبومات أو مجلدات للقصائد.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveFolder} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">اسم المجلد *</label>
              <Input
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                disabled={actionLoading}
                placeholder="مثال: إصدارات محرم الحرام"
                className="h-11 text-sm text-right bg-muted/30 border-border rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">الفئة *</label>
                <Select value={folderCategory} onValueChange={setFolderCategory} disabled={actionLoading}>
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
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">نوع المجلد *</label>
                <Select value={folderType} onValueChange={(val: any) => setFolderType(val)} disabled={actionLoading}>
                  <SelectTrigger className="h-11 text-sm bg-muted/30 border-border rounded-xl text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="albums_only">مجلد ألبومات فقط</SelectItem>
                    <SelectItem value="qasaed_only">مجلد قصائد فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">ترتيب العرض</label>
              <Input
                type="number" min="0"
                value={folderOrder}
                onChange={e => setFolderOrder(e.target.value)}
                disabled={actionLoading}
                className="h-11 text-sm text-center font-mono bg-muted/30 border-border rounded-xl"
                style={{ direction: "ltr" }}
              />
            </div>
            <DialogFooter className="flex gap-2 pt-1">
              <Button type="submit" disabled={actionLoading} className="h-10 px-6 text-xs font-bold rounded-xl">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ المجلد"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFolderModalOpen(false)}
                disabled={actionLoading} className="h-10 px-4 text-xs rounded-xl border-border">
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">المجلد المستهدف (اختياري - مجلدات الألبومات فقط)</label>
              <Select value={albumFolderIdField} onValueChange={setAlbumFolderIdField} disabled={actionLoading}>
                <SelectTrigger className="h-11 text-sm bg-muted/30 border-border rounded-xl text-right">
                  <SelectValue placeholder="بدون مجلد (مستقل)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مجلد (مستقل)</SelectItem>
                  {folders
                    .filter(f => f.folder_type === "albums_only" && f.category === albumCategory)
                    .map(f => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
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

      {/* Add poems modal */}
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
              {poemModalAlbum && <span> للألبوم "{poemModalAlbum.title}"</span>}
              {poemModalFolder && <span> للمجلد "{poemModalFolder.name}"</span>}
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

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_4.5rem_4rem] gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-foreground/35 uppercase tracking-wider">العنوان *</label>
                      <Input
                        value={entry.title}
                        onChange={e => updatePoemEntry(idx, "title", e.target.value)}
                        disabled={actionLoading}
                        placeholder="عنوان القصيدة"
                        className="h-9 text-xs text-right bg-background border-border rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-foreground/35 uppercase tracking-wider">رابط الصوت *</label>
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
                      <label className="text-[9px] font-bold text-foreground/35 uppercase tracking-wider">المدة</label>
                      <Input
                        value={entry.duration}
                        onChange={e => updatePoemEntry(idx, "duration", e.target.value)}
                        disabled={actionLoading}
                        placeholder="05:30"
                        className="h-9 text-xs text-center font-mono bg-background border-border rounded-xl"
                        style={{ direction: "ltr" }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-foreground/35 uppercase tracking-wider">الترتيب</label>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-foreground/35 uppercase tracking-wider">سنة الإصدار (اختياري)</label>
                      <Input
                        type="number"
                        placeholder="2026"
                        value={entry.release_year}
                        onChange={e => updatePoemEntry(idx, "release_year", e.target.value)}
                        disabled={actionLoading}
                        className="h-9 text-xs text-right font-mono bg-background border-border rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-foreground/35 uppercase tracking-wider">الوصف (اختياري)</label>
                      <Input
                        placeholder="وصف مختصر للقصيدة..."
                        value={entry.description}
                        onChange={e => updatePoemEntry(idx, "description", e.target.value)}
                        disabled={actionLoading}
                        className="h-9 text-xs text-right bg-background border-border rounded-xl"
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

      {/* Add / Edit Audio Track Modal */}
      <Dialog open={audioModalOpen} onOpenChange={setAudioModalOpen}>
        <DialogContent className="bg-background border-border text-right max-w-lg rounded-[1.5rem] shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Music className="w-4 h-4 text-primary" />
              {editingAudio ? "تعديل المقطع الصوتي" : "إضافة مقطع صوتي جديد"}
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/40">
              يرجى إدخال رابط صوتي مباشر (مثل MP3) وتحديد قسم الإسناد وعنوان المقطع.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAudioTrack} className="space-y-4 mt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">عنوان المقطع / القصيدة *</label>
              <Input
                value={audioTrackTitle}
                onChange={e => setAudioTrackTitle(e.target.value)}
                disabled={actionLoading}
                placeholder="مثال: دعاء التوسل / قصيدة الجراح"
                className="h-11 text-sm text-right bg-muted/30 border-border rounded-xl"
                required
              />
            </div>

            {/* Audio URL Input & Live Player Preview */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">رابط الصوت المباشر (Direct Audio Link / URL) *</label>
              <Input
                type="url"
                value={audioTrackUrl}
                onChange={e => setAudioTrackUrl(e.target.value)}
                disabled={actionLoading}
                placeholder="https://example.com/audio/track.mp3"
                className="h-11 text-xs text-left font-mono bg-muted/30 border-border rounded-xl"
                style={{ direction: "ltr" }}
                required
              />
              <p className="text-[10px] text-foreground/40">
                أدخل رابط صوتي مباشر بصيغة MP3, WAV, M4A أو البث الصوتي.
              </p>

              {/* Embedded Player Preview */}
              {audioTrackUrl.trim() && (
                <div className="mt-2 p-3 bg-muted/30 border border-primary/20 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-primary text-[10px] font-bold">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>معاينة الصوت المباشر:</span>
                  </div>
                  <audio
                    controls
                    preload="metadata"
                    src={audioTrackUrl.trim()}
                    className="w-full h-9 rounded-lg shadow-sm"
                  />
                </div>
              )}
            </div>

            {/* Category / Section Assignment Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">قسم الإسناد / الفئة (Category / Section) *</label>
              <Select value={audioAssignmentType} onValueChange={(val: any) => setAudioAssignmentType(val)} disabled={actionLoading}>
                <SelectTrigger className="h-11 text-sm bg-muted/30 border-border rounded-xl text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="supplications">الأدعية والمناجاة (Supplications)</SelectItem>
                  <SelectItem value="album">إسناد إلى ألبوم (Album)</SelectItem>
                  <SelectItem value="folder">إسناد إلى مجلد قصائد (Folder)</SelectItem>
                  <SelectItem value="standalone">مطع صوتي مستقل (Standalone)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Dropdown for Album */}
            {audioAssignmentType === "album" && (
              <div className="space-y-1.5 bg-primary/5 p-3 rounded-xl border border-primary/20">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">اختر الألبوم المستهدف *</label>
                <Select value={audioTargetAlbumId} onValueChange={setAudioTargetAlbumId} disabled={actionLoading}>
                  <SelectTrigger className="h-11 text-sm bg-background border-border rounded-xl text-right">
                    <SelectValue placeholder="اختر ألبوماً..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="none">اختر ألبوماً...</SelectItem>
                    {albums.map(alb => (
                      <SelectItem key={alb.id} value={String(alb.id)}>
                        {safeStr(alb.title)} {alb.year ? `(${alb.year})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Conditional Dropdown for Folder */}
            {audioAssignmentType === "folder" && (
              <div className="space-y-1.5 bg-primary/5 p-3 rounded-xl border border-primary/20">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">اختر المجلد المستهدف *</label>
                <Select value={audioTargetFolderId} onValueChange={setAudioTargetFolderId} disabled={actionLoading}>
                  <SelectTrigger className="h-11 text-sm bg-background border-border rounded-xl text-right">
                    <SelectValue placeholder="اختر مجلداً..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="none">اختر مجلداً...</SelectItem>
                    {folders
                      .filter(f => f.folder_type === "qasaed_only")
                      .map(f => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {safeStr(f.name)} ({getCategoryLabel(f.category)})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Conditional Category Selector for Standalone */}
            {audioAssignmentType === "standalone" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">نوع الفئة</label>
                <Select value={audioCategory} onValueChange={setAudioCategory} disabled={actionLoading}>
                  <SelectTrigger className="h-11 text-sm bg-muted/30 border-border rounded-xl text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="sorrow">الأحزان (عزاء)</SelectItem>
                    <SelectItem value="joy">الأفراح والمواليد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Grid for duration, order, year */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">المدة (مم:ثث)</label>
                <Input
                  value={audioDuration}
                  onChange={e => setAudioDuration(e.target.value)}
                  disabled={actionLoading}
                  placeholder="05:30"
                  className="h-10 text-xs text-center font-mono bg-muted/30 border-border rounded-xl"
                  style={{ direction: "ltr" }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">الترتيب</label>
                <Input
                  type="number" min="1"
                  value={audioOrder}
                  onChange={e => setAudioOrder(e.target.value)}
                  disabled={actionLoading}
                  className="h-10 text-xs text-center font-mono bg-muted/30 border-border rounded-xl"
                  style={{ direction: "ltr" }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">سنة الإصدار</label>
                <Input
                  type="number"
                  value={audioReleaseYear}
                  onChange={e => setAudioReleaseYear(e.target.value)}
                  disabled={actionLoading}
                  placeholder="2026"
                  className="h-10 text-xs text-center font-mono bg-muted/30 border-border rounded-xl"
                  style={{ direction: "ltr" }}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">وصف المقطع (اختياري)</label>
              <Textarea
                value={audioDescription}
                onChange={e => setAudioDescription(e.target.value)}
                disabled={actionLoading}
                placeholder="وصف مختصر أو تفاصيل إضافية..."
                className="text-xs text-right bg-muted/30 border-border rounded-xl min-h-[60px] resize-none"
              />
            </div>

            <DialogFooter className="flex gap-2 pt-2 border-t border-border">
              <Button type="submit" disabled={actionLoading} className="h-10 px-6 text-xs font-bold rounded-xl shadow-sm">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : editingAudio ? "حفظ التعديلات" : "حفظ المقطع الصوتي"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAudioModalOpen(false)} disabled={actionLoading} className="h-10 px-4 text-xs rounded-xl border-border">
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

      {/* Site Update Modal */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent className="bg-background border-border text-right max-w-md rounded-[1.5rem] shadow-2xl" dir="rtl">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-bold text-foreground">
              {editingUpdate ? "تعديل التحديث" : "إضافة تحديث جديد"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveUpdate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">نص التحديث *</label>
              <Textarea
                value={updateContentText}
                onChange={e => setUpdateContentText(e.target.value)}
                disabled={actionLoading}
                placeholder="مثال: تم إضافة ألبوم جديد: يا جرح علي (٢٠٢٤)..."
                className="text-xs bg-muted/30 border-border rounded-xl min-h-[90px] text-right"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">رابط الانتقال (اختياري)</label>
              <Input
                value={updateLinkUrl}
                onChange={e => setUpdateLinkUrl(e.target.value)}
                disabled={actionLoading}
                placeholder="مثال: #audio أو https://example.com"
                className="h-10 text-xs bg-muted/30 border-border rounded-xl text-left font-mono"
                style={{ direction: "ltr" }}
              />
            </div>
            <DialogFooter className="flex gap-2 pt-2 border-t border-border">
              <Button type="submit" disabled={actionLoading} className="h-10 px-6 text-xs font-bold rounded-xl shadow-sm">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : editingUpdate ? "حفظ التغييرات" : "إضافة التحديث"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setUpdateModalOpen(false)} disabled={actionLoading} className="h-10 px-4 text-xs rounded-xl border-border">
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
