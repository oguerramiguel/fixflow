import Link from "next/link";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import { formatMoneyBRL } from "@/app/app/format";
import { getQuoteForServiceOrder } from "@/server/services/quote-service";
import { updateQuoteItemAction } from "../../../actions";
import { QuoteItemForm } from "../../../quote-item-form";

type EditQuoteItemPageProps = {
  params: Promise<{
    serviceOrderId: string;
    quoteItemId: string;
  }>;
};

async function getPageData(serviceOrderId: string, quoteItemId: string) {
  const context = await requireAuthenticatedContextOrRedirect();

  try {
    const quote = await getQuoteForServiceOrder(context, serviceOrderId);
    const item = quote?.items.find((quoteItem) => quoteItem.id === quoteItemId);

    if (!quote || !item) {
      notFound();
    }

    return {
      quote,
      item
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function EditQuoteItemPage({
  params
}: EditQuoteItemPageProps) {
  const { serviceOrderId, quoteItemId } = await params;
  const { quote, item } = await getPageData(serviceOrderId, quoteItemId);
  const action = updateQuoteItemAction.bind(null, serviceOrderId, item.id);

  return (
    <section>
      <div>
        <h2 className="text-2xl font-bold text-slate-950">
          Editar item do orcamento
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Total atual: {formatMoneyBRL(quote.total)}.
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
        {quote.status === "DRAFT" ? (
          <QuoteItemForm
            action={action}
            submitLabel="Salvar item"
            pendingLabel="Salvando..."
            cancelHref={`/app/service-orders/${serviceOrderId}/quote`}
            initialValues={{
              description: item.description,
              quantity: String(item.quantity),
              unitPrice: item.unitPrice
            }}
          />
        ) : (
          <div>
            <p className="text-sm text-slate-600">
              Itens nao podem ser alterados depois que o orcamento sai do
              rascunho.
            </p>
            <Link
              href={`/app/service-orders/${serviceOrderId}/quote`}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              Voltar
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
