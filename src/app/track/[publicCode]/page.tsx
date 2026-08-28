import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { serviceOrderStatuses, type ServiceOrderStatus } from "@/domain/entities/service-order";
import { formatDate, formatDateTime, formatMoneyBRL } from "@/app/app/format";
import { approvePublicQuoteAction, rejectPublicQuoteAction } from "./actions";
import { PublicQuoteDecisionForm } from "./public-quote-decision-form";
import { CheckIcon, ClockIcon } from "@/components/ui/icons";
import { FixFlowLogo } from "@/components/ui/logo";
import { EmptyState } from "@/components/ui/primitives";
import { QuoteStatusBadge, ServiceOrderStatusBadge } from "@/components/ui/status-badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { enforceRateLimit } from "@/server/security/rate-limit-service";
import { RATE_LIMIT_EXCEEDED_MESSAGE, RateLimitExceededError, rateLimitOperations } from "@/server/security/rate-limit-types";
import { getSecurityRequestOrigin } from "@/server/security/request-origin";
import { createPublicCodeSecuritySubject } from "@/server/security/security-identifiers";
import { getPublicServiceOrderByCode } from "@/server/services/public-tracking-service";

type PublicTrackingPageProps = { params: Promise<{ publicCode: string }> };

const publicProgress: Array<{ status: ServiceOrderStatus; label: string }> = [
  { status: "RECEIVED", label: "Recebida" },
  { status: "IN_DIAGNOSIS", label: "Diagnóstico" },
  { status: "WAITING_FOR_APPROVAL", label: "Aprovação" },
  { status: "IN_REPAIR", label: "Manutenção" },
  { status: "READY_FOR_PICKUP", label: "Retirada" },
  { status: "COMPLETED", label: "Concluída" }
];

async function getPublicServiceOrderOrNotFound(publicCode: string) {
  try {
    return await getPublicServiceOrderByCode(publicCode);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

async function isPublicLookupRateLimited(publicCode: string): Promise<boolean> {
  const origin = await getSecurityRequestOrigin();
  const publicCodeSubject = createPublicCodeSecuritySubject(publicCode);
  try {
    await enforceRateLimit({ operation: rateLimitOperations.publicPortalLookup, keyParts: [], subjectHash: publicCodeSubject.subjectHash, origin });
    return false;
  } catch (error) {
    if (error instanceof RateLimitExceededError) return true;
    throw error;
  }
}

function PublicLookupRateLimitMessage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <section className="surface-card mx-auto mt-16 w-full max-w-xl p-6 sm:p-8">
        <FixFlowLogo href="/" />
        <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Não foi possível carregar o acompanhamento</h1>
        <p className="mt-3 text-sm leading-6 muted-text">{RATE_LIMIT_EXCEEDED_MESSAGE}</p>
      </section>
    </main>
  );
}

