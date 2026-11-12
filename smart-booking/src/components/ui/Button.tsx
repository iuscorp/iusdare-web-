import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "gold" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-navy-deep text-white hover:bg-navy disabled:bg-navy-deep/40 shadow-[0_6px_16px_-8px_rgba(16,36,56,.6)]",
  gold: "bg-guinda text-white hover:bg-[#7A1D18] disabled:bg-guinda/40 shadow-[0_6px_16px_-8px_rgba(98,20,16,.7)]",
  outline: "bg-white border border-navy-deep/15 text-navy-deep hover:border-navy-deep hover:bg-navy-50 disabled:opacity-50",
  ghost: "text-navy-deep hover:bg-navy-50 disabled:opacity-50",
  danger: "bg-guinda text-white hover:bg-guinda/90 disabled:opacity-50",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-full",
  md: "h-11 px-5 text-[15px] rounded-xl",
  lg: "h-[52px] px-7 text-[16px] rounded-2xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-sans font-semibold tracking-[-0.01em] transition-[transform,background-color,box-shadow,color] duration-200 ease-ios active:scale-[.97] disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
