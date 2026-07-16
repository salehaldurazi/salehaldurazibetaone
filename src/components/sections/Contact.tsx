
"use client";

import React, { useState } from "react";
import { FadeInSection } from "../FadeInSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase-js";
import { toast } from "@/hooks/use-toast";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  Instagram,
  Youtube,
  MessageCircle,
  Mail,
  Send,
  Loader2
} from "lucide-react";

const socialLinks = [
  { icon: Instagram, href: "https://instagram.com/aldurazi_production" },
  { icon: Youtube, href: "https://www.youtube.com/@salehaldurazi" },
  { icon: MessageCircle, href: "https://wa.me/973XXXXXXXXX" }, // رابط الواتساب برقمك
];

const stats = [
  { label: "إجمالي الزوار", value: "0" },
  { label: "إجمالي التحميلات", value: "0" },
  { label: "إجمالي الاستماع", value: "0" },
  { label: "إجمالي المشاركة", value: "0" },
];

export function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast({
        title: "تنبيه",
        description: "يرجى ملء كافة الحقول لإرسال الرسالة.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("messages").insert([
        {
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        },
      ]);

      if (error) throw error;

      toast({
        title: "تم إرسال الرسالة بنجاح",
        description: "شكراً لتواصلك. تم تسجيل رسالتك وسنقوم بمراجعتها قريباً.",
      });

      // Clear the form fields
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      console.error("Contact submit error:", err);
      toast({
        title: "فشل إرسال الرسالة",
        description: err.message || "حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-12 md:py-24 scroll-mt-nav relative overflow-hidden bg-background">
      {/* Background Decorative Element */}
      <div className="absolute bottom-0 left-0 w-full h-[400px] bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />

      <div className="container max-w-6xl px-6 mx-auto relative z-10">

        {/* Content Container - Expanded unified width for all boxes */}
        <div className="flex flex-col gap-8 items-center max-w-4xl mx-auto">

          <FadeInSection className="space-y-8 w-full">
            <div className="space-y-3 text-center mb-4">
              <h2 className="text-4xl md:text-5xl font-light text-primary">مركز التواصل</h2>
              <p className="text-primary uppercase text-xs">للاستفسارات والطلبات الرسمية</p>
            </div>

            {/* Main Info Box - Increased Padding */}
            <div className="w-full bg-card/20 backdrop-blur-2xl border border-primary/10 p-8 md:p-12 rounded-[2.5rem] shadow-xl space-y-8 text-center hover:border-primary/20 transition-all duration-500">
              <p className="text-xs md:text-sm text-foreground/60 leading-relaxed font-light max-w-2xl mx-auto">
                سواء كانت لديك استفسارات حول القصائد، أو طلبات لإقامة الفعاليات، أو رغبت فقط في إرسال دعواتكم، فنحن نرحب برسالتكم.
              </p>

              <div className="flex flex-col items-center gap-3">
                <a href="mailto:info@salehaldirazi.com" className="flex flex-col items-center gap-3 text-primary hover:text-primary/80 transition-all group/mail">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover/mail:bg-primary group-hover/mail:text-primary-foreground transition-all shadow-lg">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-xs md:text-sm tracking-wider font-bold">info@salehaldirazi.com</span>
                </a>
              </div>
            </div>

            {/* Social Media Box - Increased Padding */}
            <div className="w-full bg-card/10 backdrop-blur-xl border border-white/5 p-6 md:p-8 rounded-[2.5rem] text-center space-y-4 hover:border-primary/10 transition-all duration-500">
              <span className="text-xs md:text-sm text-foreground/60 leading-relaxed font-light max-w-2xl mx-auto">تواصل عبر الشبكات الاجتماعية</span>
              <div className="flex items-center justify-center space-x-4 space-x-reverse">
                {socialLinks.map((item, i) => (
                  <a
                    key={i}
                    href={item.href} // الآن سيتعرف على الرابط الموجود في الكائن
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-lg"
                  >
                    <item.icon className="w-4 h-4" /> {/* استدعاء الأيقونة من الكائن */}
                  </a>
                ))}
              </div>
            </div>
          </FadeInSection>

          {/* Contact Form - Increased Padding and Spacing */}
          <FadeInSection delay={200} className="w-full">
            <form onSubmit={handleSubmit} className="w-full space-y-5 bg-card/80 dark:bg-card/30 backdrop-blur-3xl p-8 md:p-12 rounded-[3rem] border border-border dark:border-primary/10 shadow-[0_30px_80px_rgba(0,0,0,0.08)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.5)] text-right relative overflow-hidden group">
              <div className="absolute -top-10 -left-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/20 transition-all duration-700" />

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="md:text-xs uppercase text-foreground/40 mr-1">الاسم</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="bg-card/80 dark:bg-background/40 border-border dark:border-primary/5 focus:border-primary/40 rounded-xl h-12 text-xs md:text-sm text-right transition-all text-foreground"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="md:text-xs uppercase text-foreground/40 mr-1">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="bg-card/80 dark:bg-background/40 border-border dark:border-primary/5 focus:border-primary/40 rounded-xl h-12 text-xs md:text-sm text-right transition-all text-foreground"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="md:text-xs uppercase text-foreground/40 mr-1">الموضوع</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                  className="bg-card/80 dark:bg-background/40 border-border dark:border-primary/5 focus:border-primary/40 rounded-xl h-12 text-xs md:text-sm text-right transition-all text-foreground"
                  dir="rtl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="md:text-xs uppercase text-foreground/40 mr-1">الرسالة</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                  className="bg-card/80 dark:bg-background/40 border-border dark:border-primary/5 focus:border-primary/40 rounded-xl min-h-[120px] text-xs md:text-sm text-right transition-all resize-none text-foreground"
                  dir="rtl"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl font-bold shadow-xl shadow-primary/10 transition-all uppercase text-[10px] md:text-xs mt-2 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-3 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 ml-3" />
                    إرسال الرسالة
                  </>
                )}
              </Button>
            </form>
          </FadeInSection>

          {/* Separator before Statistics */}
          <div className="w-full pt-10 border-t border-primary/5" />

          {/* Statistics Section - Proportional scaling with boxes */}
          <FadeInSection delay={300} className="w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="bg-card/20 backdrop-blur-3xl border border-primary/10 hover:border-primary/40 rounded-[2rem] p-6 md:p-8 text-center transition-all duration-500 hover:-translate-y-1 shadow-lg">
                  <h3 className="text-xl md:text-2xl font-bold text-primary mb-1">{stat.value}</h3>
                  <p className="text-xs md:text-sm text-foreground/60 leading-relaxed font-light max-w-2xl mx-auto">{stat.label}</p>
                </div>
              ))}
            </div>
          </FadeInSection>
        </div>

        <footer className="mt-16 pt-10 border-t border-primary/5 px-6">
          <div className="flex items-center justify-center gap-3 py-6">
            <p className="text-foreground/30 text-xs tracking-widest font-light">
              جميع الحقوق محفوظة © {new Date().getFullYear()} | صالح الدرازي
            </p>
            <ThemeSwitcher />
          </div>
        </footer>
      </div>
    </section>
  );
}
