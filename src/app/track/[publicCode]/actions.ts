"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { normalizeServiceOrderPublicCode } from "@/domain/services/public-code";
import {
  approvePublicQuote,
  rejectPublicQuote
} from "@/server/services/public-tracking-service";

export type PublicQuoteDecisionFormState = {
  error?: string;
};

const PUBLIC_DECISION_INTERNAL_ERROR_MESSAGE =
  "Nao foi possivel registrar a decisao do orcamento.";

function getSafePublicDecisionError(error: unknown): PublicQuoteDecisionFormState {
  if (error instanceof AuthorizationError) {
    return {
      error: PUBLIC_DECISION_INTERNAL_ERROR_MESSAGE
    };
  }

  if (
    error instanceof NotFoundError ||
    error instanceof ConflictError ||
    error instanceof DomainError
  ) {
    return {
      error: error.message
    };
  }

  throw error;
}

function revalidateAndRedirect(publicCodeInput: string): never {
  const publicCode =
    normalizeServiceOrderPublicCode(publicCodeInput) ?? publicCodeInput;
  const path = `/track/${publicCode}`;

  revalidatePath(path);
  redirect(path);
}

export async function approvePublicQuoteAction(
  publicCode: string,
  _previousState: PublicQuoteDecisionFormState,
  _formData: FormData
): Promise<PublicQuoteDecisionFormState> {
  try {
    await approvePublicQuote(publicCode);
  } catch (error) {
    return getSafePublicDecisionError(error);
  }

  revalidateAndRedirect(publicCode);
}

export async function rejectPublicQuoteAction(
  publicCode: string,
  _previousState: PublicQuoteDecisionFormState,
  _formData: FormData
): Promise<PublicQuoteDecisionFormState> {
  try {
    await rejectPublicQuote(publicCode);
  } catch (error) {
    return getSafePublicDecisionError(error);
  }

  revalidateAndRedirect(publicCode);
}
