import Link from "next/link";
import { requireAuthenticatedContextOrRedirect, requireCurrentUserOrRedirect } from "@/app/app/auth";
import { formatDate } from "@/app/app/format";
import { ArrowUpRightIcon, CheckIcon, ClockIcon, CustomersIcon, EquipmentIcon, ServiceOrderIcon, TrendIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { ServiceOrderStatusBadge } from "@/components/ui/status-badge";
import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import { getDashboardForOrganization } from "@/server/services/dashboard-service";

const statusColors: Record<ServiceOrderStatus, string> = {
  RECEIVED: "bg-slate-400",
  IN_DIAGNOSIS: "bg-blue-500",
  WAITING_FOR_APPROVAL: "bg-amber-500",
  APPROVED: "bg-violet-500",
  IN_REPAIR: "bg-brand-600",
  FINAL_TESTING: "bg-indigo-500",
  READY_FOR_PICKUP: "bg-amber-400",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-red-500"
};

function MetricCard({ label, value, detail, icon: Icon, tone = "brand" }: { label: string; value: string | number; detail: string; icon: typeof ServiceOrderIcon; tone?: "brand" | "warning" | "success" | "neutral" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
    warning: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
  };

  return (
    <article className="surface-card p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium muted-text">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950 dark:text-slate-50">{value}</p>
        </div>
        <span className={`flex size-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="size-5" /></span>
      </div>
      <p className="mt-3 text-xs leading-5 muted-text">{detail}</p>
    </article>
  );
}

export default async function AppPage() {
  const [context, currentUser] = await Promise.all([
    requireAuthenticatedContextOrRedirect(),
    requireCurrentUserOrRedirect()
  ]);
  const dashboard = await getDashboardForOrganization(context);
  const maxMonthlyVolume = Math.max(...dashboard.monthlyVolume.map((month) => month.count), 1);
  const totalDistributed = dashboard.statusDistribution.reduce((total, item) => total + item.count, 0);
  const firstName = currentUser.name.trim().split(/\s+/)[0] ?? currentUser.name;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Visão geral"
        title={`Olá, ${firstName}`}
        description="Acompanhe o ritmo da operação e os atendimentos que precisam de atenção."
        actions={<Link href="/app/service-orders" className="button-primary">Ver ordens <ArrowUpRightIcon className="size-4" /></Link>}
      />

      <section aria-label="Indicadores principais" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ordens abertas" value={dashboard.metrics.openServiceOrders} detail="Exclui concluídas e canceladas" icon={ServiceOrderIcon} />
        <MetricCard label="Aguardando aprovação" value={dashboard.metrics.waitingForApproval} detail="Orçamentos esperando o cliente" icon={ClockIcon} tone="warning" />
        <MetricCard label="Em andamento" value={dashboard.metrics.inProgress} detail="Da aprovação até a retirada" icon={TrendIcon} />
        <MetricCard label="Concluídas" value={dashboard.metrics.completed} detail="Total histórico da organização" icon={CheckIcon} tone="success" />
      </section>

      <section aria-label="Cadastros e conversão" className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Clientes" value={dashboard.metrics.customers} detail="Cadastros ativos na organização" icon={CustomersIcon} tone="neutral" />
        <MetricCard label="Equipamentos" value={dashboard.metrics.equipment} detail="Equipamentos vinculados" icon={EquipmentIcon} tone="neutral" />
        <MetricCard label="Aprovação de orçamentos" value={dashboard.metrics.quoteApprovalRate === null ? "—" : `${dashboard.metrics.quoteApprovalRate}%`} detail={dashboard.metrics.quoteApprovalRate === null ? "Nenhum orçamento decidido" : "Entre orçamentos aprovados e rejeitados"} icon={TrendIcon} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <section className="surface-card p-5 sm:p-6" aria-labelledby="volume-title">
          <div className="flex items-start justify-between gap-4">
            <div><h2 id="volume-title" className="section-title">Volume de ordens</h2><p className="mt-1 text-sm muted-text">Ordens abertas nos últimos seis meses</p></div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">6 meses</span>
          </div>
          <div className="mt-8 grid h-56 grid-cols-6 items-end gap-2 sm:gap-4" role="img" aria-label={`Volume mensal: ${dashboard.monthlyVolume.map((month) => `${month.label}, ${month.count}`).join("; ")}`}>
            {dashboard.monthlyVolume.map((month) => (
              <div key={month.key} className="flex h-full min-w-0 flex-col justify-end gap-2">
                <span className="text-center text-xs font-semibold text-slate-700 dark:text-slate-200">{month.count}</span>
                <div className="group relative mx-auto flex h-[170px] w-full max-w-14 items-end overflow-hidden rounded-t-xl bg-slate-100 dark:bg-slate-800">
                  <div className="w-full rounded-t-xl bg-gradient-to-t from-brand-700 to-brand-400 transition-[height] duration-500 group-hover:from-brand-600 group-hover:to-brand-300" style={{ height: `${Math.max((month.count / maxMonthlyVolume) * 100, month.count > 0 ? 7 : 1)}%` }} />
                </div>
                <span className="truncate text-center text-xs capitalize muted-text">{month.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card p-5 sm:p-6" aria-labelledby="distribution-title">
          <h2 id="distribution-title" className="section-title">Distribuição por status</h2>
          <p className="mt-1 text-sm muted-text">Visão atual de todas as ordens</p>
          {dashboard.statusDistribution.length > 0 ? (
            <div className="mt-6 space-y-4">
              {dashboard.statusDistribution.map((item) => {
                const percentage = totalDistributed === 0 ? 0 : Math.round((item.count / totalDistributed) * 100);
                return (
                  <div key={item.status}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-medium text-slate-700 dark:text-slate-200"><span className={`size-2.5 shrink-0 rounded-full ${statusColors[item.status]}`} /> <span className="truncate">{item.label}</span></span><span className="font-semibold text-slate-950 dark:text-slate-50">{item.count}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${statusColors[item.status]}`} style={{ width: `${percentage}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyState title="Sem ordens ainda" description="A distribuição aparecerá quando a primeira ordem for criada." />}
        </section>
      </div>

      <section className="data-table-wrap" aria-labelledby="recent-title">
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <div><h2 id="recent-title" className="section-title">Ordens recentes</h2><p className="mt-1 text-sm muted-text">Últimos atendimentos cadastrados</p></div>
          <Link href="/app/service-orders" className="text-link text-sm">Ver todas</Link>
        </div>
        {dashboard.recentServiceOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[720px]">
              <thead><tr><th>Ordem</th><th>Cliente</th><th>Equipamento</th><th>Status</th><th>Entrada</th></tr></thead>
              <tbody>{dashboard.recentServiceOrders.map((order) => (
                <tr key={order.id}>
                  <td><Link href={`/app/service-orders/${order.id}`} className="text-link">{order.publicCode}</Link></td>
                  <td className="font-medium !text-slate-900 dark:!text-slate-100">{order.customerName}</td>
                  <td>{order.equipmentName}</td>
                  <td><ServiceOrderStatusBadge status={order.status} label={order.statusLabel} /></td>
                  <td>{formatDate(order.createdAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState title="Nenhuma ordem cadastrada" description="As ordens mais recentes aparecerão aqui." action={<Link href="/app/equipment" className="button-primary">Criar primeira ordem</Link>} />}
      </section>
    </div>
  );
}
