import Link from "next/link";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import { formatDate, formatEquipmentType } from "@/app/app/format";
import { getCustomerDetails } from "@/server/services/customer-service";

type CustomerDetailsPageProps = {
  params: Promise<{
    customerId: string;
  }>;
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

export default async function CustomerDetailsPage({
  params
}: CustomerDetailsPageProps) {
  const { customerId } = await params;
  const customer = await getCustomerOrNotFound(customerId);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            {customer.name}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Cliente desde {formatDate(customer.createdAt)}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/customers/${customer.id}/edit`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            Editar cliente
          </Link>
          <Link
            href={`/app/equipment/new?customerId=${customer.id}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            Novo equipamento
          </Link>
        </div>
      </div>

      <dl className="mt-8 grid gap-5 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-slate-500">Telefone</dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            {customer.phone}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Email</dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            {customer.email ?? "Nao informado"}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Documento</dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            {customer.document ?? "Nao informado"}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">
            Ultima atualizacao
          </dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            {formatDate(customer.updatedAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-950">
              Equipamentos
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {customer.equipment.length} equipamento
              {customer.equipment.length === 1 ? "" : "s"} vinculado
              {customer.equipment.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {customer.equipment.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Equipamento
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Numero de serie
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
                  {customer.equipment.map((equipment) => (
                    <tr key={equipment.id}>
                      <td className="px-4 py-4 align-top text-sm text-slate-700">
                        <Link
                          href={`/app/equipment/${equipment.id}`}
                          className="font-semibold text-slate-950 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                        >
                          {equipment.brand} {equipment.model}
                        </Link>
                        <span className="mt-1 block text-slate-500">
                          {formatEquipmentType(equipment.type)}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700">
                        {equipment.serialNumber ?? "Nao informado"}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700">
                        {formatDate(equipment.createdAt)}
                      </td>
                      <td className="px-4 py-4 align-top text-sm">
                        <Link
                          href={`/app/equipment/${equipment.id}/edit`}
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
              Nenhum equipamento vinculado.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
