import Link from "next/link";
import { DomainError } from "@/domain/errors/domain-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import { formatDate } from "@/app/app/format";
import { buildListHref, readPageSearchParam, readSearchParams, readStringSearchParam, type PageSearchParams } from "@/app/app/list-links";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/primitives";
import { listCustomersForOrganization } from "@/server/services/customer-service";

type CustomersPageProps = { searchParams?: PageSearchParams };

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const context = await requireAuthenticatedContextOrRedirect();
  const resolvedSearchParams = await readSearchParams(searchParams);
  const query = readStringSearchParam(resolvedSearchParams, "query");
  const page = readPageSearchParam(resolvedSearchParams);
  const { result, error } = await listCustomersForOrganization(context, { page, query })
    .then((customersResult) => ({ result: customersResult, error: undefined }))
    .catch((caughtError: unknown) => {
      if (caughtError instanceof DomainError) {
        return { result: { items: [], totalCount: 0, currentPage: 1, totalPages: 0, query }, error: caughtError.message };
      }
      throw caughtError;
    });

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Relacionamento"
        title="Clientes"
        description={`${result.totalCount} cliente${result.totalCount === 1 ? "" : "s"} encontrado${result.totalCount === 1 ? "" : "s"}.`}
        actions={<Link href="/app/customers/new" className="button-primary"><PlusIcon className="size-4" /> Novo cliente</Link>}
      />

      <form action="/app/customers" className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="customer-query" className="form-label">Buscar clientes</label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 muted-text" />
            <input id="customer-query" name="query" type="search" maxLength={100} defaultValue={result.query ?? query ?? ""} placeholder="Nome, email ou telefone" className="form-input pl-10" />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="button-secondary flex-1 sm:flex-none">Buscar</button>
          {result.query ? <Link href="/app/customers" className="button-ghost flex-1 sm:flex-none">Limpar</Link> : null}
        </div>
      </form>

      {error ? <p role="alert" className="alert-error">{error}</p> : null}

      <section className="data-table-wrap" aria-label="Lista de clientes">
        {result.items.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="data-table">
                <thead><tr><th>Cliente</th><th>Contato</th><th>Cadastro</th><th className="text-right">Ações</th></tr></thead>
                <tbody>{result.items.map((customer) => (
                  <tr key={customer.id}>
                    <td><Link href={`/app/customers/${customer.id}`} className="text-link text-slate-950 dark:text-slate-100">{customer.name}</Link></td>
                    <td><span className="block font-medium text-slate-700 dark:text-slate-200">{customer.phone}</span>{customer.email ? <span className="mt-1 block text-xs muted-text">{customer.email}</span> : null}</td>
                    <td>{formatDate(customer.createdAt)}</td>
                    <td className="text-right"><Link href={`/app/customers/${customer.id}/edit`} className="text-link">Editar</Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="divide-y md:hidden">{result.items.map((customer) => (
              <article key={customer.id} className="p-5">
                <div className="flex items-start justify-between gap-4"><div className="min-w-0"><Link href={`/app/customers/${customer.id}`} className="text-link block truncate text-base">{customer.name}</Link><p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{customer.phone}</p>{customer.email ? <p className="mt-1 truncate text-sm muted-text">{customer.email}</p> : null}</div><Link href={`/app/customers/${customer.id}/edit`} className="button-ghost min-h-10 px-3">Editar</Link></div>
                <p className="mt-4 text-xs muted-text">Cliente desde {formatDate(customer.createdAt)}</p>
              </article>
            ))}</div>
          </>
        ) : <EmptyState title="Nenhum cliente encontrado" description={result.query ? "Tente buscar por outro nome, email ou telefone." : "Cadastre o primeiro cliente para começar a organizar os atendimentos."} action={!result.query ? <Link href="/app/customers/new" className="button-primary">Novo cliente</Link> : undefined} />}
      </section>

      <Pagination>
        <p className="text-sm muted-text">Página {result.currentPage}{result.totalPages > 0 ? ` de ${result.totalPages}` : ""}</p>
        <div className="flex gap-2">
          {result.currentPage > 1 ? <Link href={buildListHref("/app/customers", { page: result.currentPage - 1, query: result.query })} className="button-secondary">Anterior</Link> : <span className="button-secondary cursor-not-allowed opacity-45">Anterior</span>}
          {result.totalPages > result.currentPage ? <Link href={buildListHref("/app/customers", { page: result.currentPage + 1, query: result.query })} className="button-secondary">Próxima</Link> : <span className="button-secondary cursor-not-allowed opacity-45">Próxima</span>}
        </div>
      </Pagination>
    </div>
  );
}
