import Link from "next/link";
import { notFound } from "next/navigation";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import {
  buildListHref,
  readPageSearchParam,
  readSearchParams,
  readStringSearchParam,
  type PageSearchParams
} from "@/app/app/list-links";
import { createEquipmentAction } from "@/app/app/equipment/actions";
import { EquipmentForm } from "@/app/app/equipment/equipment-form";
import {
  getCustomerDetails,
  listCustomersForOrganization
} from "@/server/services/customer-service";

type NewEquipmentPageProps = {
  searchParams?: PageSearchParams;
};

async function getCustomerOrNotFound(customerId: string) {
  const context = await requireAuthenticatedContextOrRedirect();

  try {
    return await getCustomerDetails(context, customerId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }
}

async function CustomerPicker({
  query,
  page
}: {
  query?: string;
  page?: number;
}) {
  const context = await requireAuthenticatedContextOrRedirect();
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-950">
          Escolher cliente
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Selecione o cliente para cadastrar um equipamento.
        </p>
      </div>

      <form
        action="/app/equipment/new"
        className="flex flex-col gap-3 sm:flex-row"
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
              href="/app/equipment/new"
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
          <div className="divide-y divide-slate-200">
            {result.items.map((customer) => (
              <div
                key={customer.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-950">
                    {customer.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {customer.phone}
                    {customer.email ? ` - ${customer.email}` : ""}
                  </p>
                </div>
                <Link
                  href={`/app/equipment/new?customerId=${customer.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                >
                  Selecionar
                </Link>
              </div>
            ))}
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
              href={buildListHref("/app/equipment/new", {
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
              href={buildListHref("/app/equipment/new", {
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

export default async function NewEquipmentPage({
  searchParams
}: NewEquipmentPageProps) {
  const resolvedSearchParams = await readSearchParams(searchParams);
  const customerId = readStringSearchParam(resolvedSearchParams, "customerId");
  const query = readStringSearchParam(resolvedSearchParams, "query");
  const page = readPageSearchParam(resolvedSearchParams);

  if (!customerId) {
    return <CustomerPicker query={query} page={page} />;
  }

  const customer = await getCustomerOrNotFound(customerId);

  return (
    <section className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-950">
          Novo equipamento
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Equipamento vinculado ao cliente selecionado.
        </p>
      </div>

      <EquipmentForm
        action={createEquipmentAction}
        mode="create"
        customerId={customer.id}
        customerName={customer.name}
        submitLabel="Salvar equipamento"
        pendingLabel="Salvando..."
        cancelHref={`/app/customers/${customer.id}`}
      />
    </section>
  );
}
