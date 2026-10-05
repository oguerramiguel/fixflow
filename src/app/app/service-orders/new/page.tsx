import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthenticatedContextOrRedirect } from "@/app/app/auth";
import { buildListHref, readPageSearchParam, readSearchParams, readStringSearchParam, type PageSearchParams } from "@/app/app/list-links";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { DomainError } from "@/domain/errors/domain-error";
import { getCustomerDetails, listCustomersForOrganization } from "@/server/services/customer-service";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/primitives";

export default async function NewServiceOrderPage({ searchParams }: { searchParams?: PageSearchParams }) {
  const context = await requireAuthenticatedContextOrRedirect();
  const params = await readSearchParams(searchParams);
  const customerId = readStringSearchParam(params, "customerId");

  if (customerId) {
    const customer = await getCustomerDetails(context, customerId).catch((error: unknown) => {
      if (error instanceof NotFoundError) notFound();
      throw error;
    });
    return <div className="page-stack max-w-3xl">
      <PageHeader eyebrow="Nova ordem · Etapa 2 de 3" title="Escolha o equipamento" description={`Cliente: ${customer.name}. Depois, descreva o problema para abrir a ordem.`} actions={<Link href="/app/service-orders/new" className="button-secondary">Trocar cliente</Link>} />
      <section className="surface-card divide-y" aria-label="Equipamentos do cliente">
        {customer.equipment.length ? customer.equipment.map((item) => <article key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><h2 className="font-semibold">{item.brand} {item.model}</h2><p className="mt-1 text-sm muted-text">{item.serialNumber ? `Série: ${item.serialNumber}` : "Sem número de série"}</p></div>
          <Link href={`/app/equipment/${item.id}/service-orders/new`} className="button-primary" aria-label={`Selecionar ${item.brand} ${item.model}`}>Selecionar equipamento</Link>
        </article>) : <EmptyState title="Este cliente ainda não tem equipamentos" description="Cadastre o equipamento recebido para registrar o problema e abrir a ordem." action={<Link href={`/app/equipment/new?customerId=${customer.id}`} className="button-primary">Cadastrar equipamento</Link>} />}
      </section>
      {customer.equipment.length ? <Link href={`/app/equipment/new?customerId=${customer.id}`} className="button-secondary">Cadastrar outro equipamento</Link> : null}
    </div>;
  }

  const query = readStringSearchParam(params, "query");
  const page = readPageSearchParam(params);
  const { result, error } = await listCustomersForOrganization(context, { query, page })
    .then((result) => ({ result, error: undefined }))
    .catch((error: unknown) => {
      if (!(error instanceof DomainError)) throw error;
      return { result: { items: [], currentPage: 1, totalPages: 0, query }, error: error.message };
    });

  return <div className="page-stack max-w-3xl">
    <PageHeader eyebrow="Nova ordem · Etapa 1 de 3" title="Quem trouxe o equipamento?" description="Escolha o cliente, selecione o equipamento e descreva o problema." actions={<Link href="/app/customers/new" className="button-secondary">Novo cliente</Link>} />
    <form action="/app/service-orders/new" className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1"><label htmlFor="order-customer-query" className="form-label">Buscar cliente</label><input id="order-customer-query" type="search" name="query" maxLength={100} defaultValue={query ?? ""} placeholder="Nome, email ou telefone" className="form-input" /></div>
      <button type="submit" className="button-secondary">Buscar</button>
      {query ? <Link href="/app/service-orders/new" className="button-ghost">Limpar</Link> : null}
    </form>
    {error ? <p role="alert" className="alert-error">{error}</p> : null}
    <section className="surface-card divide-y" aria-label="Escolher cliente">
      {result.items.length ? result.items.map((customer) => <article key={customer.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><h2 className="font-semibold">{customer.name}</h2><p className="mt-1 text-sm muted-text">{customer.phone}</p></div>
        <Link href={`/app/service-orders/new?customerId=${customer.id}`} className="button-primary" aria-label={`Selecionar ${customer.name}`}>Selecionar cliente</Link>
      </article>) : <EmptyState title={query ? "Nenhum cliente corresponde à busca" : "Cadastre o primeiro cliente"} description={query ? "Confira o nome ou telefone. Se for um novo cliente, cadastre-o para continuar." : "A ordem será vinculada ao equipamento de um cliente cadastrado."} action={<Link href="/app/customers/new" className="button-primary">Cadastrar cliente</Link>} />}
    </section>
    <Pagination><p className="text-sm muted-text">Página {result.currentPage}{result.totalPages ? ` de ${result.totalPages}` : ""}</p><div className="flex gap-2">
      {result.currentPage > 1 ? <Link className="button-secondary" href={buildListHref("/app/service-orders/new", { query, page: result.currentPage - 1 })}>Anterior</Link> : null}
      {result.currentPage < result.totalPages ? <Link className="button-secondary" href={buildListHref("/app/service-orders/new", { query, page: result.currentPage + 1 })}>Próxima</Link> : null}
    </div></Pagination>
  </div>;
}
