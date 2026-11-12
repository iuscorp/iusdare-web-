import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border border-transparent bg-navy-50 px-4 py-2.5 text-[16px] text-navy-deep placeholder:text-navy-deep/40 transition-all duration-200 ease-ios focus:border-navy-deep/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-navy-deep/10 aria-[invalid=true]:border-guinda aria-[invalid=true]:ring-guinda/30";

export function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-navy-deep">
        {label}
        {required && <span className="ml-0.5 text-guinda" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-navy-deep/60">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-guinda" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(control, "h-12", className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...p },
  ref,
) {
  return <textarea ref={ref} className={cn(control, "min-h-[120px] resize-y leading-relaxed", className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...p }, ref) {
  return <select ref={ref} className={cn(control, "h-12 pr-8", className)} {...p} />;
});
