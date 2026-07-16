
"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Home, User, Music, Video, MessageSquare } from "lucide-react";

const navItems = [
  { label: "الرئيسية", href: "#home", icon: Home },
  { label: "السيرة", href: "#biography", icon: User },
  { label: "المكتبة", href: "#audio", icon: Music },
  { label: "المرئيات", href: "#videos", icon: Video },
  { label: "تواصل", href: "#contact", icon: MessageSquare },
];

export function Navigation() {
  const [activeTab, setActiveTab] = useState("#home");

  useEffect(() => {
    const handleScroll = () => {
      const sections = navItems.map((item) => document.querySelector(item.href));
      const scrollPosition = window.scrollY + 100;

      sections.forEach((section) => {
        if (section) {
          const top = (section as HTMLElement).offsetTop;
          const height = (section as HTMLElement).offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveTab(`#${section.id}`);
          }
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      // استخدام scrollIntoView لضمان الوصول لبداية العنصر تماماً
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    setActiveTab(href);
  };

  return (
    <nav 
      className={cn(
        "fixed bottom-6 left-0 right-0 z-[110] flex items-center justify-center px-4",
        "animate-in slide-in-from-bottom-10 duration-700"
      )}
    >
      <div 
        className={cn(
          "w-full max-w-md flex items-center justify-between p-1 rounded-[2rem]",
          "bg-white/90 dark:bg-black/80 backdrop-blur-3xl border border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
          "hover:border-primary/40 transition-all duration-500"
        )}
      >
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => handleNavClick(item.href)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl transition-all duration-500 relative group min-w-0",
              activeTab === item.href 
                ? "text-primary scale-105" 
                : "text-foreground/50 dark:text-foreground/40 hover:text-foreground scale-95"
            )}
          >
            <item.icon className={cn(
              "w-4 h-4 md:w-5 md:h-5 transition-all duration-500",
              activeTab === item.href ? "text-primary drop-shadow-[0_0_10px_rgba(197,160,89,0.4)]" : "opacity-60"
            )} />
            <span className={cn(
              "text-[9px] md:text-[10px] font-bold transition-all duration-500 whitespace-nowrap uppercase tracking-tight",
              activeTab === item.href ? "opacity-100" : "opacity-40"
            )}>
              {item.label}
            </span>
            
            {activeTab === item.href && (
              <div className="absolute inset-x-1 inset-y-1 bg-primary/10 rounded-xl -z-10 animate-in fade-in zoom-in duration-500" />
            )}
            
            <div className={cn(
              "absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full transition-all duration-500",
              activeTab === item.href ? "opacity-100 translate-y-0 shadow-[0_0_8px_#c5a059]" : "opacity-0 -translate-y-2"
            )} />
          </button>
        ))}
      </div>
    </nav>
  );
}
