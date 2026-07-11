import { UserRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { getServiceOrderStatusActionLabel } from "@/domain/services/service-order-status-labels";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import {
  formatDate,
  formatDateTime,
  formatEquipmentType,
  formatServiceOrderStatus
} from "@/app/app/format";
import { transitionServiceOrderStatusAction } from "@/app/app/service-orders/actions";
import {
  ServiceOrderStatusActions,
  type ServiceOrderStatusAction
} from "@/app/app/service-orders/status-actions";
import { getServiceOrderDetails } from "@/server/services/service-order-service";

type ServiceOrderDetailsPageProps = {
  params: Promise<{
    serviceOrderId: string;
  }>;
};

function canShowStatusAction(
  status: ServiceOrderStatus,
  role: UserRole
): boolean {
  if (status !== "CANCELLED") {
    return true;
  }

  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

function buildStatusActions(
  statuses: ServiceOrderStatus[],
  role: UserRole
): ServiceOrderStatusAction[] {
  return statuses
    .filter((status) => canShowStatusAction(status, role))
    .map((status) => ({
      targetStatus: status,
      label: getServiceOrderStatusActionLabel(status),
      variant: status === "CANCELLED" ? "danger" : "primary"
    }));
}

async function getServiceOrderOrNotFound(serviceOrderId: string) {
  const context = await requireAuthenticatedContextOrRedirect();

  try {
    return {
      context,
      serviceOrder: await getServiceOrderDetails(context, serviceOrderId)
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function ServiceOrderDetailsPage({
  params
}: ServiceOrderDetailsPageProps) {
  const { serviceOrderId } = await params;
  const { context, serviceOrder } = await getServiceOrderOrNotFound(
    serviceOrderId
  );
  const transitionAction = transitionServiceOrderStatusAction.bind(
    null,
    serviceOrder.id
  );
  const statusActions = buildStatusActions(
    serviceOrder.allowedNextStatuses,
    context.role
  );

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            {serviceOrder.publicCode}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Ordem de servico
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Aberta em {formatDate(serviceOrder.createdAt)}.
          </p>
        </div>

        <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
          {formatServiceOrderStatus(serviceOrder.status)}
        </span>
      </div>

      <dl className="mt-8 grid gap-5 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-slate-500">Cliente</dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            <Link
              href={`/app/customers/${serviceOrder.customer.id}`}
              className="hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              {serviceOrder.customer.name}
            </Link>
          </dd>
          <dd className="mt-1 text-sm text-slate-600">
            {serviceOrder.customer.phone}
            {serviceOrder.customer.email
              ? ` - ${serviceOrder.customer.email}`
              : ""}
          </dd>
        </div>

        <div>
          <dt className="text-sm font-medium text-slate-500">Equipamento</dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            <Link
              href={`/app/equipment/${serviceOrder.equipment.id}`}
              className="hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              {serviceOrder.equipment.brand} {serviceOrder.equipment.model}
            </Link>
          </dd>
          <dd className="mt-1 text-sm text-slate-600">
            {formatEquipmentType(serviceOrder.equipment.type)}
            {serviceOrder.equipment.serialNumber
              ? ` - ${serviceOrder.equipment.serialNumber}`
              : ""}
          </dd>
        </div>

        <div>
          <dt className="text-sm font-medium text-slate-500">
            Ultima atualizacao
          </dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            {formatDateTime(serviceOrder.updatedAt)}
          </dd>
        </div>

        <div>
          <dt className="text-sm font-medium text-slate-500">Status</dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            {formatServiceOrderStatus(serviceOrder.status)}
          </dd>
        </div>

        <div className="md:col-span-2">
          <dt className="text-sm font-medium text-slate-500">
            Problema relatado
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-base text-slate-950">
            {serviceOrder.reportedIssue}
          </dd>
        </div>
      </dl>

      <ServiceOrderStatusActions
        action={transitionAction}
        actions={statusActions}
      />

      <section className="mt-10">
        <h3 className="text-xl font-bold text-slate-950">Historico</h3>
        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {serviceOrder.timeline.length > 0 ? (
            <ol className="divide-y divide-slate-200">
              {serviceOrder.timeline.map((event) => (
                <li key={event.id} className="p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    {event.description}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDateTime(event.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="p-6 text-sm text-slate-600">
              Nenhum evento registrado.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
