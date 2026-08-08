"use client";

import React from "react";
import { LucideIcon, FolderX } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface EmptyStateProps {
  /** Lucide React icon to display in the empty state card */
  icon?: LucideIcon;
  /** Primary title text */
  title?: string;
  /** Secondary description text */
  description?: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Callback function triggered when action button is clicked */
  onAction?: () => void;
  /** Additional container classes */
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderX,
  title = "لا توجد عناصر متوفرة",
  description = "لم نتمكن من العثور على أي عناصر في هذا القسم حالياً.",
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -10 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "text-center py-14 px-6 rounded-[2.5rem] bg-card/40 border border-primary/15 backdrop-blur-2xl max-w-md mx-auto my-8 space-y-4 shadow-xl shadow-primary/5 text-foreground relative overflow-hidden",
        className
      )}
      dir="rtl"
    >
      {/* Ambient background glow matching dark gold aesthetic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Stylish, modern empty-state icon container */}
      <div className="relative inline-flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 flex items-center justify-center text-primary shadow-inner">
          <Icon className="w-8 h-8 opacity-90 stroke-[1.5]" />
        </div>
        {/* Subtle decorative ring dot */}
        <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping opacity-75" />
        </div>
      </div>

      <div className="space-y-1.5 relative z-10">
        <h4 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        )}
      </div>

      {actionLabel && onAction && (
        <div className="pt-2 relative z-10">
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-bold transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95"
          >
            <span>{actionLabel}</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
