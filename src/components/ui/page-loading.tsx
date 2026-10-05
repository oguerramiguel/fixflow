export function PageLoading({ label = "Carregando atendimento", dashboard = false }: { label?: string; dashboard?: boolean }) {
  return <div role="status" aria-busy="true" className="page-stack">
    <p className="text-sm muted-text">{label}…</p>
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="h-8 w-2/3 max-w-sm rounded-lg bg-[var(--color-border)]" />
      {dashboard ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="surface-card h-32" />)}</div> : null}
      <div className="surface-card space-y-5 p-6">{[0, 1, 2].map((item) => <div key={item} className="h-12 rounded-lg bg-[var(--color-surface-muted)]" />)}</div>
    </div>
  </div>;
}
