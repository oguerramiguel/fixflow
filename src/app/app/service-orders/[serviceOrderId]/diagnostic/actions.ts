"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { DiagnosticField } from "@/domain/services/diagnostic-validation";
import { requireAuthenticatedContext } from "@/server/auth/authenticated-context";
import { saveDiagnosticForServiceOrder } from "@/server/services/diagnostic-service";

export type DiagnosticFormValues = {
  description: string;
  technicalNotes: string;
};

export type DiagnosticFormState = {
  error?: string;
  fieldErrors?: Partial<Record<DiagnosticField, string>>;
  values?: DiagnosticFormValues;
};

function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getDiagnosticFormValues(formData: FormData): DiagnosticFormValues {
  return {
    description: getStringFormValue(formData, "description"),
    technicalNotes: getStringFormValue(formData, "technicalNotes")
  };
}

function handleDiagnosticActionError(
  error: unknown,
  values: DiagnosticFormValues
): DiagnosticFormState {
  if (error instanceof ValidationError) {
    return {
      error: error.message,
      fieldErrors: error.fieldErrors as Partial<Record<DiagnosticField, string>>,
      values
    };
  }

  if (error instanceof NotFoundError || error instanceof DomainError) {
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

export async function saveDiagnosticAction(
  serviceOrderId: string,
  _previousState: DiagnosticFormState,
  formData: FormData
): Promise<DiagnosticFormState> {
  const values = getDiagnosticFormValues(formData);

  try {
    const context = await requireAuthenticatedContext();
    await saveDiagnosticForServiceOrder(context, serviceOrderId, values);
  } catch (error) {
    return handleDiagnosticActionError(error, values);
  }

  revalidatePath("/app/service-orders");
  revalidatePath(`/app/service-orders/${serviceOrderId}`);
  revalidatePath(`/app/service-orders/${serviceOrderId}/diagnostic`);
  redirect(`/app/service-orders/${serviceOrderId}/diagnostic`);
}
