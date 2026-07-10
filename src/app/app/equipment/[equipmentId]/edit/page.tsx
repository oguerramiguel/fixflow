import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import {
  updateEquipmentAction,
  type EquipmentUpdateFormValues
} from "@/app/app/equipment/actions";
import { EquipmentForm } from "@/app/app/equipment/equipment-form";
import { getEquipmentDetails } from "@/server/services/equipment-service";

type EditEquipmentPageProps = {
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

export default async function EditEquipmentPage({
  params
}: EditEquipmentPageProps) {
  const { equipmentId } = await params;
  const equipment = await getEquipmentOrNotFound(equipmentId);
  const action = updateEquipmentAction.bind(null, equipment.id);
  const initialValues: EquipmentUpdateFormValues = {
    type: equipment.type,
    brand: equipment.brand,
    model: equipment.model,
    serialNumber: equipment.serialNumber ?? "",
    accessories: equipment.accessories ?? "",
    notes: equipment.notes ?? ""
  };

  return (
    <section className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-950">
          Editar equipamento
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {equipment.brand} {equipment.model}
        </p>
      </div>

      <EquipmentForm
        action={action}
        mode="update"
        customerName={equipment.customer.name}
        initialValues={initialValues}
        submitLabel="Salvar alteracoes"
        pendingLabel="Salvando..."
        cancelHref={`/app/equipment/${equipment.id}`}
      />
    </section>
  );
}
