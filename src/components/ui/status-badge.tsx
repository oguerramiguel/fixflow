import type { QuoteStatus } from "@/domain/entities/quote";
import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import { cn } from "@/components/ui/utils";

type SemanticTone = "info" | "warning" | "success" | "danger" | "neutral" | "accent";

const toneClasses: Record<SemanticTone, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300",
  danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-300",
  neutral: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  accent: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/35 dark:text-violet-300"
};

const serviceOrderTone: Record<ServiceOrderStatus, SemanticTone> = {
  RECEIVED: "neutral",
  IN_DIAGNOSIS: "info",
  WAITING_FOR_APPROVAL: "warning",
  APPROVED: "accent",
  IN_REPAIR: "info",
  FINAL_TESTING: "accent",
  READY_FOR_PICKUP: "warning",
  COMPLETED: "success",
  CANCELLED: "danger"
};

const quoteTone: Record<QuoteStatus, SemanticTone> = {
  DRAFT: "neutral",
  SENT: "warning",
  APPROVED: "success",
  REJECTED: "danger"
};

export function StatusBadge({ label, tone, className }: { label: string; tone: SemanticTone; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", toneClasses[tone], className)}>{label}</span>;
}

export function ServiceOrderStatusBadge({ status, label }: { status: ServiceOrderStatus; label: string }) {
  return <StatusBadge label={label} tone={serviceOrderTone[status]} />;
}

export function QuoteStatusBadge({ status, label }: { status: QuoteStatus; label: string }) {
  return <StatusBadge label={label} tone={quoteTone[status]} />;
}
