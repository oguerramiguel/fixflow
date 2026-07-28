"use client";

import { useEffect, useRef, useState } from "react";

export function PasswordResetLinkPanel({
  resetPath,
  expiresAt
}: {
  resetPath: string;
  expiresAt?: string;
}) {
  const [copyMessage, setCopyMessage] = useState<string>();
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (linkInputRef.current) {
      linkInputRef.current.value = new URL(
        resetPath,
        window.location.origin
      ).toString();
    }
  }, [resetPath]);

  async function copyLink(): Promise<void> {
    try {
      const absoluteUrl = new URL(resetPath, window.location.origin).toString();

      await navigator.clipboard.writeText(absoluteUrl);
      setCopyMessage("Link copiado.");
    } catch {
      setCopyMessage("Nao foi possivel copiar automaticamente. Selecione o link.");
    }
  }

  return (
    <div className="mt-3 max-w-xl rounded-md border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-950">
        Copie o link de redefinicao agora
      </p>
      <p className="mt-1 text-sm leading-6 text-amber-900">
        O token bruto desaparecera ao recarregar a pagina. Entregue o link
        manualmente ao usuario.
      </p>
      <label
        htmlFor={`password-reset-link-${resetPath.slice(-8)}`}
        className="sr-only"
      >
        Link de redefinicao de senha
      </label>
      <input
        id={`password-reset-link-${resetPath.slice(-8)}`}
        ref={linkInputRef}
        readOnly
        defaultValue={resetPath}
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
