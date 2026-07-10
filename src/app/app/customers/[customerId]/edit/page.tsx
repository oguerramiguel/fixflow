import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import {
  updateCustomerAction,
  type CustomerFormValues
} from "@/app/app/customers/actions";
import { CustomerForm } from "@/app/app/customers/customer-form";
import { getCustomerDetails } from "@/server/services/customer-service";

type EditCustomerPageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

async function getCustomerOrNotFound(customerId: string) {
  const context = await requireAuthenticatedContextOrRedirect();

  try {
    return await getCustomerDetails(context, customerId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function EditCustomerPage({
  params
}: EditCustomerPageProps) {
  const { customerId } = await params;
  const customer = await getCustomerOrNotFound(customerId);
  const action = updateCustomerAction.bind(null, customer.id);
  const initialValues: CustomerFormValues = {
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone,
    document: customer.document ?? ""
  };

  return (
    <section className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-950">Editar cliente</h2>
        <p className="mt-2 text-sm text-slate-600">{customer.name}</p>
      </div>

      <CustomerForm
        action={action}
        initialValues={initialValues}
        submitLabel="Salvar alteracoes"
        pendingLabel="Salvando..."
        cancelHref={`/app/customers/${customer.id}`}
      />
    </section>
  );
}
