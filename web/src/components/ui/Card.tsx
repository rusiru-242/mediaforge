import * as React from "react";
import { cn } from "@/utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hover?: boolean;
}

export function Card({ className, glass = false, hover = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200",
        glass
          ? "bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20 dark:border-slate-800/80 shadow-xl"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm",
        hover && "hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
