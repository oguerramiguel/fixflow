import Link from "next/link";
import { DomainError } from "@/domain/errors/domain-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import { formatDate } from "@/app/app/format";
import {
  buildListHref,
  readPageSearchParam,
  readSearchParams,
  readStringSearchParam,
  type PageSearchParams
} from "@/app/app/list-links";
import { listCustomersForOrganization } from "@/server/services/customer-service";

type CustomersPageProps = {
  searchParams?: PageSearchParams;
};

export default async function CustomersPage({
  searchParams
}: CustomersPageProps) {
  const context = await requireAuthenticatedContextOrRedirect();
  const resolvedSearchParams = await readSearchParams(searchParams);
  const query = readStringSearchParam(resolvedSearchParams, "query");
  const page = readPageSearchParam(resolvedSearchParams);
  const { result, error } = await listCustomersForOrganization(context, {
    page,
    query
  })
    .then((customersResult) => ({
      result: customersResult,
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
            query
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
          <h2 className="text-2xl font-bold text-slate-950">Clientes</h2>
          <p className="mt-2 text-sm text-slate-600">
            {result.totalCount} cliente{result.totalCount === 1 ? "" : "s"}{" "}
            encontrado{result.totalCount === 1 ? "" : "s"}.
          </p>
        </div>

        <Link
          href="/app/customers/new"
          className="inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          Novo cliente
        </Link>
      </div>

      <form
        action="/app/customers"
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="customer-query"
            className="block text-sm font-medium text-slate-800"
          >
            Buscar clientes
          </label>
          <input
            id="customer-query"
            name="query"
            type="search"
            maxLength={100}
            defaultValue={result.query ?? query ?? ""}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>
        <div className="flex items-end gap-3">
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            Buscar
          </button>
          {result.query ? (
            <Link
              href="/app/customers"
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
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Contato
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Criado em
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {result.items.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-4 py-4 align-top text-sm font-semibold text-slate-950">
                      <Link
                        href={`/app/customers/${customer.id}`}
                        className="hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      <span className="block">{customer.phone}</span>
                      {customer.email ? (
                        <span className="mt-1 block text-slate-500">
                          {customer.email}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className="px-4 py-4 align-top text-sm">
                      <Link
                        href={`/app/customers/${customer.id}/edit`}
                        className="font-semibold text-emerald-700 hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-sm text-slate-600">
            Nenhum cliente encontrado.
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
              href={buildListHref("/app/customers", {
                page: result.currentPage - 1,
                query: result.query
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
              href={buildListHref("/app/customers", {
                page: result.currentPage + 1,
                query: result.query
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
