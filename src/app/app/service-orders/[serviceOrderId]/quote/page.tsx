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
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            {serviceOrder.publicCode}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Orcamento
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
          <dt className="text-sm font-medium text-slate-500">Diagnostico</dt>
          <dd className="mt-1 whitespace-pre-wrap text-base text-slate-950">
            {diagnostic?.description ?? "Diagnostico ainda nao registrado."}
          </dd>
        </div>
      </dl>

      {!diagnostic ? (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">
            Registre o diagnostico antes de criar o orcamento.
          </p>
          <Link
            href={`/app/service-orders/${serviceOrder.id}/diagnostic`}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-md border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
          >
            Ir para diagnostico
          </Link>
        </div>
      ) : null}

      {diagnostic && !quote ? (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-xl font-bold text-slate-950">
            Orcamento ainda nao criado
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            A criacao do rascunho ocorre somente por acao explicita.
          </p>
          <div className="mt-4">
            <QuoteCommandForm
              action={createAction}
              label="Criar orcamento"
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
                Itens do orcamento
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Status: {formatQuoteStatus(quote.status)}.
              </p>
              {quote.status === "SENT" ? (
                <p className="mt-2 text-sm text-slate-600">
                  Aguardando registro interno da decisao do cliente.
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
              <p className="text-sm font-medium text-emerald-800">Total</p>
              <p className="mt-1 text-2xl font-bold text-emerald-950">
                {formatMoneyBRL(quote.total)}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {quote.items.length > 0 ? (
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
                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                            {formatMoneyBRL(item.unitPrice)}
                          </td>
                          <td className="px-4 py-4 align-top text-sm font-semibold text-slate-950">
                            {formatMoneyBRL(item.subtotal)}
                          </td>
                          {quote.status === "DRAFT" ? (
                            <td className="px-4 py-4 align-top text-sm">
                              <div className="flex flex-wrap items-center gap-3">
                                <Link
                                  href={`/app/service-orders/${serviceOrder.id}/quote/items/${item.id}/edit`}
                                  className="font-semibold text-emerald-700 hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
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
                Nenhum item cadastrado.
              </div>
            )}
          </div>

          {quote.status === "DRAFT" ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="rounded-lg border border-slate-200 bg-white p-5">
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
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <h4 className="text-lg font-bold text-slate-950">
                    Envio logico
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Registra que o orcamento foi enviado ao cliente por processo
                    externo.
                  </p>
                  <div className="mt-4">
                    <QuoteCommandForm
                      action={sendAction}
                      label="Marcar orcamento como enviado"
                      pendingLabel="Enviando..."
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {quote.status === "SENT" && canManageCommercialFlow ? (
            <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
              <h4 className="text-lg font-bold text-slate-950">
                Decisao do orcamento
              </h4>
              <div className="mt-4 flex flex-wrap gap-3">
                <QuoteCommandForm
                  action={approveAction}
                  label="Registrar aprovacao"
                  pendingLabel="Registrando..."
                />
                <QuoteCommandForm
                  action={rejectAction}
                  label="Registrar rejeicao"
                  pendingLabel="Registrando..."
                  variant="danger"
                />
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

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
