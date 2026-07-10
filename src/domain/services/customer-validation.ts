import { normalizeEmail } from "@/domain/services/email";

export const CUSTOMER_NAME_MIN_LENGTH = 2;
export const CUSTOMER_NAME_MAX_LENGTH = 120;
export const CUSTOMER_EMAIL_MAX_LENGTH = 254;
export const CUSTOMER_PHONE_MIN_LENGTH = 8;
export const CUSTOMER_PHONE_MAX_LENGTH = 30;
export const CUSTOMER_DOCUMENT_MAX_LENGTH = 50;

export type CustomerField = "name" | "email" | "phone" | "document";

export type CustomerInput = {
  name: string;
  email?: string;
  phone: string;
  document?: string;
};

export type ValidatedCustomerInput = {
  name: string;
  email?: string;
  phone: string;
  document?: string;
};

export type CustomerValidationResult =
  | {
      valid: true;
      data: ValidatedCustomerInput;
    }
  | {
      valid: false;
      fieldErrors: Partial<Record<CustomerField, string>>;
    };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim() ?? "";

  return trimmedValue || undefined;
}

export function validateCustomerInput(
  input: CustomerInput
): CustomerValidationResult {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const rawEmail = normalizeOptionalText(input.email);
  const document = normalizeOptionalText(input.document);
  const fieldErrors: Partial<Record<CustomerField, string>> = {};

  if (name.length < CUSTOMER_NAME_MIN_LENGTH) {
    fieldErrors.name = `Nome deve ter pelo menos ${CUSTOMER_NAME_MIN_LENGTH} caracteres.`;
  } else if (name.length > CUSTOMER_NAME_MAX_LENGTH) {
    fieldErrors.name = `Nome deve ter no maximo ${CUSTOMER_NAME_MAX_LENGTH} caracteres.`;
  }

  if (!phone) {
    fieldErrors.phone = "Telefone e obrigatorio.";
  } else if (phone.length < CUSTOMER_PHONE_MIN_LENGTH) {
    fieldErrors.phone = `Telefone deve ter pelo menos ${CUSTOMER_PHONE_MIN_LENGTH} caracteres.`;
  } else if (phone.length > CUSTOMER_PHONE_MAX_LENGTH) {
    fieldErrors.phone = `Telefone deve ter no maximo ${CUSTOMER_PHONE_MAX_LENGTH} caracteres.`;
  }

  let email: string | undefined;

  if (rawEmail) {
    email = normalizeEmail(rawEmail);

    if (email.length > CUSTOMER_EMAIL_MAX_LENGTH) {
      fieldErrors.email = `Email deve ter no maximo ${CUSTOMER_EMAIL_MAX_LENGTH} caracteres.`;
    } else if (!emailPattern.test(email)) {
      fieldErrors.email = "Email deve ter um formato valido.";
    }
  }

  if (document && document.length > CUSTOMER_DOCUMENT_MAX_LENGTH) {
    fieldErrors.document = `Documento deve ter no maximo ${CUSTOMER_DOCUMENT_MAX_LENGTH} caracteres.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      fieldErrors
    };
  }

  return {
    valid: true,
    data: {
      name,
      email,
      phone,
      document
    }
  };
}
