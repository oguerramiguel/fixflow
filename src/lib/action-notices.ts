export const actionNotices = {
  "customer-created": "Cliente cadastrado. Agora você pode vincular um equipamento.",
  "customer-updated": "Cadastro do cliente atualizado.",
  "equipment-created": "Equipamento cadastrado. Você já pode abrir uma ordem de serviço.",
  "equipment-updated": "Equipamento atualizado.",
  "order-created": "Ordem criada. Inicie o diagnóstico para continuar o atendimento.",
  "status-updated": "Status da ordem atualizado. A mudança foi registrada no histórico.",
  "diagnostic-saved": "Diagnóstico salvo. Confira o orçamento para continuar.",
  "quote-created": "Rascunho criado. Adicione os serviços e peças do orçamento.",
  "item-added": "Item adicionado ao orçamento.",
  "item-updated": "Item do orçamento atualizado.",
  "item-removed": "Item removido do orçamento.",
  "quote-sent": "Orçamento disponibilizado no portal. Compartilhe o link com o cliente.",
  "quote-approved": "Aprovação registrada. Consulte a ordem para iniciar a manutenção.",
  "quote-rejected": "Rejeição registrada. Consulte a ordem para acompanhar o atendimento."
} as const;

export function getActionNotice(value: string | null): string | undefined {
  return value && Object.hasOwn(actionNotices, value) ? actionNotices[value as keyof typeof actionNotices] : undefined;
}
