"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — render nothing on the server
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder with same dimensions to prevent layout shift
    return (
      <div className="w-9 h-9 rounded-full" aria-hidden="true" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      className={cn(
        "relative inline-flex items-center justify-center",
        "w-9 h-9 rounded-full",
        "border transition-all duration-300 ease-in-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "group overflow-hidden",
        isDark
          ? "border-primary/30 bg-primary/10 hover:bg-primary/20 hover:border-primary/50 shadow-[0_0_12px_rgba(197,160,89,0.15)] hover:shadow-[0_0_20px_rgba(197,160,89,0.3)]"
          : "border-amber-300/60 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 shadow-[0_2px_8px_rgba(180,120,0,0.12)] hover:shadow-[0_4px_16px_rgba(180,120,0,0.2)]"
      )}
    >
      {/* Animated Sun icon */}
      <Sun
        className={cn(
          "absolute w-4 h-4 transition-all duration-500",
          isDark
            ? "opacity-0 rotate-90 scale-50 text-primary"
            : "opacity-100 rotate-0 scale-100 text-amber-600"
        )}
      />

      {/* Animated Moon icon */}
      <Moon
        className={cn(
          "absolute w-4 h-4 transition-all duration-500",
          isDark
            ? "opacity-100 rotate-0 scale-100 text-primary"
            : "opacity-0 -rotate-90 scale-50 text-primary"
        )}
      />
    </button>
  );
}
