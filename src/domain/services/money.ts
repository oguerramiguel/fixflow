import { Prisma } from "@prisma/client";

export type MoneyDecimal = Prisma.Decimal;

export const MONEY_DECIMAL_SCALE = 2;
export const MONEY_DECIMAL_MAX = "9999999999.99";

const canonicalMoneyPattern = /^\d+(?:\.\d{1,2})?$/;
const integerQuantityPattern = /^(?:0|[1-9]\d*)$/;

export const ZERO_MONEY = new Prisma.Decimal("0.00");
export const MAX_MONEY = new Prisma.Decimal(MONEY_DECIMAL_MAX);

export type MoneyParseResult =
  | {
      valid: true;
      decimal: MoneyDecimal;
      canonical: string;
    }
  | {
      valid: false;
      message: string;
    };

export type QuantityParseResult =
  | {
      valid: true;
      quantity: number;
    }
  | {
      valid: false;
      message: string;
    };

export type QuoteMoneyItem = {
  quantity: number;
  unitPrice: MoneyDecimal;
};

export function createMoneyDecimal(value: string): MoneyDecimal {
  return new Prisma.Decimal(value);
}

export function toCanonicalMoneyString(value: MoneyDecimal): string {
  return value.toFixed(MONEY_DECIMAL_SCALE);
}

export function parseMoneyInput(input: string): MoneyParseResult {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return {
      valid: false,
      message: "Informe um valor unitario valido."
    };
  }

  if (/\s/.test(trimmedInput)) {
    return {
      valid: false,
      message: "Informe um valor unitario valido."
    };
  }

  if (trimmedInput.includes(".") && trimmedInput.includes(",")) {
    return {
      valid: false,
      message: "Informe um valor unitario valido."
    };
  }

  const normalizedInput = trimmedInput.replace(",", ".");

  if (!canonicalMoneyPattern.test(normalizedInput)) {
    const decimalPart = normalizedInput.split(".")[1];

    if (decimalPart && decimalPart.length > MONEY_DECIMAL_SCALE) {
      return {
        valid: false,
        message: "O valor unitario deve possuir no maximo duas casas decimais."
      };
    }

    return {
      valid: false,
      message: "Informe um valor unitario valido."
    };
  }

  const decimal = createMoneyDecimal(normalizedInput);

  if (decimal.lessThan(ZERO_MONEY) || decimal.greaterThan(MAX_MONEY)) {
    return {
      valid: false,
      message: "Informe um valor unitario valido."
    };
  }

  return {
    valid: true,
    decimal,
    canonical: toCanonicalMoneyString(decimal)
  };
}

export function parseQuantityInput(input: string): QuantityParseResult {
  const trimmedInput = input.trim();

  if (!integerQuantityPattern.test(trimmedInput)) {
    return {
      valid: false,
      message: "Quantidade deve ser um numero inteiro entre 1 e 999."
    };
  }

  const quantity = Number(trimmedInput);

  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
    return {
      valid: false,
      message: "Quantidade deve ser um numero inteiro entre 1 e 999."
    };
  }

  return {
    valid: true,
    quantity
  };
}

export function calculateQuoteItemSubtotal(input: QuoteMoneyItem): MoneyDecimal {
  return input.unitPrice.mul(input.quantity);
}

export function calculateQuoteTotal(items: QuoteMoneyItem[]): MoneyDecimal {
  return items.reduce(
    (total, item) => total.plus(calculateQuoteItemSubtotal(item)),
    ZERO_MONEY
  );
}

export function isMoneyWithinLimit(value: MoneyDecimal): boolean {
  return value.greaterThanOrEqualTo(ZERO_MONEY) && value.lessThanOrEqualTo(MAX_MONEY);
}

export function assertMoneyWithinLimit(
  value: MoneyDecimal,
  message: string
): void {
  if (!isMoneyWithinLimit(value)) {
    throw new Error(message);
  }
}
