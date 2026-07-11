"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { QuoteItemField } from "@/domain/services/quote-item-validation";
import { requireAuthenticatedContext } from "@/server/auth/authenticated-context";
import {
  addQuoteItem,
  approveQuote,
  createQuoteForServiceOrder,
  rejectQuote,
  removeQuoteItem,
  sendQuote,
  updateQuoteItem
} from "@/server/services/quote-service";

export type QuoteCommandFormState = {
  error?: string;
};

export type QuoteItemFormValues = {
  description: string;
  quantity: string;
  unitPrice: string;
};

export type QuoteItemFormState = {
  error?: string;
  fieldErrors?: Partial<Record<QuoteItemField, string>>;
  values?: QuoteItemFormValues;
};

function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getQuoteItemFormValues(formData: FormData): QuoteItemFormValues {
  return {
    description: getStringFormValue(formData, "description"),
    quantity: getStringFormValue(formData, "quantity"),
    unitPrice: getStringFormValue(formData, "unitPrice")
  };
}

function revalidateQuotePaths(serviceOrderId: string): void {
  revalidatePath("/app/service-orders");
  revalidatePath(`/app/service-orders/${serviceOrderId}`);
  revalidatePath(`/app/service-orders/${serviceOrderId}/quote`);
}

function handleQuoteCommandActionError(
  error: unknown
): QuoteCommandFormState {
  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof AuthorizationError ||
    error instanceof ConflictError ||
    error instanceof DomainError
  ) {
    return {
      error: error.message
    };
  }

  if (error instanceof AuthenticationError) {
    redirect("/login");
  }

  throw error;
}

function handleQuoteItemActionError(
  error: unknown,
  values: QuoteItemFormValues
): QuoteItemFormState {
  if (error instanceof ValidationError) {
    return {
      error: error.message,
      fieldErrors: error.fieldErrors as Partial<Record<QuoteItemField, string>>,
      values
    };
  }

  if (
    error instanceof NotFoundError ||
    error instanceof AuthorizationError ||
    error instanceof ConflictError ||
    error instanceof DomainError
  ) {
    return {
      error: error.message,
      values
    };
  }

  if (error instanceof AuthenticationError) {
    redirect("/login");
  }

  throw error;
}

export async function createQuoteAction(
  serviceOrderId: string,
  _previousState: QuoteCommandFormState,
  _formData: FormData
): Promise<QuoteCommandFormState> {
  try {
    const context = await requireAuthenticatedContext();
    await createQuoteForServiceOrder(context, serviceOrderId);
  } catch (error) {
    return handleQuoteCommandActionError(error);
  }

  revalidateQuotePaths(serviceOrderId);
  redirect(`/app/service-orders/${serviceOrderId}/quote`);
}

export async function addQuoteItemAction(
  serviceOrderId: string,
  _previousState: QuoteItemFormState,
  formData: FormData
): Promise<QuoteItemFormState> {
  const values = getQuoteItemFormValues(formData);

  try {
    const context = await requireAuthenticatedContext();
    await addQuoteItem(context, serviceOrderId, values);
  } catch (error) {
    return handleQuoteItemActionError(error, values);
  }

  revalidateQuotePaths(serviceOrderId);
  redirect(`/app/service-orders/${serviceOrderId}/quote`);
}

export async function updateQuoteItemAction(
  serviceOrderId: string,
  quoteItemId: string,
  _previousState: QuoteItemFormState,
  formData: FormData
): Promise<QuoteItemFormState> {
  const values = getQuoteItemFormValues(formData);

  try {
    const context = await requireAuthenticatedContext();
    await updateQuoteItem(context, serviceOrderId, quoteItemId, values);
  } catch (error) {
    return handleQuoteItemActionError(error, values);
  }

  revalidateQuotePaths(serviceOrderId);
  redirect(`/app/service-orders/${serviceOrderId}/quote`);
}

export async function removeQuoteItemAction(
  serviceOrderId: string,
  quoteItemId: string,
  _previousState: QuoteCommandFormState,
  _formData: FormData
): Promise<QuoteCommandFormState> {
  try {
    const context = await requireAuthenticatedContext();
    await removeQuoteItem(context, serviceOrderId, quoteItemId);
  } catch (error) {
    return handleQuoteCommandActionError(error);
  }

  revalidateQuotePaths(serviceOrderId);
  redirect(`/app/service-orders/${serviceOrderId}/quote`);
}

export async function sendQuoteAction(
  serviceOrderId: string,
  _previousState: QuoteCommandFormState,
  _formData: FormData
): Promise<QuoteCommandFormState> {
  try {
    const context = await requireAuthenticatedContext();
    await sendQuote(context, serviceOrderId);
  } catch (error) {
    return handleQuoteCommandActionError(error);
  }

  revalidateQuotePaths(serviceOrderId);
  redirect(`/app/service-orders/${serviceOrderId}/quote`);
}

export async function approveQuoteAction(
  serviceOrderId: string,
  _previousState: QuoteCommandFormState,
  _formData: FormData
): Promise<QuoteCommandFormState> {
  try {
    const context = await requireAuthenticatedContext();
    await approveQuote(context, serviceOrderId);
  } catch (error) {
    return handleQuoteCommandActionError(error);
  }

  revalidateQuotePaths(serviceOrderId);
  redirect(`/app/service-orders/${serviceOrderId}/quote`);
}

export async function rejectQuoteAction(
  serviceOrderId: string,
  _previousState: QuoteCommandFormState,
  _formData: FormData
): Promise<QuoteCommandFormState> {
  try {
    const context = await requireAuthenticatedContext();
    await rejectQuote(context, serviceOrderId);
  } catch (error) {
    return handleQuoteCommandActionError(error);
  }

  revalidateQuotePaths(serviceOrderId);
  redirect(`/app/service-orders/${serviceOrderId}/quote`);
}
