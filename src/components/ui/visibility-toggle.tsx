"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VisibilityToggleProps {
  /** Controlled checked state (true = Visible, false = Hidden) */
  checked?: boolean;
  /** Callback fired when the visibility changes */
  onCheckedChange?: (checked: boolean) => void;
  /** Additional styling classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

const VisibilityToggle = React.forwardRef<HTMLDivElement, VisibilityToggleProps>(
  ({ className, size = "sm", checked = true, onCheckedChange, ...props }, ref) => {
    const isSm = size === "sm";

    const handleToggle = (targetState: boolean) => {
      if (checked !== targetState) {
        onCheckedChange?.(targetState);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center bg-zinc-100/80 dark:bg-zinc-800/40 p-0.5 border border-zinc-200/50 dark:border-zinc-700/30",
          isSm ? "rounded-md gap-0.5" : "rounded-lg gap-1",
          className
        )}
        {...props}
      >
        {/* Visible Button */}
        <button
          type="button"
          onClick={() => handleToggle(true)}
          className={cn(
            "inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none",
            isSm
              ? "text-[10px] px-2 py-0.5 gap-1 rounded-[4px]"
              : "text-xs px-3 py-1.5 gap-1.5 rounded-md",
            checked
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-sm font-semibold dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
              : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 border border-transparent"
          )}
        >
          <Eye className={cn(isSm ? "w-3 h-3" : "w-3.5 h-3.5")} />
          <span>ظاهر</span>
        </button>

        {/* Hidden Button */}
        <button
          type="button"
          onClick={() => handleToggle(false)}
          className={cn(
            "inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none",
            isSm
              ? "text-[10px] px-2 py-0.5 gap-1 rounded-[4px]"
              : "text-xs px-3 py-1.5 gap-1.5 rounded-md",
            !checked
              ? "bg-red-50 text-red-600 border border-red-200/60 shadow-sm font-semibold dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
              : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 border border-transparent"
          )}
        >
          <EyeOff className={cn(isSm ? "w-3 h-3" : "w-3.5 h-3.5")} />
          <span>مخفي</span>
        </button>
      </div>
    );
  }
);

VisibilityToggle.displayName = "VisibilityToggle";

export { VisibilityToggle };
