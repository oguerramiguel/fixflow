import Link from "next/link";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import { formatDate, formatEquipmentType } from "@/app/app/format";
import { getEquipmentDetails } from "@/server/services/equipment-service";

type EquipmentDetailsPageProps = {
  params: Promise<{
    equipmentId: string;
  }>;
};

async function getEquipmentOrNotFound(equipmentId: string) {
  const context = await requireAuthenticatedContextOrRedirect();

  try {
    return await getEquipmentDetails(context, equipmentId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function EquipmentDetailsPage({
  params
}: EquipmentDetailsPageProps) {
  const { equipmentId } = await params;
  const equipment = await getEquipmentOrNotFound(equipmentId);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            {equipment.brand} {equipment.model}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {formatEquipmentType(equipment.type)} de{" "}
            <Link
              href={`/app/customers/${equipment.customer.id}`}
              className="font-semibold text-emerald-700 hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              {equipment.customer.name}
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/equipment/${equipment.id}/service-orders/new`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            Abrir ordem de servico
          </Link>
          <Link
            href={`/app/equipment/${equipment.id}/edit`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            Editar equipamento
          </Link>
        </div>
      </div>

      <dl className="mt-8 grid gap-5 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-slate-500">Tipo</dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            {formatEquipmentType(equipment.type)}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Cliente</dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            {equipment.customer.name}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">
            Numero de serie
          </dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            {equipment.serialNumber ?? "Nao informado"}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">
            Ultima atualizacao
          </dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            {formatDate(equipment.updatedAt)}
          </dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-sm font-medium text-slate-500">Acessorios</dt>
          <dd className="mt-1 whitespace-pre-wrap text-base text-slate-950">
            {equipment.accessories ?? "Nao informado"}
          </dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-sm font-medium text-slate-500">Observacoes</dt>
          <dd className="mt-1 whitespace-pre-wrap text-base text-slate-950">
            {equipment.notes ?? "Nao informado"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
