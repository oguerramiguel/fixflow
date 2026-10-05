"use client";

import Link from "next/link";

export default function AppError({ reset }: { reset: () => void }) {
  return <section className="surface-card max-w-xl p-6">
    <h1 className="page-title">Não foi possível carregar esta página</h1>
    <p role="alert" className="mt-3 muted-text">Tente novamente. Se você acabou de salvar algo, confira o registro antes de repetir a ação.</p>
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={reset} className="button-primary">Tentar novamente</button><Link href="/app" className="button-secondary">Ir para Dashboard</Link></div>
  </section>;
}
