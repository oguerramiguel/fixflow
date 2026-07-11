import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import type { QuoteStatus } from "@/domain/entities/quote";
import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import {
  calculateQuoteItemSubtotal,
  calculateQuoteTotal,
  toCanonicalMoneyString,
  type MoneyDecimal
} from "@/domain/services/money";
import { normalizeServiceOrderPublicCode } from "@/domain/services/public-code";
import { getQuoteStatusLabel } from "@/domain/services/quote-status-labels";
import { assertQuoteStatusTransition } from "@/domain/services/quote-workflow";
import {
  createPublicQuoteApprovedTimelineDescription,
  createPublicQuoteRejectedTimelineDescription,
  createServiceOrderStatusChangedTimelineDescription,
  serviceOrderTimelineTypes,
  type ServiceOrderTimelineType
} from "@/domain/services/service-order-timeline";
import { getServiceOrderStatusLabel } from "@/domain/services/service-order-status-labels";
import {
  findPublicServiceOrderByPublicCode,
  findPublicServiceOrderDecisionByPublicCode,
  transitionPublicQuoteDecision,
  type PublicQuoteDecisionTransitionInput,
  type PublicServiceOrderDecisionRecord,
  type PublicServiceOrderRecord
} from "@/server/repositories/public-service-order-repository";

export const PUBLIC_SERVICE_ORDER_NOT_FOUND_MESSAGE =
  "Ordem de servico nao encontrada.";
export const PUBLIC_QUOTE_DECISION_UNAVAILABLE_MESSAGE =
  "Este orcamento nao esta disponivel para decisao.";
export const PUBLIC_QUOTE_DECISION_CONFLICT_MESSAGE =
  "Este orcamento ja foi atualizado. Recarregue a pagina para ver o estado atual.";

const publicQuoteStatuses = new Set<QuoteStatus>([
  "SENT",
  "APPROVED",
  "REJECTED"
]);

export type PublicEquipmentDto = {
  type: string;
  typeLabel: string;
  brand: string;
  model: string;
};

export type PublicQuoteItemDto = {
  description: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
};

