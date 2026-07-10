import Link from "next/link";

export default async function AppPage() {
  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Operacao</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Cadastre clientes, acompanhe seus equipamentos e mantenha os dados
            separados por organizacao.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/app/customers"
          className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          <span className="text-lg font-semibold text-slate-950">
            Clientes
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-600">
            Listagem, busca, cadastro, detalhes e edicao.
          </span>
        </Link>

        <Link
          href="/app/equipment"
          className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          <span className="text-lg font-semibold text-slate-950">
            Equipamentos
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-600">
            Controle de equipamentos vinculados aos clientes.
          </span>
        </Link>
      </div>
    </section>
  );
}
