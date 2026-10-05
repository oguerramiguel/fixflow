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
        <h1 className="page-title">
          Editar item do orçamento
        </h1>
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
              Itens não podem ser alterados depois que o orçamento sai do
              rascunho.
            </p>
            <Link
              href={`/app/service-orders/${serviceOrderId}/quote`}
              className="button-secondary mt-4"
            >
              Voltar
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
