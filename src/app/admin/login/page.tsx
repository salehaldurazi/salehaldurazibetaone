"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-js";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Mail, Loader2, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "تنبيه",
        description: "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.session) {
        // Set cookie so Next.js Middleware can authorize access on server side
        const maxAge = 60 * 60 * 24 * 7; // 7 days
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;

        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "ja3fer.far7an@gmail.com";

        if (data.user?.email === adminEmail) {
          toast({
            title: "تم تسجيل الدخول بنجاح",
            description: "جاري الانتقال إلى لوحة التحكم...",
          });

          setTimeout(() => {
            router.push("/admin");
            router.refresh();
          }, 1200);
        } else {
          // Logged in user is not the authorized admin email. Log out and clear cookie.
          await supabase.auth.signOut();
          document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
          toast({
            title: "دخول غير مصرح",
            description: "هذا الحساب لا يملك صلاحيات إدارة لوحة التحكم.",
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      console.error("Login error details:", err);
      toast({
        title: "خطأ في تسجيل الدخول",
        description: err.message || "الرجاء التحقق من البيانات المدخلة والمحاولة مجدداً.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0e0c] flex items-center justify-center p-6 relative overflow-hidden font-light" dir="rtl">
      {/* Background Decorative Gradient */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Logo / Title Area */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light text-primary tracking-wide">صالح الدرازي</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-foreground/40 font-bold">بوابة إدارة المحتوى الرسمي</p>
        </div>

        <Card className="bg-card/20 backdrop-blur-2xl border-primary/10 rounded-[2rem] shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden">
          <CardHeader className="pt-8 pb-4 text-center">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
              <KeyRound className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl font-medium text-primary">تسجيل الدخول للمسؤول</CardTitle>
            <CardDescription className="text-foreground/50 text-xs">يرجى تسجيل الدخول للوصول إلى لوحة التحكم</CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email field */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-foreground/40 mr-1 font-bold">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="bg-background/40 border-primary/10 focus:border-primary/40 rounded-xl h-12 pl-4 pr-11 text-xs md:text-sm text-left transition-all"
                    style={{ direction: 'ltr' }}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-foreground/40 mr-1 font-bold">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="bg-background/40 border-primary/10 focus:border-primary/40 rounded-xl h-12 pl-4 pr-11 text-xs md:text-sm text-left transition-all"
                    style={{ direction: 'ltr' }}
                  />
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl tracking-[0.2em] font-bold shadow-xl shadow-primary/10 transition-all uppercase text-xs mt-6 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  "دخول"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center">
          <a
            href="/"
            className="text-[11px] text-foreground/40 hover:text-primary transition-all font-medium tracking-wide"
          >
            ← العودة للموقع الرئيسي
          </a>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
