import { createClient } from "@supabase/supabase-js";

// تعديل النقطة إلى عملية استدعاء صحيحة
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// تهيئة وتصدير عميل السوبابيز لاستخدامه في المشروع
export const supabase = createClient(supabaseUrl, supabaseAnonKey);