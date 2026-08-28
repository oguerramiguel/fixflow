import { UserRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { getServiceOrderStatusActionLabel } from "@/domain/services/service-order-status-labels";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import { formatDate, formatDateTime, formatEquipmentType, formatMoneyBRL, formatQuoteStatus, formatServiceOrderStatus } from "@/app/app/format";
import { transitionServiceOrderStatusAction } from "@/app/app/service-orders/actions";
import { ServiceOrderStatusActions, type ServiceOrderStatusAction } from "@/app/app/service-orders/status-actions";
import { ArrowUpRightIcon, ClockIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { QuoteStatusBadge, ServiceOrderStatusBadge } from "@/components/ui/status-badge";
import { getServiceOrderDetails } from "@/server/services/service-order-service";

type ServiceOrderDetailsPageProps = { params: Promise<{ serviceOrderId: string }> };

function canShowStatusAction(status: ServiceOrderStatus, role: UserRole): boolean {
  return status !== "CANCELLED" || role === UserRole.OWNER || role === UserRole.ADMIN;
}

function buildStatusActions(statuses: ServiceOrderStatus[], role: UserRole): ServiceOrderStatusAction[] {
  return statuses.filter((status) => canShowStatusAction(status, role)).map((status) => ({
    targetStatus: status,
    label: getServiceOrderStatusActionLabel(status),
    variant: status === "CANCELLED" ? "danger" : "primary"
  }));
}

async function getServiceOrderOrNotFound(serviceOrderId: string) {
  const context = await requireAuthenticatedContextOrRedirect();
  try {
    return { context, serviceOrder: await getServiceOrderDetails(context, serviceOrderId) };
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

export default async function ServiceOrderDetailsPage({ params }: ServiceOrderDetailsPageProps) {
  const { serviceOrderId } = await params;
  const { context, serviceOrder } = await getServiceOrderOrNotFound(serviceOrderId);
  const transitionAction = transitionServiceOrderStatusAction.bind(null, serviceOrder.id);
  const statusActions = buildStatusActions(serviceOrder.allowedNextStatuses, context.role);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Ordem de serviço"
        title={serviceOrder.publicCode}
        description={<>Aberta em {formatDate(serviceOrder.createdAt)} · Atualizada em {formatDateTime(serviceOrder.updatedAt)}</>}
        actions={<ServiceOrderStatusBadge status={serviceOrder.status} label={formatServiceOrderStatus(serviceOrder.status)} />}
      />

      <section className="surface-card overflow-hidden" aria-labelledby="overview-title">
        <div className="border-b px-5 py-4 sm:px-6"><h2 id="overview-title" className="section-title">Visão geral</h2></div>
        <dl className="grid gap-px bg-slate-200 dark:bg-slate-700 md:grid-cols-2">
          <div className="bg-white p-5 dark:bg-[#171e2b] sm:p-6"><dt className="text-xs font-semibold uppercase tracking-wider muted-text">Cliente</dt><dd className="mt-2 text-base font-bold"><Link href={`/app/customers/${serviceOrder.customer.id}`} className="text-link text-slate-950 dark:text-slate-100">{serviceOrder.customer.name}</Link></dd><dd className="mt-1 text-sm muted-text">{serviceOrder.customer.phone}{serviceOrder.customer.email ? ` · ${serviceOrder.customer.email}` : ""}</dd></div>
          <div className="bg-white p-5 dark:bg-[#171e2b] sm:p-6"><dt className="text-xs font-semibold uppercase tracking-wider muted-text">Equipamento</dt><dd className="mt-2 text-base font-bold"><Link href={`/app/equipment/${serviceOrder.equipment.id}`} className="text-link text-slate-950 dark:text-slate-100">{serviceOrder.equipment.brand} {serviceOrder.equipment.model}</Link></dd><dd className="mt-1 text-sm muted-text">{formatEquipmentType(serviceOrder.equipment.type)}{serviceOrder.equipment.serialNumber ? ` · ${serviceOrder.equipment.serialNumber}` : ""}</dd></div>
          <div className="bg-white p-5 dark:bg-[#171e2b] md:col-span-2 sm:p-6"><dt className="text-xs font-semibold uppercase tracking-wider muted-text">Problema relatado</dt><dd className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-900 dark:text-slate-100">{serviceOrder.reportedIssue}</dd></div>
        </dl>
      </section>

      <ServiceOrderStatusActions action={transitionAction} actions={statusActions} />

      <section className="grid gap-6 lg:grid-cols-2" aria-label="Diagnóstico e orçamento">
        <article className="surface-card flex min-h-64 flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><h2 className="section-title">Diagnóstico</h2><p className="mt-1 text-sm muted-text">Registro técnico operacional</p></div>{serviceOrder.status === "IN_DIAGNOSIS" ? <Link href={`/app/service-orders/${serviceOrder.id}/diagnostic`} className="button-secondary min-h-10">{serviceOrder.diagnostic ? "Editar" : "Registrar"}</Link> : null}</div>
          {serviceOrder.diagnostic ? <div className="mt-6 flex flex-1 flex-col"><p className="line-clamp-5 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">{serviceOrder.diagnostic.description}</p><Link href={`/app/service-orders/${serviceOrder.id}/diagnostic`} className="text-link mt-auto inline-flex items-center gap-1 pt-5 text-sm">Ver diagnóstico <ArrowUpRightIcon className="size-4" /></Link></div> : <div className="flex flex-1 items-center"><EmptyState title="Diagnóstico não registrado" description={serviceOrder.status === "IN_DIAGNOSIS" ? "Registre a avaliação técnica para avançar no atendimento." : "O diagnóstico estará disponível quando for registrado."} /></div>}
        </article>

        <article className="surface-card flex min-h-64 flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><h2 className="section-title">Orçamento</h2><p className="mt-1 text-sm muted-text">Itens, envio e decisão</p></div>{serviceOrder.quote || (serviceOrder.diagnostic && serviceOrder.status === "IN_DIAGNOSIS") ? <Link href={`/app/service-orders/${serviceOrder.id}/quote`} className="button-secondary min-h-10">{serviceOrder.quote ? "Abrir" : "Criar"}</Link> : null}</div>
          {serviceOrder.quote ? <div className="mt-7"><QuoteStatusBadge status={serviceOrder.quote.status} label={formatQuoteStatus(serviceOrder.quote.status)} /><dl className="mt-6 grid grid-cols-2 gap-5"><div><dt className="text-xs font-semibold uppercase tracking-wider muted-text">Itens</dt><dd className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-50">{serviceOrder.quote.itemCount}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wider muted-text">Total</dt><dd className="mt-2 text-2xl font-bold tracking-tight text-brand-700 dark:text-brand-300">{formatMoneyBRL(serviceOrder.quote.total)}</dd></div></dl><Link href={`/app/service-orders/${serviceOrder.id}/quote`} className="text-link mt-6 inline-flex items-center gap-1 text-sm">Ver orçamento <ArrowUpRightIcon className="size-4" /></Link></div> : <div className="flex flex-1 items-center"><EmptyState title="Orçamento não criado" description={serviceOrder.diagnostic ? "O diagnóstico está pronto para receber um orçamento." : "Registre o diagnóstico antes de criar o orçamento."} /></div>}
        </article>
      </section>

      <section className="surface-card p-5 sm:p-6" aria-labelledby="timeline-title">
        <div><h2 id="timeline-title" className="section-title">Histórico</h2><p className="mt-1 text-sm muted-text">Linha do tempo completa do atendimento</p></div>
        {serviceOrder.timeline.length > 0 ? <ol className="relative mt-7 space-y-0 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-slate-200 dark:before:bg-slate-700">{serviceOrder.timeline.map((event) => <li key={event.id} className="relative grid grid-cols-[32px_1fr] gap-4 pb-7 last:pb-0"><span className="relative z-10 flex size-8 items-center justify-center rounded-full border-4 border-white bg-brand-100 text-brand-700 dark:border-[#171e2b] dark:bg-brand-500/20 dark:text-brand-300"><ClockIcon className="size-3.5" /></span><div className="pt-1"><p className="text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100">{event.description}</p><time className="mt-1 block text-xs muted-text">{formatDateTime(event.createdAt)}</time></div></li>)}</ol> : <EmptyState title="Nenhum evento registrado" />}
      </section>
    </div>
  );
}
