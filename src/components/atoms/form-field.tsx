import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FieldProps { label: string; name: string; error?: string; hint?: string; }
export function FormField({ label, name, error, hint, className, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const description = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return <div className={cn("space-y-2", className)}><label htmlFor={name} className="text-sm font-semibold text-stone-700">{label}</label><input id={name} name={name} aria-invalid={Boolean(error)} aria-describedby={description} className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" {...props}/>{error ? <p id={`${name}-error`} className="text-sm text-red-700">{error}</p> : hint ? <p id={`${name}-hint`} className="text-xs text-stone-500">{hint}</p> : null}</div>;
}

export function SelectField({ label, name, error, children, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return <div className="space-y-2"><label htmlFor={name} className="text-sm font-semibold text-stone-700">{label}</label><select id={name} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" {...props}>{children}</select>{error && <p id={`${name}-error`} className="text-sm text-red-700">{error}</p>}</div>;
}
