import Link from "next/link";
import { DomainError } from "@/domain/errors/domain-error";
import { serviceOrderStatuses } from "@/domain/entities/service-order";
import { getServiceOrderStatusLabel } from "@/domain/services/service-order-status-labels";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import {
  formatDate,
  formatEquipmentType,
  formatServiceOrderStatus
} from "@/app/app/format";
import {
  buildListHref,
  readPageSearchParam,
  readSearchParams,
  readStringSearchParam,
  type PageSearchParams
} from "@/app/app/list-links";
import { listServiceOrdersForOrganization } from "@/server/services/service-order-service";

type ServiceOrdersPageProps = {
  searchParams?: PageSearchParams;
};

function summarizeReportedIssue(reportedIssue: string): string {
  if (reportedIssue.length <= 120) {
    return reportedIssue;
  }

  return `${reportedIssue.slice(0, 117)}...`;
}

export default async function ServiceOrdersPage({
  searchParams
}: ServiceOrdersPageProps) {
  const context = await requireAuthenticatedContextOrRedirect();
  const resolvedSearchParams = await readSearchParams(searchParams);
  const query = readStringSearchParam(resolvedSearchParams, "query");
  const status = readStringSearchParam(resolvedSearchParams, "status");
  const page = readPageSearchParam(resolvedSearchParams);
  const hasFilters = Boolean(query?.trim() || status?.trim());
  const { result, error } = await listServiceOrdersForOrganization(context, {
    page,
    query,
    status
  })
    .then((serviceOrdersResult) => ({
      result: serviceOrdersResult,
      error: undefined
    }))
    .catch((caughtError: unknown) => {
      if (caughtError instanceof DomainError) {
        return {
          result: {
            items: [],
            totalCount: 0,
            currentPage: 1,
            totalPages: 0,
            query,
            status: undefined
          },
          error: caughtError.message
        };
      }

      throw caughtError;
    });

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            Ordens de servico
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {result.totalCount} ordem
            {result.totalCount === 1 ? "" : "s"} encontrada
            {result.totalCount === 1 ? "" : "s"}.
          </p>
        </div>

        <Link
          href="/app/equipment"
          className="inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          Escolher equipamento
        </Link>
      </div>

      <form
        action="/app/service-orders"
        className="mt-6 grid gap-3 lg:grid-cols-[1fr_260px_auto]"
      >
        <div className="min-w-0">
          <label
            htmlFor="service-order-query"
            className="block text-sm font-medium text-slate-800"
          >
            Buscar ordens de servico
          </label>
          <input
            id="service-order-query"
            name="query"
            type="search"
            maxLength={100}
            defaultValue={result.query ?? query ?? ""}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>

        <div>
          <label
            htmlFor="service-order-status"
            className="block text-sm font-medium text-slate-800"
          >
            Status
          </label>
          <select
            id="service-order-status"
            name="status"
            defaultValue={result.status ?? status ?? ""}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          >
            <option value="">Todos</option>
            {serviceOrderStatuses.map((option) => (
              <option key={option} value={option}>
                {getServiceOrderStatusLabel(option)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-3">
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            Buscar
          </button>
          {result.query || result.status || status ? (
            <Link
              href="/app/service-orders"
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              Limpar
            </Link>
          ) : null}
        </div>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {result.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Ordem
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Equipamento
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Abertura
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {result.items.map((serviceOrder) => (
                  <tr key={serviceOrder.id}>
                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      <Link
                        href={`/app/service-orders/${serviceOrder.id}`}
                        className="font-semibold text-slate-950 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                      >
                        {serviceOrder.publicCode}
                      </Link>
                      <span className="mt-1 block max-w-xs text-slate-500">
                        {summarizeReportedIssue(serviceOrder.reportedIssue)}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      <Link
                        href={`/app/customers/${serviceOrder.customer.id}`}
                        className="font-semibold text-slate-950 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                      >
                        {serviceOrder.customer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      <Link
                        href={`/app/equipment/${serviceOrder.equipment.id}`}
                        className="font-semibold text-slate-950 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                      >
                        {serviceOrder.equipment.brand}{" "}
                        {serviceOrder.equipment.model}
                      </Link>
                      <span className="mt-1 block text-slate-500">
                        {formatEquipmentType(serviceOrder.equipment.type)}
                        {serviceOrder.equipment.serialNumber
                          ? ` - ${serviceOrder.equipment.serialNumber}`
                          : ""}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top text-sm">
                      <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                        {formatServiceOrderStatus(serviceOrder.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      {formatDate(serviceOrder.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-sm text-slate-600">
            {hasFilters
              ? "Nenhuma ordem de servico encontrada para os filtros informados."
              : "Nenhuma ordem de servico cadastrada."}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Pagina {result.currentPage}
          {result.totalPages > 0 ? ` de ${result.totalPages}` : ""}
        </p>
        <div className="flex gap-2">
          {result.currentPage > 1 ? (
            <Link
              href={buildListHref("/app/service-orders", {
                page: result.currentPage - 1,
                query: result.query,
                status: result.status
              })}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              Anterior
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400">
              Anterior
            </span>
          )}
          {result.totalPages > result.currentPage ? (
            <Link
              href={buildListHref("/app/service-orders", {
                page: result.currentPage + 1,
                query: result.query,
                status: result.status
              })}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              Proxima
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400">
              Proxima
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
