import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/errors/not-found-error";
import {
  formatDate,
  formatDateTime,
  formatMoneyBRL
} from "@/app/app/format";
import {
  approvePublicQuoteAction,
  rejectPublicQuoteAction
} from "./actions";
import { PublicQuoteDecisionForm } from "./public-quote-decision-form";
import { enforceRateLimit } from "@/server/security/rate-limit-service";
import {
  RATE_LIMIT_EXCEEDED_MESSAGE,
  RateLimitExceededError,
  rateLimitOperations
} from "@/server/security/rate-limit-types";
import { getSecurityRequestOrigin } from "@/server/security/request-origin";
import { createPublicCodeSecuritySubject } from "@/server/security/security-identifiers";
import { getPublicServiceOrderByCode } from "@/server/services/public-tracking-service";

type PublicTrackingPageProps = {
  params: Promise<{
    publicCode: string;
  }>;
};

async function getPublicServiceOrderOrNotFound(publicCode: string) {
  try {
    return await getPublicServiceOrderByCode(publicCode);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }
}

async function isPublicLookupRateLimited(publicCode: string): Promise<boolean> {
  const origin = await getSecurityRequestOrigin();
  const publicCodeSubject = createPublicCodeSecuritySubject(publicCode);

  try {
    await enforceRateLimit({
      operation: rateLimitOperations.publicPortalLookup,
      keyParts: [],
      subjectHash: publicCodeSubject.subjectHash,
      origin
    });

    return false;
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return true;
    }

    throw error;
  }
}

function PublicLookupRateLimitMessage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto w-full max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          FixFlow
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          Nao foi possivel carregar o acompanhamento.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {RATE_LIMIT_EXCEEDED_MESSAGE}
        </p>
      </section>
    </main>
  );
}

export default async function PublicTrackingPage({
  params
}: PublicTrackingPageProps) {
  const { publicCode } = await params;

  if (await isPublicLookupRateLimited(publicCode)) {
    return <PublicLookupRateLimitMessage />;
  }

  const serviceOrder = await getPublicServiceOrderOrNotFound(publicCode);
  const approveAction = approvePublicQuoteAction.bind(
    null,
    serviceOrder.publicCode
  );
  const rejectAction = rejectPublicQuoteAction.bind(
    null,
    serviceOrder.publicCode
  );

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            FixFlow
          </p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">
                Acompanhamento de ordem de servico
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Codigo {serviceOrder.publicCode} registrado em{" "}
                {formatDate(serviceOrder.createdAt)}.
              </p>
            </div>
            <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
              {serviceOrder.statusLabel}
            </span>
          </div>
        </header>

        <section className="border-b border-slate-200 py-8">
          <h2 className="text-xl font-bold text-slate-950">Resumo</h2>
          <dl className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-slate-500">Status</dt>
              <dd className="mt-1 text-base font-semibold text-slate-950">
                {serviceOrder.statusLabel}
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
              <dt className="text-sm font-medium text-slate-500">
                Equipamento
              </dt>
              <dd className="mt-1 text-base font-semibold text-slate-950">
                {serviceOrder.equipment.brand} {serviceOrder.equipment.model}
              </dd>
              <dd className="mt-1 text-sm text-slate-600">
                {serviceOrder.equipment.typeLabel}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">
                Problema relatado
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-base text-slate-950">
                {serviceOrder.reportedIssue}
              </dd>
            </div>
          </dl>
        </section>

        <section className="border-b border-slate-200 py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Orcamento</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Itens e total aparecem quando o orcamento esta disponivel.
              </p>
            </div>
            {serviceOrder.quote ? (
              <div className="text-left sm:text-right">
                <p className="text-sm font-medium text-slate-500">Total</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {formatMoneyBRL(serviceOrder.quote.total)}
                </p>
              </div>
            ) : null}
          </div>

          {serviceOrder.quote ? (
            <div className="mt-5">
              <div className="mb-4 flex flex-wrap gap-3">
                <span className="inline-flex rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800">
                  {serviceOrder.quote.statusLabel}
                </span>
              </div>

              {serviceOrder.quote.items.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Descricao
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Quantidade
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Valor unitario
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {serviceOrder.quote.items.map((item, index) => (
                          <tr key={`${index}-${item.description}`}>
                            <td className="px-4 py-4 align-top text-sm font-semibold text-slate-950">
                              {item.description}
                            </td>
                            <td className="px-4 py-4 align-top text-sm text-slate-700">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-4 align-top text-sm text-slate-700">
                              {formatMoneyBRL(item.unitPrice)}
                            </td>
                            <td className="px-4 py-4 align-top text-sm font-semibold text-slate-950">
                              {formatMoneyBRL(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Nenhum item disponivel para exibicao.
                </p>
              )}

              {serviceOrder.quote.canDecide ? (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <PublicQuoteDecisionForm
                    approveAction={approveAction}
                    rejectAction={rejectAction}
                  />
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-600">
                  Este orcamento esta em modo somente leitura.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-600">
              Orcamento ainda nao disponivel.
            </p>
          )}
        </section>

        <section className="py-8">
          <h2 className="text-xl font-bold text-slate-950">Historico</h2>
          {serviceOrder.timeline.length > 0 ? (
            <ol className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
              {serviceOrder.timeline.map((event) => (
                <li
                  key={`${event.description}-${event.createdAt.toISOString()}`}
                  className="py-4"
                >
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
            <p className="mt-5 text-sm text-slate-600">
              Nenhum evento publico registrado.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
