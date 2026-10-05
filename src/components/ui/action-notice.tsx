"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { getActionNotice } from "@/lib/action-notices";
import { CloseIcon } from "@/components/ui/icons";

export function dismissActionNotice() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("notice")) return;
  url.searchParams.delete("notice");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function ActionNotice() {
  const params = useSearchParams();
  const message = getActionNotice(params.get("notice"));
  useEffect(() => {
    // A previous success must not compete with feedback for a new submission.
    document.addEventListener("submit", dismissActionNotice, true);
    return () => document.removeEventListener("submit", dismissActionNotice, true);
  }, []);
  if (!message) return null;
  return <div className="action-notice alert-success flex items-start gap-3 shadow-lift">
    <p role="status" aria-live="polite" className="min-w-0 flex-1 py-2">{message}</p>
    <button type="button" className="icon-button" aria-label="Fechar mensagem de sucesso" onClick={dismissActionNotice}><CloseIcon className="size-4" /></button>
  </div>;
}
