"use client";

export default function TrackingError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl px-4 py-12"><section className="surface-card p-6">
    <h1 className="page-title">Não foi possível carregar o acompanhamento</h1>
    <p role="alert" className="mt-3 text-sm leading-6 muted-text">Tente novamente em instantes. Se você acabou de decidir sobre o orçamento, confira o status antes de repetir a ação.</p>
    <button type="button" onClick={reset} className="button-primary mt-5">Tentar novamente</button>
  </section></main>;
}