export type PublicQuoteDto = {
  status: QuoteStatus;
  statusLabel: string;
  items: PublicQuoteItemDto[];
  total: string;
  canDecide: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicTimelineEventDto = {
  description: string;
  createdAt: Date;
};

export type PublicServiceOrderDetailsDto = {
  publicCode: string;
  status: ServiceOrderStatus;
  statusLabel: string;
  reportedIssue: string;
  createdAt: Date;
  updatedAt: Date;
  equipment: PublicEquipmentDto;
  quote: PublicQuoteDto | null;
  timeline: PublicTimelineEventDto[];
};

type PublicQuoteItemMoneyRecord = {
  description: string;
  quantity: number;
  unitPrice: MoneyDecimal;
};

type PublicQuoteDecisionTimeline = {
  type: ServiceOrderTimelineType;
  description: string;
};

export type PublicTrackingServiceDependencies = {
  findPublicServiceOrderByPublicCode(
    publicCode: string
  ): Promise<PublicServiceOrderRecord | null>;
  findPublicServiceOrderDecisionByPublicCode(
    publicCode: string
  ): Promise<PublicServiceOrderDecisionRecord | null>;
  transitionPublicQuoteDecision(
    input: PublicQuoteDecisionTransitionInput
  ): Promise<boolean>;
};

const defaultPublicTrackingServiceDependencies: PublicTrackingServiceDependencies =
  {
    findPublicServiceOrderByPublicCode,
    findPublicServiceOrderDecisionByPublicCode,
    transitionPublicQuoteDecision
  };

function normalizePublicCodeOrThrow(publicCodeInput: string): string {
  const publicCode = normalizeServiceOrderPublicCode(publicCodeInput);

  if (!publicCode) {
    throw new NotFoundError(PUBLIC_SERVICE_ORDER_NOT_FOUND_MESSAGE);
  }

  return publicCode;
}

function getEquipmentTypeLabel(type: string): string {
  switch (type) {
    case "NOTEBOOK":
      return "Notebook";
    case "DESKTOP":
      return "Desktop";
    default:
      return "Outro";
  }
}

function mapPublicQuoteItem(
  record: PublicQuoteItemMoneyRecord
): PublicQuoteItemDto {
  const subtotal = calculateQuoteItemSubtotal({
    quantity: record.quantity,
    unitPrice: record.unitPrice
  });

  return {
    description: record.description,
    quantity: record.quantity,
    unitPrice: toCanonicalMoneyString(record.unitPrice),
    subtotal: toCanonicalMoneyString(subtotal)
  };
}

function mapPublicQuote(record: PublicServiceOrderRecord): PublicQuoteDto | null {
  if (!record.quote || !publicQuoteStatuses.has(record.quote.status)) {
    return null;
  }

  const total = calculateQuoteTotal(record.quote.items);

  return {
    status: record.quote.status,
    statusLabel: getQuoteStatusLabel(record.quote.status),
    items: record.quote.items.map(mapPublicQuoteItem),
    total: toCanonicalMoneyString(total),
    canDecide:
      record.quote.status === "SENT" && record.status === "WAITING_FOR_APPROVAL",
    createdAt: record.quote.createdAt,
    updatedAt: record.quote.updatedAt
  };
}

function mapPublicTimelineDescription(
  type: string
): string | null {
  switch (type) {
    case serviceOrderTimelineTypes.serviceOrderCreated:
      return "Ordem de servico registrada.";
    case serviceOrderTimelineTypes.statusChanged:
      return "Status da ordem de servico atualizado.";
    case serviceOrderTimelineTypes.diagnosticRecorded:
      return "Diagnostico tecnico registrado.";
    case serviceOrderTimelineTypes.diagnosticUpdated:
      return "Diagnostico tecnico atualizado.";
    case serviceOrderTimelineTypes.quoteCreated:
      return null;
    case serviceOrderTimelineTypes.quoteSent:
      return "Orcamento disponibilizado para analise.";
    case serviceOrderTimelineTypes.quoteApproved:
      return "Orcamento aprovado.";
    case serviceOrderTimelineTypes.quoteRejected:
      return "Orcamento rejeitado.";
    default:
      return null;
  }
}

function mapPublicServiceOrder(
  record: PublicServiceOrderRecord
): PublicServiceOrderDetailsDto {
  return {
    publicCode: record.publicCode,
    status: record.status,
    statusLabel: getServiceOrderStatusLabel(record.status),
    reportedIssue: record.reportedIssue,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    equipment: {
      type: record.equipment.type,
      typeLabel: getEquipmentTypeLabel(record.equipment.type),
      brand: record.equipment.brand,
      model: record.equipment.model
    },
    quote: mapPublicQuote(record),
    timeline: record.timeline.flatMap((event) => {
      const description = mapPublicTimelineDescription(event.type);

      return description
        ? [
            {
              description,
              createdAt: event.createdAt
            }
          ]
        : [];
    })
  };
}

async function loadDecisionRecordOrThrow(
  publicCodeInput: string,
  dependencies: PublicTrackingServiceDependencies
): Promise<PublicServiceOrderDecisionRecord> {
  const publicCode = normalizePublicCodeOrThrow(publicCodeInput);
  const serviceOrder =
    await dependencies.findPublicServiceOrderDecisionByPublicCode(publicCode);

  if (!serviceOrder) {
    throw new NotFoundError(PUBLIC_SERVICE_ORDER_NOT_FOUND_MESSAGE);
  }

  return serviceOrder;
}

async function decidePublicQuote(
  publicCodeInput: string,
  input: {
    targetQuoteStatus: "APPROVED" | "REJECTED";
    targetServiceOrderStatus: "APPROVED" | "CANCELLED";
    quoteTimeline: PublicQuoteDecisionTimeline;
  },
  dependencies: PublicTrackingServiceDependencies
): Promise<void> {
  const serviceOrder = await loadDecisionRecordOrThrow(
    publicCodeInput,
    dependencies
  );

  if (!serviceOrder.quote) {
    throw new DomainError(PUBLIC_QUOTE_DECISION_UNAVAILABLE_MESSAGE);
  }

  if (
    serviceOrder.quote.status !== "SENT" ||
    serviceOrder.status !== "WAITING_FOR_APPROVAL"
  ) {
    throw new DomainError(PUBLIC_QUOTE_DECISION_UNAVAILABLE_MESSAGE);
  }

  assertQuoteStatusTransition(serviceOrder.quote.status, input.targetQuoteStatus);

  const transitioned = await dependencies.transitionPublicQuoteDecision({
    serviceOrderId: serviceOrder.id,
    organizationId: serviceOrder.organizationId,
    quoteId: serviceOrder.quote.id,
    expectedQuoteStatus: "SENT",
    targetQuoteStatus: input.targetQuoteStatus,
    expectedServiceOrderStatus: "WAITING_FOR_APPROVAL",
    targetServiceOrderStatus: input.targetServiceOrderStatus,
    quoteTimeline: input.quoteTimeline,
    serviceOrderTimeline: {
      type: serviceOrderTimelineTypes.statusChanged,
      description: createServiceOrderStatusChangedTimelineDescription(
        "WAITING_FOR_APPROVAL",
        input.targetServiceOrderStatus
      )
    }
  });

  if (!transitioned) {
    throw new ConflictError(PUBLIC_QUOTE_DECISION_CONFLICT_MESSAGE);
  }
}

export async function getPublicServiceOrderByCode(
  publicCodeInput: string,
  dependencies = defaultPublicTrackingServiceDependencies
): Promise<PublicServiceOrderDetailsDto> {
  const publicCode = normalizePublicCodeOrThrow(publicCodeInput);
  const serviceOrder = await dependencies.findPublicServiceOrderByPublicCode(
    publicCode
  );

  if (!serviceOrder) {
    throw new NotFoundError(PUBLIC_SERVICE_ORDER_NOT_FOUND_MESSAGE);
  }

  return mapPublicServiceOrder(serviceOrder);
}

export async function approvePublicQuote(
  publicCodeInput: string,
  dependencies = defaultPublicTrackingServiceDependencies
): Promise<void> {
  await decidePublicQuote(
    publicCodeInput,
    {
      targetQuoteStatus: "APPROVED",
      targetServiceOrderStatus: "APPROVED",
      quoteTimeline: {
        type: serviceOrderTimelineTypes.quoteApproved,
        description: createPublicQuoteApprovedTimelineDescription()
      }
    },
    dependencies
  );
}

export async function rejectPublicQuote(
  publicCodeInput: string,
  dependencies = defaultPublicTrackingServiceDependencies
): Promise<void> {
  await decidePublicQuote(
    publicCodeInput,
    {
      targetQuoteStatus: "REJECTED",
      targetServiceOrderStatus: "CANCELLED",
      quoteTimeline: {
        type: serviceOrderTimelineTypes.quoteRejected,
        description: createPublicQuoteRejectedTimelineDescription()
      }
    },
    dependencies
  );
}
