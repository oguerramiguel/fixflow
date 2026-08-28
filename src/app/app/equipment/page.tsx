import Link from "next/link";
import { DomainError } from "@/domain/errors/domain-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import { formatDate, formatEquipmentType } from "@/app/app/format";
import { buildListHref, readPageSearchParam, readSearchParams, readStringSearchParam, type PageSearchParams } from "@/app/app/list-links";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/primitives";
import { listEquipmentForOrganization } from "@/server/services/equipment-service";

type EquipmentPageProps = { searchParams?: PageSearchParams };

export default async function EquipmentPage({ searchParams }: EquipmentPageProps) {
  const context = await requireAuthenticatedContextOrRedirect();
  const resolvedSearchParams = await readSearchParams(searchParams);
  const query = readStringSearchParam(resolvedSearchParams, "query");
  const page = readPageSearchParam(resolvedSearchParams);
  const { result, error } = await listEquipmentForOrganization(context, { page, query })
    .then((equipmentResult) => ({ result: equipmentResult, error: undefined }))
    .catch((caughtError: unknown) => {
      if (caughtError instanceof DomainError) {
        return { result: { items: [], totalCount: 0, currentPage: 1, totalPages: 0, query }, error: caughtError.message };
      }
      throw caughtError;
    });

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Inventário" title="Equipamentos" description={`${result.totalCount} equipamento${result.totalCount === 1 ? "" : "s"} encontrado${result.totalCount === 1 ? "" : "s"}.`} actions={<Link href="/app/equipment/new" className="button-primary"><PlusIcon className="size-4" /> Novo equipamento</Link>} />

      <form action="/app/equipment" className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1"><label htmlFor="equipment-query" className="form-label">Buscar equipamentos</label><div className="relative"><SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 muted-text" /><input id="equipment-query" name="query" type="search" maxLength={100} defaultValue={result.query ?? query ?? ""} placeholder="Marca, modelo, série ou cliente" className="form-input pl-10" /></div></div>
        <div className="flex gap-2"><button type="submit" className="button-secondary flex-1 sm:flex-none">Buscar</button>{result.query ? <Link href="/app/equipment" className="button-ghost flex-1 sm:flex-none">Limpar</Link> : null}</div>
      </form>

      {error ? <p role="alert" className="alert-error">{error}</p> : null}

      <section className="data-table-wrap" aria-label="Lista de equipamentos">
        {result.items.length > 0 ? <>
          <div className="hidden overflow-x-auto md:block"><table className="data-table"><thead><tr><th>Equipamento</th><th>Categoria</th><th>Cliente</th><th>Número de série</th><th className="text-right">Ações</th></tr></thead><tbody>{result.items.map((equipment) => <tr key={equipment.id}><td><Link href={`/app/equipment/${equipment.id}`} className="text-link text-slate-950 dark:text-slate-100">{equipment.brand} {equipment.model}</Link></td><td>{formatEquipmentType(equipment.type)}</td><td><Link href={`/app/customers/${equipment.customer.id}`} className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200">{equipment.customer.name}</Link><span className="mt-1 block text-xs muted-text">Cadastrado em {formatDate(equipment.createdAt)}</span></td><td>{equipment.serialNumber ?? "Não informado"}</td><td className="text-right"><Link href={`/app/equipment/${equipment.id}/edit`} className="text-link">Editar</Link></td></tr>)}</tbody></table></div>
          <div className="divide-y md:hidden">{result.items.map((equipment) => <article key={equipment.id} className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={`/app/equipment/${equipment.id}`} className="text-link block truncate text-base">{equipment.brand} {equipment.model}</Link><p className="mt-1 text-sm muted-text">{formatEquipmentType(equipment.type)} · {equipment.serialNumber ?? "Sem número de série"}</p></div><Link href={`/app/equipment/${equipment.id}/edit`} className="button-ghost min-h-10 px-3">Editar</Link></div><Link href={`/app/customers/${equipment.customer.id}`} className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">{equipment.customer.name}</Link></article>)}</div>
        </> : <EmptyState title="Nenhum equipamento encontrado" description={result.query ? "Revise os termos da busca e tente novamente." : "Cadastre um equipamento vinculado a um cliente para abrir atendimentos."} action={!result.query ? <Link href="/app/equipment/new" className="button-primary">Novo equipamento</Link> : undefined} />}
      </section>

      <Pagination><p className="text-sm muted-text">Página {result.currentPage}{result.totalPages > 0 ? ` de ${result.totalPages}` : ""}</p><div className="flex gap-2">{result.currentPage > 1 ? <Link href={buildListHref("/app/equipment", { page: result.currentPage - 1, query: result.query })} className="button-secondary">Anterior</Link> : <span className="button-secondary cursor-not-allowed opacity-45">Anterior</span>}{result.totalPages > result.currentPage ? <Link href={buildListHref("/app/equipment", { page: result.currentPage + 1, query: result.query })} className="button-secondary">Próxima</Link> : <span className="button-secondary cursor-not-allowed opacity-45">Próxima</span>}</div></Pagination>
    </div>
  );
}
