import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/app/actions";
import { requireCurrentUserOrRedirect } from "@/app/app/auth";
import { appConfig } from "@/lib/app";

export default async function ProtectedAppLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const currentUser = await requireCurrentUserOrRedirect();

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto w-full max-w-6xl">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                {appConfig.name}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                Ola, {currentUser.name}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {currentUser.organization.name} - {currentUser.role}
              </p>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
              >
                Sair
              </button>
            </form>
          </div>

          <nav
            aria-label="Navegacao principal"
            className="mt-6 flex flex-wrap gap-2"
          >
            <Link
              href="/app"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              Inicio
            </Link>
            <Link
              href="/app/customers"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              Clientes
            </Link>
            <Link
              href="/app/equipment"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              Equipamentos
            </Link>
            <Link
              href="/app/service-orders"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              Ordens de servico
            </Link>
          </nav>
        </header>

        <div className="py-8">{children}</div>
      </section>
    </main>
  );
}
