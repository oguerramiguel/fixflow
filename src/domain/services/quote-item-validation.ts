import { Prisma } from "@prisma/client";
import { ValidationError } from "@/domain/errors/validation-error";
import {
  calculateQuoteItemSubtotal,
  isMoneyWithinLimit,
  parseMoneyInput,
  parseQuantityInput,
  type MoneyDecimal
} from "@/domain/services/money";

export const QUOTE_ITEM_DESCRIPTION_MIN_LENGTH = 2;
export const QUOTE_ITEM_DESCRIPTION_MAX_LENGTH = 250;

export type QuoteItemField = "description" | "quantity" | "unitPrice";

export type QuoteItemInput = {
  description: string;
  quantity: string;
  unitPrice: string;
};

export type ValidatedQuoteItemInput = {
  description: string;
  quantity: number;
  unitPrice: MoneyDecimal;
};

export type QuoteItemValidationResult =
  | {
      valid: true;
      data: ValidatedQuoteItemInput;
    }
  | {
      valid: false;
      fieldErrors: Partial<Record<QuoteItemField, string>>;
    };

export function validateQuoteItemInput(
  input: QuoteItemInput
): QuoteItemValidationResult {
  const description = input.description.trim();
  const fieldErrors: Partial<Record<QuoteItemField, string>> = {};

  if (!description) {
    fieldErrors.description = "Informe a descricao do item.";
  } else if (description.length < QUOTE_ITEM_DESCRIPTION_MIN_LENGTH) {
    fieldErrors.description = `Descricao deve ter pelo menos ${QUOTE_ITEM_DESCRIPTION_MIN_LENGTH} caracteres.`;
  } else if (description.length > QUOTE_ITEM_DESCRIPTION_MAX_LENGTH) {
    fieldErrors.description = `Descricao deve ter no maximo ${QUOTE_ITEM_DESCRIPTION_MAX_LENGTH} caracteres.`;
  }

  const quantityResult = parseQuantityInput(input.quantity);

  if (!quantityResult.valid) {
    fieldErrors.quantity = quantityResult.message;
  }

  const unitPriceResult = parseMoneyInput(input.unitPrice);

  if (!unitPriceResult.valid) {
    fieldErrors.unitPrice = unitPriceResult.message;
  }

  if (!quantityResult.valid || !unitPriceResult.valid) {
    return {
      valid: false,
      fieldErrors
    };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      fieldErrors
    };
  }

  const subtotal = calculateQuoteItemSubtotal({
    quantity: quantityResult.quantity,
    unitPrice: unitPriceResult.decimal
  });

  if (!isMoneyWithinLimit(subtotal)) {
    return {
      valid: false,
      fieldErrors: {
        ...fieldErrors,
        unitPrice: "O subtotal do item ultrapassa o limite permitido."
      }
    };
  }

  return {
    valid: true,
    data: {
      description,
      quantity: quantityResult.quantity,
      unitPrice: new Prisma.Decimal(unitPriceResult.canonical)
    }
  };
}

export function createQuoteItemValidationError(
  fieldErrors: Partial<Record<QuoteItemField, string>>
): ValidationError<QuoteItemField> {
  return new ValidationError("Dados do item de orcamento invalidos.", fieldErrors);
}
