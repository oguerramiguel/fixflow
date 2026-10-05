"use client";

import { useState } from "react";
import { CloseIcon } from "@/components/ui/icons";
import { dismissActionNotice } from "@/components/ui/action-notice";

export function PublicLinkPanel({ publicUrl }: { publicUrl: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "error">("idle");

  async function copyLink() {
    setCopyState("copying");
    try {
      await navigator.clipboard.writeText(publicUrl);
      dismissActionNotice();
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section className="surface-card p-5 sm:p-6" aria-labelledby="public-link-title">
      <h2 id="public-link-title" className="section-title">Link público</h2>
      <p id="public-link-hint" className="mt-1 text-sm muted-text">
        Compartilhe com o cliente para acompanhar o atendimento e consultar o orçamento. O envio é manual.
      </p>
      <label htmlFor="public-order-link" className="sr-only">Link público da ordem de serviço</label>
      <input
        id="public-order-link"
        type="text"
        readOnly
        value={publicUrl}
        aria-describedby="public-link-hint"
        onFocus={(event) => event.currentTarget.select()}
        className="form-input mt-4"
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="button-primary" disabled={copyState === "copying"} aria-busy={copyState === "copying"} onClick={copyLink}>
          {copyState === "copying" ? "Copiando…" : "Copiar link"}
        </button>
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="button-secondary">Abrir portal <span className="sr-only">em nova aba</span></a>
      </div>
      {copyState === "error" ? <p role="alert" className="alert-error mt-3">Não foi possível copiar automaticamente. Selecione o link acima e copie manualmente.</p> : null}
      {copyState === "copied" ? (
        <div className="action-notice alert-success flex items-start gap-3 shadow-lift">
          <p role="status" aria-live="polite" className="min-w-0 flex-1 py-2">Link copiado</p>
          <button type="button" className="icon-button" aria-label="Fechar mensagem de link copiado" onClick={() => setCopyState("idle")}><CloseIcon className="size-4" /></button>
        </div>
      ) : null}
    </section>
  );
}
