"use client";

import { AlertCircle, CheckCircle, Info, AlertTriangle } from "@/components/icons";
import { cn } from "@/lib/utils";

export type SystemAlertTone = "success" | "error" | "info" | "warning";

const toneStyle: Record<SystemAlertTone, { bg: string; text: string; border: string; icon: typeof AlertCircle }> = {
  success: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", icon: CheckCircle },
  error: { bg: "bg-red-50", text: "text-red-800", border: "border-red-200", icon: AlertCircle },
  info: { bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200", icon: Info },
  warning: { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200", icon: AlertTriangle },
};

type ActionState = "success" | "error";

type SystemAlertProps = {
  tone?: SystemAlertTone | ActionState | "idle";
  children: string | React.ReactNode;
  className?: string;
};

export function SystemAlert({ tone = "info", children, className }: SystemAlertProps) {
  const level: SystemAlertTone = tone === "success" ? "success" : tone === "error" ? "error" : tone === "idle" ? "info" : tone;
  const styles = toneStyle[level];
  const Icon = styles.icon;

  return (
    <div
      role={level === "error" ? "alert" : "status"}
      aria-live={level === "error" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-2 rounded-xl border p-3 text-sm",
        styles.bg,
        styles.border,
        styles.text,
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
