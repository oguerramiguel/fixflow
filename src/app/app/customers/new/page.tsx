import { CustomerForm } from "@/app/app/customers/customer-form";
import { createCustomerAction } from "@/app/app/customers/actions";

export default function NewCustomerPage() {
  return (
    <section className="max-w-3xl">
      <div className="mb-6">
        <h1 className="page-title">Novo cliente</h1>
        <p className="mt-2 text-sm text-slate-600">
          Cadastre os dados principais do cliente.
        </p>
      </div>

      <CustomerForm
        action={createCustomerAction}
        submitLabel="Salvar cliente"
        pendingLabel="Salvando..."
        cancelHref="/app/customers"
      />
    </section>
  );
}
