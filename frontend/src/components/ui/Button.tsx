import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ className, icon, children, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "border-cyan/50 bg-cyan/15 text-cyan shadow-glow hover:bg-cyan/20",
        variant === "secondary" &&
          "border-white/10 bg-white/[0.06] text-slate-100 hover:border-cyan/35 hover:bg-cyan/10",
        variant === "ghost" &&
          "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

