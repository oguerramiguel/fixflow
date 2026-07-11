import { UserRole } from "@prisma/client";
import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { QuoteStatus } from "@/domain/entities/quote";
import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import {
  calculateQuoteItemSubtotal,
  calculateQuoteTotal,
  isMoneyWithinLimit,
  toCanonicalMoneyString,
  ZERO_MONEY,
  type MoneyDecimal
} from "@/domain/services/money";
import {
  createQuoteItemValidationError,
  type QuoteItemField,
  type QuoteItemInput,
  validateQuoteItemInput
} from "@/domain/services/quote-item-validation";
import { getQuoteStatusLabel } from "@/domain/services/quote-status-labels";
import { assertQuoteStatusTransition } from "@/domain/services/quote-workflow";
import {
  createQuoteApprovedTimelineDescription,
  createQuoteCreatedTimelineDescription,
  createQuoteRejectedTimelineDescription,
  createQuoteSentTimelineDescription,
  createServiceOrderStatusChangedTimelineDescription,
  serviceOrderTimelineTypes
} from "@/domain/services/service-order-timeline";
import { requireRole } from "@/server/auth/authorization";
import type { AuthenticatedContext } from "@/server/auth/authenticated-context";
import {
  findDiagnosticByServiceOrder,
  type DiagnosticRecord
} from "@/server/repositories/diagnostic-repository";
import {
  addQuoteItem as addQuoteItemRecord,
  createDraftQuoteWithTimeline,
  findQuoteByServiceOrder,
  QuoteAlreadyExistsError,
  removeQuoteItem as removeQuoteItemRecord,
  transitionQuoteWithServiceOrder,
  updateQuoteItem as updateQuoteItemRecord,
  type CreateDraftQuoteRecordInput,
  type QuoteDetailsRecord,
  type QuoteItemRecord,
  type QuoteItemRecordInput,
  type TransitionQuoteWithServiceOrderInput
} from "@/server/repositories/quote-repository";
import {
  findServiceOrderById,
  type ServiceOrderDetailsRecord
} from "@/server/repositories/service-order-repository";
import type { TenantContext } from "@/server/repositories/tenant-context";

const QUOTE_CONFLICT_MESSAGE =
  "O orcamento foi alterado por outra operacao. Atualize a pagina e tente novamente.";

export type QuoteItemDto = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  createdAt: Date;
  updatedAt: Date;
};

export type QuoteDto = {
  id: string;
  serviceOrderId: string;
  status: QuoteStatus;
  statusLabel: string;
  items: QuoteItemDto[];
  total: string;
  createdAt: Date;
  updatedAt: Date;
};

type QuoteItemMoneyRecord = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: MoneyDecimal;
  createdAt: Date;
  updatedAt: Date;
};

export type QuoteServiceDependencies = {
  findServiceOrderById(
    context: TenantContext,
    serviceOrderId: string
  ): Promise<ServiceOrderDetailsRecord | null>;
  findDiagnosticByServiceOrder(
    context: TenantContext,
    serviceOrderId: string
  ): Promise<DiagnosticRecord | null>;
  findQuoteByServiceOrder(
    context: TenantContext,
    serviceOrderId: string
  ): Promise<QuoteDetailsRecord | null>;
  createDraftQuoteWithTimeline(
    context: TenantContext,
    input: CreateDraftQuoteRecordInput
  ): Promise<QuoteDetailsRecord>;
  addQuoteItem(
    context: TenantContext,
    quoteId: string,
    input: QuoteItemRecordInput
  ): Promise<QuoteItemRecord>;
  updateQuoteItem(
    context: TenantContext,
    quoteId: string,
    quoteItemId: string,
    input: QuoteItemRecordInput
  ): Promise<QuoteItemRecord | null>;
  removeQuoteItem(
    context: TenantContext,
    quoteId: string,
    quoteItemId: string
  ): Promise<boolean>;
  transitionQuoteWithServiceOrder(
    context: TenantContext,
    input: TransitionQuoteWithServiceOrderInput
  ): Promise<QuoteDetailsRecord | null>;
};

