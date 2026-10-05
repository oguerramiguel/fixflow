import { UserRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import {
  formatEquipmentType,
  formatMoneyBRL,
  formatQuoteStatus,
  formatServiceOrderStatus
} from "@/app/app/format";
import { getDiagnosticForServiceOrder } from "@/server/services/diagnostic-service";
import { getQuoteForServiceOrder } from "@/server/services/quote-service";
import { getServiceOrderDetails } from "@/server/services/service-order-service";
import {
  addQuoteItemAction,
  approveQuoteAction,
  createQuoteAction,
  rejectQuoteAction,
  removeQuoteItemAction,
  sendQuoteAction
} from "./actions";
import { QuoteCommandForm } from "./quote-command-forms";
import { QuoteItemForm } from "./quote-item-form";
import { PageHeader } from "@/components/ui/primitives";
import { QuoteStatusBadge, ServiceOrderStatusBadge } from "@/components/ui/status-badge";

type QuotePageProps = {
  params: Promise<{
    serviceOrderId: string;
  }>;
};

async function getPageData(serviceOrderId: string) {
  const context = await requireAuthenticatedContextOrRedirect();

  try {
    const [serviceOrder, diagnostic, quote] = await Promise.all([
      getServiceOrderDetails(context, serviceOrderId),
      getDiagnosticForServiceOrder(context, serviceOrderId),
      getQuoteForServiceOrder(context, serviceOrderId)
    ]);

    return {
      context,
      serviceOrder,
      diagnostic,
      quote
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function QuotePage({ params }: QuotePageProps) {
  const { serviceOrderId } = await params;
  const { context, serviceOrder, diagnostic, quote } =
    await getPageData(serviceOrderId);
  const canManageCommercialFlow =
    context.role === UserRole.OWNER || context.role === UserRole.ADMIN;
  const createAction = createQuoteAction.bind(null, serviceOrder.id);
  const addItemAction = addQuoteItemAction.bind(null, serviceOrder.id);
  const sendAction = sendQuoteAction.bind(null, serviceOrder.id);
  const approveAction = approveQuoteAction.bind(null, serviceOrder.id);
  const rejectAction = rejectQuoteAction.bind(null, serviceOrder.id);

  return (
    <div className="page-stack">
      <PageHeader eyebrow={serviceOrder.publicCode} title="Orçamento" description={`${serviceOrder.customer.name} · ${serviceOrder.equipment.brand} ${serviceOrder.equipment.model}`} actions={<ServiceOrderStatusBadge status={serviceOrder.status} label={formatServiceOrderStatus(serviceOrder.status)} />} />

      <dl className="surface-card grid gap-5 p-5 md:grid-cols-2 sm:p-6">
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
          <dt className="text-sm font-medium text-slate-500">Diagnóstico</dt>
          <dd className="mt-1 whitespace-pre-wrap text-base text-slate-950">
            {diagnostic?.description ?? "Diagnóstico ainda não registrado."}
          </dd>
        </div>
      </dl>

      {!diagnostic ? (
        <div className="alert-warning p-5">
          <p className="text-sm font-semibold text-amber-900">
            Registre o diagnóstico antes de criar o orçamento.
          </p>
          <Link
            href={`/app/service-orders/${serviceOrder.id}/diagnostic`}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-md border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
          >
            Ir para diagnóstico
          </Link>
        </div>
      ) : null}

      {diagnostic && !quote ? (
        <div className="surface-card p-5 sm:p-6">
          <h3 className="text-xl font-bold text-slate-950">
            Orçamento ainda não criado
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Crie um rascunho para incluir os serviços e peças. Você poderá revisar os itens antes de disponibilizar o orçamento ao cliente.
          </p>
          <div className="mt-4">
            <QuoteCommandForm
              action={createAction}
              label="Criar orçamento"
              pendingLabel="Criando..."
            />
          </div>
        </div>
      ) : null}

      {quote ? (
        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-950">
                Itens do orçamento
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Status: {formatQuoteStatus(quote.status)}.
              </p>
              {quote.status === "SENT" ? (
                <p className="mt-2 text-sm text-slate-600">
                  Aguardando a decisão do cliente pelo portal ou o registro da resposta recebida pela equipe.
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-right dark:border-brand-900/70 dark:bg-brand-950/30">
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300">Total</p>
              <p className="mt-1 text-2xl font-bold text-brand-950 dark:text-brand-100">
                {formatMoneyBRL(quote.total)}
              </p>
            </div>
          </div>

          <div className="mt-4"><QuoteStatusBadge status={quote.status} label={formatQuoteStatus(quote.status)} /></div>
          <div className="data-table-wrap mt-5">
            {quote.items.length > 0 ? (
              <div>
                <table className="responsive-data-table w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Quantidade
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Valor unitário
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Subtotal
                      </th>
                      {quote.status === "DRAFT" ? (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                          Acoes
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {quote.items.map((item) => {
                      const removeAction = removeQuoteItemAction.bind(
                        null,
                        serviceOrder.id,
                        item.id
                      );

                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-4 align-top text-sm font-semibold text-slate-950">
                            {item.description}
                          </td>
                          <td data-label="Quantidade" className="px-4 py-4 align-top text-sm text-slate-700">
                            {item.quantity}
                          </td>
                          <td data-label="Valor unitário" className="px-4 py-4 align-top text-sm text-slate-700">
                            {formatMoneyBRL(item.unitPrice)}
                          </td>
                          <td data-label="Subtotal" className="px-4 py-4 align-top text-sm font-semibold text-slate-950">
                            {formatMoneyBRL(item.subtotal)}
                          </td>
                          {quote.status === "DRAFT" ? (
                            <td className="px-4 py-4 align-top text-sm">
                              <div className="flex flex-wrap items-center gap-3">
                                <Link
                                  href={`/app/service-orders/${serviceOrder.id}/quote/items/${item.id}/edit`}
                                  className="font-semibold text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                                >
                                  Editar
                                </Link>
                                <QuoteCommandForm
                                  action={removeAction}
                                  label="Remover item"
                                  pendingLabel="Removendo..."
                                  variant="danger"
                                />
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-sm text-slate-600">
                Adicione o primeiro serviço ou peça no formulário abaixo. O orçamento precisa de pelo menos um item para ser disponibilizado.
              </div>
            )}
          </div>

          {quote.status === "DRAFT" ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="surface-card p-5">
                <h4 className="text-lg font-bold text-slate-950">
                  Adicionar item
                </h4>
                <div className="mt-5">
                  <QuoteItemForm
                    action={addItemAction}
                    submitLabel="Adicionar item"
                    pendingLabel="Adicionando..."
                  />
                </div>
              </div>

              {canManageCommercialFlow ? (
                <div className="surface-card p-5">
                  <h4 className="text-lg font-bold text-slate-950">
                    Disponibilizar ao cliente
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Confira os itens e compartilhe o link do portal com o cliente. Esta ação libera a decisão no portal e coloca a ordem em espera pela aprovação. Nenhum email ou mensagem é enviado automaticamente.
                  </p>
                  <div className="mt-4">
                    <QuoteCommandForm
                      action={sendAction}
                      label="Disponibilizar orçamento"
                      pendingLabel="Disponibilizando..."
                      disabled={quote.items.length === 0}
                      confirmation="Disponibilizar este orçamento? Os itens não poderão mais ser editados. O cliente poderá aprovar ou rejeitar pelo portal; compartilhe o link com ele."
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {quote.status === "SENT" && canManageCommercialFlow ? (
            <div className="surface-card p-5">
              <h4 className="text-lg font-bold text-slate-950">
                Decisao do orçamento
              </h4>
              <div className="mt-4 flex flex-wrap gap-3">
                <QuoteCommandForm
                  action={approveAction}
                  label="Registrar aprovação"
                  pendingLabel="Registrando..."
                  confirmation="Registrar a aprovação informada pelo cliente? A ordem ficará aprovada para seguir para manutenção."
                />
                <QuoteCommandForm
                  action={rejectAction}
                  label="Registrar rejeição"
                  pendingLabel="Registrando..."
                  variant="danger"
                  confirmation="Registrar a rejeição informada pelo cliente? Esta decisão ficará no histórico do orçamento."
                />
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-6">
        {quote && quote.status !== "DRAFT" ? <div className="surface-card-muted mb-5 p-5"><h2 className="font-semibold">{quote.status === "APPROVED" ? "Orçamento aprovado" : quote.status === "REJECTED" ? "Orçamento rejeitado" : "Compartilhe o acompanhamento"}</h2><p className="mt-2 text-sm muted-text">{quote.status === "APPROVED" ? "Volte à ordem para consultar as próximas etapas da manutenção." : quote.status === "REJECTED" ? "Combine os próximos passos com o cliente e acompanhe a situação na ordem." : "Abra o portal e copie o endereço para compartilhar com o cliente."}</p><Link href={`/track/${serviceOrder.publicCode}`} className="button-secondary mt-4" target="_blank" rel="noreferrer">Abrir portal do cliente (nova aba)</Link></div> : null}
        <Link
          href={`/app/service-orders/${serviceOrder.id}`}
          className="font-semibold text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          Voltar para ordem de serviço
        </Link>
      </div>
    </div>
  );
}
