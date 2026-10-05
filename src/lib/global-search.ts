export type SearchResult = {
  kind: "customer" | "equipment" | "service-order";
  label: string;
  description: string;
  href: string;
};

export const searchKindLabels: Record<SearchResult["kind"], string> = {
  customer: "Cliente",
  equipment: "Equipamento",
  "service-order": "Ordem de serviço"
};

export function normalizeSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export const quickCommands = [
  { label: "Nova ordem", href: "/app/service-orders/new" },
  { label: "Novo cliente", href: "/app/customers/new" },
  { label: "Novo equipamento", href: "/app/equipment/new" },
  { label: "Ir para Dashboard", href: "/app" },
  { label: "Ir para Ordens", href: "/app/service-orders" },
  { label: "Ir para Clientes", href: "/app/customers" },
  { label: "Ir para Equipamentos", href: "/app/equipment" },
  { label: "Minha conta", href: "/app/settings/account" }
];
