import { CustomerForm } from "@/app/app/customers/customer-form";
import { createCustomerAction } from "@/app/app/customers/actions";

export default function NewCustomerPage() {
  return (
    <section className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-950">Novo cliente</h2>
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
