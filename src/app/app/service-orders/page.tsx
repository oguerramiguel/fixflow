import Link from "next/link";
import { DomainError } from "@/domain/errors/domain-error";
import { serviceOrderStatuses } from "@/domain/entities/service-order";
import { getServiceOrderStatusLabel } from "@/domain/services/service-order-status-labels";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import { formatDate, formatEquipmentType, formatServiceOrderStatus } from "@/app/app/format";
import { buildListHref, readPageSearchParam, readSearchParams, readStringSearchParam, type PageSearchParams } from "@/app/app/list-links";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/primitives";
import { ServiceOrderStatusBadge } from "@/components/ui/status-badge";
import { listServiceOrdersForOrganization } from "@/server/services/service-order-service";

type ServiceOrdersPageProps = { searchParams?: PageSearchParams };

function summarizeReportedIssue(reportedIssue: string): string {
  return reportedIssue.length <= 120 ? reportedIssue : `${reportedIssue.slice(0, 117)}...`;
}

export default async function ServiceOrdersPage({ searchParams }: ServiceOrdersPageProps) {
  const context = await requireAuthenticatedContextOrRedirect();
  const resolvedSearchParams = await readSearchParams(searchParams);
  const query = readStringSearchParam(resolvedSearchParams, "query");
  const status = readStringSearchParam(resolvedSearchParams, "status");
  const page = readPageSearchParam(resolvedSearchParams);
  const hasFilters = Boolean(query?.trim() || status?.trim());
  const { result, error } = await listServiceOrdersForOrganization(context, { page, query, status })
    .then((serviceOrdersResult) => ({ result: serviceOrdersResult, error: undefined }))
    .catch((caughtError: unknown) => {
      if (caughtError instanceof DomainError) {
        return { result: { items: [], totalCount: 0, currentPage: 1, totalPages: 0, query, status: undefined }, error: caughtError.message };
      }
      throw caughtError;
    });

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Atendimentos" title="Ordens de serviço" description={`${result.totalCount} ordem${result.totalCount === 1 ? "" : "s"} encontrada${result.totalCount === 1 ? "" : "s"}.`} actions={<Link href="/app/equipment" className="button-primary"><PlusIcon className="size-4" /> Nova ordem</Link>} />

      <form action="/app/service-orders" className="surface-card grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-end">
        <div className="min-w-0"><label htmlFor="service-order-query" className="form-label">Buscar ordens</label><div className="relative"><SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 muted-text" /><input id="service-order-query" name="query" type="search" maxLength={100} defaultValue={result.query ?? query ?? ""} placeholder="Código, cliente, equipamento ou série" className="form-input pl-10" /></div></div>
        <div><label htmlFor="service-order-status" className="form-label">Status</label><select id="service-order-status" name="status" defaultValue={result.status ?? status ?? ""} className="form-input"><option value="">Todos os status</option>{serviceOrderStatuses.map((option) => <option key={option} value={option}>{getServiceOrderStatusLabel(option)}</option>)}</select></div>
        <div className="flex gap-2"><button type="submit" className="button-secondary flex-1 lg:flex-none">Filtrar</button>{result.query || result.status || status ? <Link href="/app/service-orders" className="button-ghost flex-1 lg:flex-none">Limpar</Link> : null}</div>
      </form>

      {error ? <p role="alert" className="alert-error">{error}</p> : null}

      <section className="data-table-wrap" aria-label="Lista de ordens de serviço">
        {result.items.length > 0 ? <>
          <div className="hidden overflow-x-auto lg:block"><table className="data-table min-w-[900px]"><thead><tr><th>Ordem</th><th>Cliente</th><th>Equipamento</th><th>Status</th><th>Abertura</th></tr></thead><tbody>{result.items.map((serviceOrder) => <tr key={serviceOrder.id}><td><Link href={`/app/service-orders/${serviceOrder.id}`} className="text-link">{serviceOrder.publicCode}</Link><span className="mt-1 block max-w-xs text-xs leading-5 muted-text">{summarizeReportedIssue(serviceOrder.reportedIssue)}</span></td><td><Link href={`/app/customers/${serviceOrder.customer.id}`} className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200">{serviceOrder.customer.name}</Link></td><td><Link href={`/app/equipment/${serviceOrder.equipment.id}`} className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200">{serviceOrder.equipment.brand} {serviceOrder.equipment.model}</Link><span className="mt-1 block text-xs muted-text">{formatEquipmentType(serviceOrder.equipment.type)}{serviceOrder.equipment.serialNumber ? ` · ${serviceOrder.equipment.serialNumber}` : ""}</span></td><td><ServiceOrderStatusBadge status={serviceOrder.status} label={formatServiceOrderStatus(serviceOrder.status)} /></td><td>{formatDate(serviceOrder.createdAt)}</td></tr>)}</tbody></table></div>
          <div className="divide-y lg:hidden">{result.items.map((serviceOrder) => <article key={serviceOrder.id} className="p-5"><div className="flex items-start justify-between gap-4"><div><Link href={`/app/service-orders/${serviceOrder.id}`} className="text-link text-base">{serviceOrder.publicCode}</Link><p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">{serviceOrder.customer.name}</p></div><ServiceOrderStatusBadge status={serviceOrder.status} label={formatServiceOrderStatus(serviceOrder.status)} /></div><p className="mt-4 text-sm text-slate-700 dark:text-slate-200">{serviceOrder.equipment.brand} {serviceOrder.equipment.model}</p><p className="mt-2 line-clamp-2 text-sm leading-6 muted-text">{serviceOrder.reportedIssue}</p><p className="mt-3 text-xs muted-text">Aberta em {formatDate(serviceOrder.createdAt)}</p></article>)}</div>
        </> : <EmptyState title={hasFilters ? "Nenhuma ordem corresponde aos filtros" : "Nenhuma ordem cadastrada"} description={hasFilters ? "Ajuste a busca ou remova algum filtro." : "Escolha um equipamento para abrir a primeira ordem de serviço."} action={!hasFilters ? <Link href="/app/equipment" className="button-primary">Escolher equipamento</Link> : undefined} />}
      </section>

      <Pagination><p className="text-sm muted-text">Página {result.currentPage}{result.totalPages > 0 ? ` de ${result.totalPages}` : ""}</p><div className="flex gap-2">{result.currentPage > 1 ? <Link href={buildListHref("/app/service-orders", { page: result.currentPage - 1, query: result.query, status: result.status })} className="button-secondary">Anterior</Link> : <span className="button-secondary cursor-not-allowed opacity-45">Anterior</span>}{result.totalPages > result.currentPage ? <Link href={buildListHref("/app/service-orders", { page: result.currentPage + 1, query: result.query, status: result.status })} className="button-secondary">Próxima</Link> : <span className="button-secondary cursor-not-allowed opacity-45">Próxima</span>}</div></Pagination>
    </div>
  );
}
