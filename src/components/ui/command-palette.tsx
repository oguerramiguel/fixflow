"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { normalizeSearchQuery, quickCommands, searchKindLabels, type SearchResult } from "@/lib/global-search";

type SearchState = { query: string; results: SearchResult[]; error?: string; expired?: boolean };

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SearchState>({ query: "", results: [] });
  const list = useRef<HTMLDivElement>(null);
  const normalized = normalizeSearchQuery(query);
  const searching = normalized.length >= 2;
  const pending = searching && state.query !== normalized;
  const results = state.query === normalized ? state.results : [];
  const commands = quickCommands.filter((item) => item.label.toLocaleLowerCase("pt-BR").includes(normalized.toLocaleLowerCase("pt-BR")));
  const entries = [...commands.map((item) => ({ ...item, description: "Atalho", kind: "command" as const })), ...results];
  const selectedIndex = Math.min(active, Math.max(entries.length - 1, 0));

  useEffect(() => {
    if (!searching) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(normalized)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) {
          if (!controller.signal.aborted) setState({ query: normalized, results: [], error: response.status === 401 ? "Sua sessão expirou. Entre novamente." : "Não foi possível buscar. Tente novamente.", expired: response.status === 401 });
          return;
        }
        const data: { results: SearchResult[] } = await response.json();
        if (!controller.signal.aborted) setState({ query: normalized, results: data.results });
      } catch {
        if (!controller.signal.aborted) setState({ query: normalized, results: [], error: "Não foi possível buscar. Verifique sua conexão e tente novamente." });
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [normalized, searching, attempt]);

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, results.length]);

  function navigate(href: string) { onClose(); router.push(href); }

  return (
    <Modal label="Busca global e comandos" onClose={onClose}>
      <div className="flex items-center gap-3 border-b p-4">
        <SearchIcon className="size-5 shrink-0 muted-text" />
        <div className="min-w-0 flex-1">
          <label htmlFor="global-search" className="sr-only">Buscar clientes, equipamentos, ordens ou comandos</label>
          <input id="global-search" role="combobox" aria-expanded="true" aria-controls="command-results" aria-autocomplete="list"
            aria-activedescendant={entries.length ? `command-${selectedIndex}` : undefined} aria-describedby="command-help"
            autoComplete="off" maxLength={100} placeholder="Buscar ou ir para…" value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setActive(entries.length ? (selectedIndex + (event.key === "ArrowDown" ? 1 : -1) + entries.length) % entries.length : 0);
              } else if (event.key === "Enter" && entries[selectedIndex]) { event.preventDefault(); navigate(entries[selectedIndex].href); }
            }} className="min-h-11 w-full bg-transparent text-base outline-none" />
        </div>
        <button type="button" className="icon-button" aria-label="Fechar busca" onClick={onClose}><CloseIcon className="size-5" /></button>
      </div>
      <p id="command-help" className="px-4 py-3 text-xs muted-text">Busque por nome, marca e modelo ou código da OS. Use pelo menos 2 caracteres.</p>
      <div className="min-h-0 overflow-y-auto px-2 pb-2" ref={list}>
        <div id="command-results" role="listbox" aria-label="Resultados e atalhos" aria-busy={pending}>
          {entries.map((item, index) => <div key={`${item.kind}-${item.href}`} id={`command-${index}`} role="option" aria-selected={index === selectedIndex}
            onMouseMove={() => setActive(index)} onClick={() => navigate(item.href)}
            className={`cursor-pointer rounded-xl px-3 py-3 ${index === selectedIndex ? "bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-100" : "hover:bg-[var(--color-surface-muted)]"}`}>
            <div className="flex items-start justify-between gap-3"><span className="min-w-0 break-words text-sm font-semibold">{item.label}</span><span className="shrink-0 text-xs muted-text">{item.kind === "command" ? "Atalho" : searchKindLabels[item.kind]}</span></div>
            {item.kind !== "command" ? <p className="mt-1 break-words text-xs muted-text">{item.description}</p> : null}
          </div>)}
        </div>
        <div role="status" aria-live="polite" className="px-3 py-2 text-sm muted-text">
          {pending ? "Buscando na sua organização…" : state.query === normalized && state.error ? state.error : searching ? `${results.length} resultado(s). Até 5 por categoria.` : "Atalhos para as ações do dia a dia."}
        </div>
        {!pending && searching && !results.length && !state.error ? <p className="px-3 pb-3 text-sm muted-text">Nenhum registro encontrado. Confira o nome, a série ou o código e tente novamente.</p> : null}
        {state.query === normalized && state.error ? <button type="button" className="button-secondary m-3" onClick={() => {
          if (state.expired) navigate("/login");
          else { setState({ query: "", results: [] }); setAttempt((value) => value + 1); }
        }}>{state.expired ? "Entrar novamente" : "Tentar novamente"}</button> : null}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-3 text-xs muted-text"><span>↑ ↓ Navegar</span><span>Enter Abrir</span><span>Esc Fechar</span></div>
    </Modal>
  );
}