export default async function PublicTrackingPage({ params }: PublicTrackingPageProps) {
  const { publicCode } = await params;
  if (await isPublicLookupRateLimited(publicCode)) return <PublicLookupRateLimitMessage />;

  const serviceOrder = await getPublicServiceOrderOrNotFound(publicCode);
  const approveAction = approvePublicQuoteAction.bind(null, serviceOrder.publicCode);
  const rejectAction = rejectPublicQuoteAction.bind(null, serviceOrder.publicCode);
  const currentStatusIndex = serviceOrderStatuses.indexOf(serviceOrder.status);
  const currentPublicStep = publicProgress.reduce(
    (lastStep, step, index) => currentStatusIndex >= serviceOrderStatuses.indexOf(step.status) ? index : lastStep,
    0
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.10),transparent_32rem)] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex items-center justify-between gap-4"><FixFlowLogo href={`/track/${serviceOrder.publicCode}`} /><ThemeToggle compact /></header>

        <section className="mt-8 sm:mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="page-eyebrow">Acompanhamento</p><h1 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-slate-950 dark:text-slate-50 sm:text-4xl">Sua ordem de serviço</h1><p className="mt-3 text-sm leading-6 muted-text">Código <span className="font-semibold text-slate-700 dark:text-slate-200">{serviceOrder.publicCode}</span> · Recebida em {formatDate(serviceOrder.createdAt)}</p></div>
            <ServiceOrderStatusBadge status={serviceOrder.status} label={serviceOrder.statusLabel} />
          </div>
        </section>

        {serviceOrder.status !== "CANCELLED" ? (
          <section className="surface-card mt-7 overflow-x-auto p-5 sm:p-6" aria-labelledby="progress-title">
            <h2 id="progress-title" className="sr-only">Andamento da ordem</h2>
            <ol className="grid min-w-[620px] grid-cols-6">
              {publicProgress.map((step, index) => {
                const stepStatusIndex = serviceOrderStatuses.indexOf(step.status);
                const complete = currentStatusIndex >= stepStatusIndex;
                const active = index === currentPublicStep;
                return <li key={step.status} className="relative flex flex-col items-center text-center before:absolute before:left-0 before:right-0 before:top-4 before:h-0.5 before:bg-slate-200 first:before:left-1/2 last:before:right-1/2 dark:before:bg-slate-700"><span className={`relative z-10 flex size-8 items-center justify-center rounded-full border-2 ${complete ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800"}`}>{complete && !active ? <CheckIcon className="size-4" /> : <span className="size-2 rounded-full bg-current" />}</span><span className={`mt-3 text-xs font-semibold ${active ? "text-brand-700 dark:text-brand-300" : complete ? "text-slate-700 dark:text-slate-200" : "muted-text"}`}>{step.label}</span></li>;
              })}
            </ol>
          </section>
        ) : <p className="alert-error mt-7">Esta ordem foi cancelada. Consulte o histórico abaixo para acompanhar os eventos registrados.</p>}

        <section className="surface-card mt-6 p-5 sm:p-7" aria-labelledby="summary-title">
          <div className="flex items-center justify-between gap-4"><div><h2 id="summary-title" className="section-title">Resumo do atendimento</h2><p className="mt-1 text-sm muted-text">Última atualização em {formatDateTime(serviceOrder.updatedAt)}</p></div></div>
          <dl className="mt-6 grid gap-6 md:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wider muted-text">Equipamento</dt><dd className="mt-2 text-lg font-bold text-slate-950 dark:text-slate-50">{serviceOrder.equipment.brand} {serviceOrder.equipment.model}</dd><dd className="mt-1 text-sm muted-text">{serviceOrder.equipment.typeLabel}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wider muted-text">Problema relatado</dt><dd className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-800 dark:text-slate-200">{serviceOrder.reportedIssue}</dd></div></dl>
        </section>

        <section className="surface-card mt-6 overflow-hidden" aria-labelledby="quote-title">
          <div className="border-b bg-gradient-to-r from-brand-50 to-transparent p-5 dark:from-brand-500/10 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="page-eyebrow">Decisão do cliente</p><h2 id="quote-title" className="mt-2 section-title">Orçamento</h2><p className="mt-2 text-sm leading-6 muted-text">Confira os itens e o valor total antes de decidir.</p></div>{serviceOrder.quote ? <div className="sm:text-right"><p className="text-xs font-semibold uppercase tracking-wider muted-text">Total</p><p className="mt-1 text-3xl font-bold tracking-[-0.04em] text-brand-700 dark:text-brand-300">{formatMoneyBRL(serviceOrder.quote.total)}</p></div> : null}</div></div>

          {serviceOrder.quote ? <div className="p-5 sm:p-7"><QuoteStatusBadge status={serviceOrder.quote.status} label={serviceOrder.quote.statusLabel} />
            {serviceOrder.quote.items.length > 0 ? <>
              <div className="mt-5 hidden overflow-x-auto sm:block"><table className="data-table"><thead><tr><th>Descrição</th><th>Qtd.</th><th>Valor unitário</th><th className="text-right">Subtotal</th></tr></thead><tbody>{serviceOrder.quote.items.map((item, index) => <tr key={`${index}-${item.description}`}><td className="font-semibold !text-slate-900 dark:!text-slate-100">{item.description}</td><td>{item.quantity}</td><td>{formatMoneyBRL(item.unitPrice)}</td><td className="text-right font-semibold !text-slate-900 dark:!text-slate-100">{formatMoneyBRL(item.subtotal)}</td></tr>)}</tbody></table></div>
              <div className="mt-5 divide-y rounded-xl border sm:hidden">{serviceOrder.quote.items.map((item, index) => <div key={`${index}-${item.description}`} className="p-4"><p className="font-semibold text-slate-900 dark:text-slate-100">{item.description}</p><div className="mt-3 flex justify-between gap-4 text-sm muted-text"><span>{item.quantity} × {formatMoneyBRL(item.unitPrice)}</span><span className="font-bold text-slate-900 dark:text-slate-100">{formatMoneyBRL(item.subtotal)}</span></div></div>)}</div>
            </> : <EmptyState title="Nenhum item disponível" />}
            {serviceOrder.quote.canDecide ? <div className="mt-7 border-t pt-6"><PublicQuoteDecisionForm approveAction={approveAction} rejectAction={rejectAction} /></div> : <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm muted-text dark:bg-slate-800">Este orçamento está em modo somente leitura.</p>}
          </div> : <EmptyState title="Orçamento ainda não disponível" description="Você poderá consultar os itens e decidir assim que a equipe concluir o orçamento." />}
        </section>

        <section className="surface-card mt-6 p-5 sm:p-7" aria-labelledby="public-timeline-title">
          <h2 id="public-timeline-title" className="section-title">Histórico do atendimento</h2>
          {serviceOrder.timeline.length > 0 ? <ol className="relative mt-7 space-y-0 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-slate-200 dark:before:bg-slate-700">{serviceOrder.timeline.map((event) => <li key={`${event.description}-${event.createdAt.toISOString()}`} className="relative grid grid-cols-[32px_1fr] gap-4 pb-7 last:pb-0"><span className="relative z-10 flex size-8 items-center justify-center rounded-full border-4 border-white bg-brand-100 text-brand-700 dark:border-[#171e2b] dark:bg-brand-500/20 dark:text-brand-300"><ClockIcon className="size-3.5" /></span><div className="pt-1"><p className="text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100">{event.description}</p><time className="mt-1 block text-xs muted-text">{formatDateTime(event.createdAt)}</time></div></li>)}</ol> : <EmptyState title="Nenhum evento público registrado" />}
        </section>

        <footer className="py-10 text-center text-xs muted-text">Acompanhamento seguro fornecido por FixFlow.</footer>
      </div>
    </main>
  );
}
