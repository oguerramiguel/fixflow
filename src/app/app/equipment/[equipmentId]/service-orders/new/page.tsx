import Link from "next/link";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import { formatEquipmentType } from "@/app/app/format";
import { createServiceOrderAction } from "@/app/app/service-orders/actions";
import { ServiceOrderForm } from "@/app/app/service-orders/service-order-form";
import { getEquipmentDetails } from "@/server/services/equipment-service";
import { PageHeader } from "@/components/ui/primitives";

type NewEquipmentServiceOrderPageProps = {
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

export default async function NewEquipmentServiceOrderPage({
  params
}: NewEquipmentServiceOrderPageProps) {
  const { equipmentId } = await params;
  const equipment = await getEquipmentOrNotFound(equipmentId);
  const action = createServiceOrderAction.bind(null, equipment.id);

  return (
    <section className="max-w-3xl">
      <div className="mb-6"><PageHeader eyebrow="Nova ordem · Etapa 3 de 3" title="Descreva o problema" description="Confira o cliente e o equipamento. A ordem será criada como Recebido e ficará pronta para iniciar o diagnóstico." actions={<Link href={`/app/service-orders/new?customerId=${equipment.customer.id}`} className="button-secondary">Trocar equipamento</Link>} /></div>

      <dl className="mb-6 grid gap-5 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-slate-500">Cliente</dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            <Link
              href={`/app/customers/${equipment.customer.id}`}
              className="hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              {equipment.customer.name}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Equipamento</dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            <Link
              href={`/app/equipment/${equipment.id}`}
              className="hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              {equipment.brand} {equipment.model}
            </Link>
          </dd>
          <dd className="mt-1 text-sm text-slate-600">
            {formatEquipmentType(equipment.type)}
            {equipment.serialNumber ? ` - ${equipment.serialNumber}` : ""}
          </dd>
        </div>
      </dl>

      <ServiceOrderForm
        action={action}
        cancelHref={`/app/equipment/${equipment.id}`}
      />
    </section>
  );
}