const defaultQuoteServiceDependencies: QuoteServiceDependencies = {
  findServiceOrderById,
  findDiagnosticByServiceOrder,
  findQuoteByServiceOrder,
  createDraftQuoteWithTimeline,
  addQuoteItem: addQuoteItemRecord,
  updateQuoteItem: updateQuoteItemRecord,
  removeQuoteItem: removeQuoteItemRecord,
  transitionQuoteWithServiceOrder
};

function mapQuoteItem(record: QuoteItemMoneyRecord): QuoteItemDto {
  const subtotal = calculateQuoteItemSubtotal({
    quantity: record.quantity,
    unitPrice: record.unitPrice
  });

  return {
    id: record.id,
    description: record.description,
    quantity: record.quantity,
    unitPrice: toCanonicalMoneyString(record.unitPrice),
    subtotal: toCanonicalMoneyString(subtotal),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function mapQuote(record: QuoteDetailsRecord): QuoteDto {
  const total = calculateQuoteTotal(record.items);

  return {
    id: record.id,
    serviceOrderId: record.serviceOrderId,
    status: record.status,
    statusLabel: getQuoteStatusLabel(record.status),
    items: record.items.map(mapQuoteItem),
    total: toCanonicalMoneyString(total),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function createTotalValidationError(
  message: string
): ValidationError<QuoteItemField> {
  return createQuoteItemValidationError({
    unitPrice: message
  });
}

function calculateTotalWithReplacement(
  quote: QuoteDetailsRecord,
  currentItem: QuoteItemMoneyRecord,
  nextItem: {
    quantity: number;
    unitPrice: MoneyDecimal;
  }
): MoneyDecimal {
  const currentTotal = calculateQuoteTotal(quote.items);
  const currentSubtotal = calculateQuoteItemSubtotal(currentItem);
  const nextSubtotal = calculateQuoteItemSubtotal(nextItem);

  return currentTotal.minus(currentSubtotal).plus(nextSubtotal);
}

function assertTotalWithinLimit(total: MoneyDecimal): void {
  if (!isMoneyWithinLimit(total)) {
    throw createTotalValidationError(
      "O total do orcamento ultrapassa o limite permitido."
    );
  }
}

function validateQuoteItemInputOrThrow(
  input: QuoteItemInput
): QuoteItemRecordInput {
  const validation = validateQuoteItemInput(input);

  if (!validation.valid) {
    throw createQuoteItemValidationError(validation.fieldErrors);
  }

  return validation.data;
}

async function findServiceOrderOrThrow(
  context: TenantContext,
  serviceOrderId: string,
  dependencies: QuoteServiceDependencies
): Promise<ServiceOrderDetailsRecord> {
  const serviceOrder = await dependencies.findServiceOrderById(
    context,
    serviceOrderId
  );

  if (!serviceOrder) {
    throw new NotFoundError("Ordem de servico nao encontrada.");
  }

  return serviceOrder;
}

async function findQuoteOrThrow(
  context: TenantContext,
  serviceOrderId: string,
  dependencies: QuoteServiceDependencies
): Promise<QuoteDetailsRecord> {
  const quote = await dependencies.findQuoteByServiceOrder(
    context,
    serviceOrderId
  );

  if (!quote) {
    throw new NotFoundError("Orcamento nao encontrado.");
  }

  return quote;
}

async function reloadQuoteOrThrow(
  context: TenantContext,
  serviceOrderId: string,
  dependencies: QuoteServiceDependencies
): Promise<QuoteDto> {
  const quote = await findQuoteOrThrow(context, serviceOrderId, dependencies);

  return mapQuote(quote);
}

function assertQuoteDraft(quote: QuoteDetailsRecord): void {
  if (quote.status !== "DRAFT") {
    throw new DomainError(
      "Itens do orcamento so podem ser alterados enquanto ele esta em rascunho."
    );
  }
}

function findItemInQuoteOrThrow(
  quote: QuoteDetailsRecord,
  quoteItemId: string
): QuoteItemMoneyRecord {
  const item = quote.items.find((quoteItem) => quoteItem.id === quoteItemId);

  if (!item) {
    throw new NotFoundError("Item de orcamento nao encontrado.");
  }

  return item;
}

async function loadCommercialFlowResources(
  context: TenantContext,
  serviceOrderId: string,
  dependencies: QuoteServiceDependencies
): Promise<{
  serviceOrder: ServiceOrderDetailsRecord;
  diagnostic: DiagnosticRecord | null;
  quote: QuoteDetailsRecord;
}> {
  const serviceOrder = await findServiceOrderOrThrow(
    context,
    serviceOrderId,
    dependencies
  );
  const [diagnostic, quote] = await Promise.all([
    dependencies.findDiagnosticByServiceOrder(context, serviceOrder.id),
    findQuoteOrThrow(context, serviceOrder.id, dependencies)
  ]);

  return {
    serviceOrder,
    diagnostic,
    quote
  };
}

function assertServiceOrderStatus(
  serviceOrder: ServiceOrderDetailsRecord,
  expectedStatus: ServiceOrderStatus,
  message: string
): void {
  if (serviceOrder.status !== expectedStatus) {
    throw new DomainError(message);
  }
}

function assertQuoteStatus(
  quote: QuoteDetailsRecord,
  expectedStatus: QuoteStatus,
  message: string
): void {
  if (quote.status !== expectedStatus) {
    throw new DomainError(message);
  }
}

async function runQuoteServiceOrderTransition(
  context: TenantContext,
  input: TransitionQuoteWithServiceOrderInput,
  dependencies: QuoteServiceDependencies
): Promise<QuoteDto> {
  const quote = await dependencies.transitionQuoteWithServiceOrder(
    context,
    input
  );

  if (!quote) {
    throw new ConflictError(QUOTE_CONFLICT_MESSAGE);
  }

  return mapQuote(quote);
}

export async function getQuoteForServiceOrder(
  context: TenantContext,
  serviceOrderId: string,
  dependencies = defaultQuoteServiceDependencies
): Promise<QuoteDto | null> {
  const serviceOrder = await findServiceOrderOrThrow(
    context,
    serviceOrderId,
    dependencies
  );
  const quote = await dependencies.findQuoteByServiceOrder(
    context,
    serviceOrder.id
  );

  return quote ? mapQuote(quote) : null;
}

export async function createQuoteForServiceOrder(
  context: AuthenticatedContext,
  serviceOrderId: string,
  dependencies = defaultQuoteServiceDependencies
): Promise<QuoteDto> {
  const serviceOrder = await findServiceOrderOrThrow(
    context,
    serviceOrderId,
    dependencies
  );

  assertServiceOrderStatus(
    serviceOrder,
    "IN_DIAGNOSIS",
    "Orcamento so pode ser criado enquanto a ordem esta em diagnostico."
  );

  const diagnostic = await dependencies.findDiagnosticByServiceOrder(
    context,
    serviceOrder.id
  );

  if (!diagnostic) {
    throw new DomainError(
      "Registre o diagnostico tecnico antes de criar o orcamento."
    );
  }

  const existingQuote = await dependencies.findQuoteByServiceOrder(
    context,
    serviceOrder.id
  );

  if (existingQuote) {
    return mapQuote(existingQuote);
  }

  try {
    const quote = await dependencies.createDraftQuoteWithTimeline(context, {
      serviceOrderId: serviceOrder.id,
      timeline: {
        type: serviceOrderTimelineTypes.quoteCreated,
        description: createQuoteCreatedTimelineDescription()
      }
    });

    return mapQuote(quote);
  } catch (error) {
    if (error instanceof QuoteAlreadyExistsError) {
      const quote = await dependencies.findQuoteByServiceOrder(
        context,
        serviceOrder.id
      );

      if (quote) {
        return mapQuote(quote);
      }
    }

    throw error;
  }
}

export async function addQuoteItem(
  context: AuthenticatedContext,
  serviceOrderId: string,
  input: QuoteItemInput,
  dependencies = defaultQuoteServiceDependencies
): Promise<QuoteDto> {
  await findServiceOrderOrThrow(context, serviceOrderId, dependencies);
  const quote = await findQuoteOrThrow(context, serviceOrderId, dependencies);
  assertQuoteDraft(quote);
  const validatedInput = validateQuoteItemInputOrThrow(input);
  const currentTotal = calculateQuoteTotal(quote.items);
  const nextTotal = currentTotal.plus(
    calculateQuoteItemSubtotal(validatedInput)
  );

  assertTotalWithinLimit(nextTotal);
  await dependencies.addQuoteItem(context, quote.id, validatedInput);

  return reloadQuoteOrThrow(context, serviceOrderId, dependencies);
}

export async function updateQuoteItem(
  context: AuthenticatedContext,
  serviceOrderId: string,
  quoteItemId: string,
  input: QuoteItemInput,
  dependencies = defaultQuoteServiceDependencies
): Promise<QuoteDto> {
  await findServiceOrderOrThrow(context, serviceOrderId, dependencies);
  const quote = await findQuoteOrThrow(context, serviceOrderId, dependencies);
  assertQuoteDraft(quote);
  const currentItem = findItemInQuoteOrThrow(quote, quoteItemId);
  const validatedInput = validateQuoteItemInputOrThrow(input);
  const nextTotal = calculateTotalWithReplacement(
    quote,
    currentItem,
    validatedInput
  );

  assertTotalWithinLimit(nextTotal);
  const updatedItem = await dependencies.updateQuoteItem(
    context,
    quote.id,
    quoteItemId,
    validatedInput
  );

  if (!updatedItem) {
    throw new NotFoundError("Item de orcamento nao encontrado.");
  }

  return reloadQuoteOrThrow(context, serviceOrderId, dependencies);
}

export async function removeQuoteItem(
  context: AuthenticatedContext,
  serviceOrderId: string,
  quoteItemId: string,
  dependencies = defaultQuoteServiceDependencies
): Promise<QuoteDto> {
  await findServiceOrderOrThrow(context, serviceOrderId, dependencies);
  const quote = await findQuoteOrThrow(context, serviceOrderId, dependencies);
  assertQuoteDraft(quote);
  findItemInQuoteOrThrow(quote, quoteItemId);

  const removed = await dependencies.removeQuoteItem(
    context,
    quote.id,
    quoteItemId
  );

  if (!removed) {
    throw new NotFoundError("Item de orcamento nao encontrado.");
  }

  return reloadQuoteOrThrow(context, serviceOrderId, dependencies);
}

export async function sendQuote(
  context: AuthenticatedContext,
  serviceOrderId: string,
  dependencies = defaultQuoteServiceDependencies
): Promise<QuoteDto> {
  requireRole(context, [UserRole.OWNER, UserRole.ADMIN]);
  const { serviceOrder, diagnostic, quote } = await loadCommercialFlowResources(
    context,
    serviceOrderId,
    dependencies
  );

  assertQuoteStatus(quote, "DRAFT", "Orcamento deve estar em rascunho.");
  assertServiceOrderStatus(
    serviceOrder,
    "IN_DIAGNOSIS",
    "Ordem de servico deve estar em diagnostico para enviar o orcamento."
  );

  if (!diagnostic) {
    throw new DomainError(
      "Registre o diagnostico tecnico antes de enviar o orcamento."
    );
  }

  const total = calculateQuoteTotal(quote.items);

  if (quote.items.length === 0) {
    throw new DomainError("Adicione pelo menos um item ao orcamento.");
  }

  if (!total.greaterThan(ZERO_MONEY)) {
    throw new DomainError(
      "O orcamento precisa ter total maior que zero para ser enviado."
    );
  }

  assertQuoteStatusTransition(quote.status, "SENT");

  return runQuoteServiceOrderTransition(
    context,
    {
      quoteId: quote.id,
      serviceOrderId: serviceOrder.id,
      expectedQuoteStatus: "DRAFT",
      targetQuoteStatus: "SENT",
      expectedServiceOrderStatus: "IN_DIAGNOSIS",
      targetServiceOrderStatus: "WAITING_FOR_APPROVAL",
      quoteTimeline: {
        type: serviceOrderTimelineTypes.quoteSent,
        description: createQuoteSentTimelineDescription()
      },
      serviceOrderTimeline: {
        type: serviceOrderTimelineTypes.statusChanged,
        description: createServiceOrderStatusChangedTimelineDescription(
          "IN_DIAGNOSIS",
          "WAITING_FOR_APPROVAL"
        )
      }
    },
    dependencies
  );
}

export async function approveQuote(
  context: AuthenticatedContext,
  serviceOrderId: string,
  dependencies = defaultQuoteServiceDependencies
): Promise<QuoteDto> {
  requireRole(context, [UserRole.OWNER, UserRole.ADMIN]);
  const { serviceOrder, quote } = await loadCommercialFlowResources(
    context,
    serviceOrderId,
    dependencies
  );

  assertQuoteStatus(quote, "SENT", "Orcamento deve estar enviado.");
  assertServiceOrderStatus(
    serviceOrder,
    "WAITING_FOR_APPROVAL",
    "Ordem de servico deve estar aguardando aprovacao."
  );
  assertQuoteStatusTransition(quote.status, "APPROVED");

  return runQuoteServiceOrderTransition(
    context,
    {
      quoteId: quote.id,
      serviceOrderId: serviceOrder.id,
      expectedQuoteStatus: "SENT",
      targetQuoteStatus: "APPROVED",
      expectedServiceOrderStatus: "WAITING_FOR_APPROVAL",
      targetServiceOrderStatus: "APPROVED",
      quoteTimeline: {
        type: serviceOrderTimelineTypes.quoteApproved,
        description: createQuoteApprovedTimelineDescription()
      },
      serviceOrderTimeline: {
        type: serviceOrderTimelineTypes.statusChanged,
        description: createServiceOrderStatusChangedTimelineDescription(
          "WAITING_FOR_APPROVAL",
          "APPROVED"
        )
      }
    },
    dependencies
  );
}

export async function rejectQuote(
  context: AuthenticatedContext,
  serviceOrderId: string,
  dependencies = defaultQuoteServiceDependencies
): Promise<QuoteDto> {
  requireRole(context, [UserRole.OWNER, UserRole.ADMIN]);
  const { serviceOrder, quote } = await loadCommercialFlowResources(
    context,
    serviceOrderId,
    dependencies
  );

  assertQuoteStatus(quote, "SENT", "Orcamento deve estar enviado.");
  assertServiceOrderStatus(
    serviceOrder,
    "WAITING_FOR_APPROVAL",
    "Ordem de servico deve estar aguardando aprovacao."
  );
  assertQuoteStatusTransition(quote.status, "REJECTED");

  return runQuoteServiceOrderTransition(
    context,
    {
      quoteId: quote.id,
      serviceOrderId: serviceOrder.id,
      expectedQuoteStatus: "SENT",
      targetQuoteStatus: "REJECTED",
      expectedServiceOrderStatus: "WAITING_FOR_APPROVAL",
      targetServiceOrderStatus: "CANCELLED",
      quoteTimeline: {
        type: serviceOrderTimelineTypes.quoteRejected,
        description: createQuoteRejectedTimelineDescription()
      },
      serviceOrderTimeline: {
        type: serviceOrderTimelineTypes.statusChanged,
        description: createServiceOrderStatusChangedTimelineDescription(
          "WAITING_FOR_APPROVAL",
          "CANCELLED"
        )
      }
    },
    dependencies
  );
}
