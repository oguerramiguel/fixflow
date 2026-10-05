"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/components/ui/utils";

export function SubmitButton({ label, pendingLabel = "Salvando…", variant = "primary", className, disabled = false }: {
  label: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const styles = { primary: "button-primary", secondary: "button-secondary", danger: "button-danger", ghost: "button-ghost" };
  return <button type="submit" disabled={pending || disabled} aria-busy={pending} className={cn(styles[variant], className)}>{pending ? pendingLabel : label}</button>;
}
