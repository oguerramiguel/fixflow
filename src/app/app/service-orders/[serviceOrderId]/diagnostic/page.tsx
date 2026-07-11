import Link from "next/link";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import {
  formatDateTime,
  formatEquipmentType,
  formatServiceOrderStatus
} from "@/app/app/format";
import { getDiagnosticForServiceOrder } from "@/server/services/diagnostic-service";
import { getServiceOrderDetails } from "@/server/services/service-order-service";
import { saveDiagnosticAction } from "./actions";
import { DiagnosticForm } from "./diagnostic-form";

type DiagnosticPageProps = {
  params: Promise<{
    serviceOrderId: string;
  }>;
};

async function getPageData(serviceOrderId: string) {
  const context = await requireAuthenticatedContextOrRedirect();

  try {
    const [serviceOrder, diagnostic] = await Promise.all([
      getServiceOrderDetails(context, serviceOrderId),
      getDiagnosticForServiceOrder(context, serviceOrderId)
    ]);

    return {
      serviceOrder,
      diagnostic
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function DiagnosticPage({ params }: DiagnosticPageProps) {
  const { serviceOrderId } = await params;
  const { serviceOrder, diagnostic } = await getPageData(serviceOrderId);
  const canEdit = serviceOrder.status === "IN_DIAGNOSIS";
  const action = saveDiagnosticAction.bind(null, serviceOrder.id);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            {serviceOrder.publicCode}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Diagnostico tecnico
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {serviceOrder.customer.name} - {serviceOrder.equipment.brand}{" "}
            {serviceOrder.equipment.model}
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
            {serviceOrder.customer.name}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-500">Equipamento</dt>
          <dd className="mt-1 text-base font-semibold text-slate-950">
            {formatEquipmentType(serviceOrder.equipment.type)} -{" "}
            {serviceOrder.equipment.brand} {serviceOrder.equipment.model}
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

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
        {canEdit ? (
          <DiagnosticForm
            action={action}
            cancelHref={`/app/service-orders/${serviceOrder.id}`}
            initialValues={
              diagnostic
                ? {
                    description: diagnostic.description,
                    technicalNotes: diagnostic.technicalNotes ?? ""
                  }
                : undefined
            }
          />
        ) : diagnostic ? (
          <div>
            <h3 className="text-xl font-bold text-slate-950">
              Diagnostico registrado
            </h3>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-800">
              {diagnostic.description}
            </p>
            {diagnostic.technicalNotes ? (
              <div className="mt-5 border-t border-slate-200 pt-5">
                <h4 className="text-sm font-semibold text-slate-950">
                  Notas tecnicas
                </h4>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {diagnostic.technicalNotes}
                </p>
              </div>
            ) : null}
            <p className="mt-5 text-sm text-slate-500">
              Atualizado em {formatDateTime(diagnostic.updatedAt)}.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Diagnostico ainda nao registrado.
          </p>
        )}
      </div>

      <div className="mt-6">
        <Link
          href={`/app/service-orders/${serviceOrder.id}`}
          className="font-semibold text-emerald-700 hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          Voltar para ordem de servico
        </Link>
      </div>
    </section>
  );
}
