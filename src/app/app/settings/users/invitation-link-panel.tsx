"use client";

import { useState } from "react";

type InvitationLinkPanelProps = {
  setupPath: string;
  expiresAt?: string;
};

export function InvitationLinkPanel({
  setupPath,
  expiresAt
}: InvitationLinkPanelProps) {
  const [copyMessage, setCopyMessage] = useState<string>();

  async function copyLink(): Promise<void> {
    try {
      const absoluteUrl = new URL(setupPath, window.location.origin).toString();

      await navigator.clipboard.writeText(absoluteUrl);
      setCopyMessage("Link copiado.");
    } catch {
      setCopyMessage("Nao foi possivel copiar automaticamente. Selecione o link.");
    }
  }

  return (
    <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-950">
        Copie este link agora
      </p>
      <p className="mt-1 text-sm leading-6 text-amber-900">
        Por seguranca, o token bruto nao sera exibido novamente depois que esta
        tela for recarregada.
      </p>
      <label
        htmlFor={`invitation-link-${setupPath.slice(-8)}`}
        className="sr-only"
      >
        Link de configuracao da conta
      </label>
      <input
        id={`invitation-link-${setupPath.slice(-8)}`}
        readOnly
        value={setupPath}
        onFocus={(event) => event.currentTarget.select()}
        className="mt-3 block h-11 w-full rounded-md border border-amber-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          Copiar link
        </button>
        {expiresAt ? (
          <span className="text-sm text-amber-900">
            Expira em {new Date(expiresAt).toLocaleString("pt-BR")}.
          </span>
        ) : null}
      </div>
      {copyMessage ? (
        <p role="status" className="mt-2 text-sm text-amber-900">
          {copyMessage}
        </p>
      ) : null}
    </div>
  );
}
