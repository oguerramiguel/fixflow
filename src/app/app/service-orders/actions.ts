"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import { AuthorizationError } from "@/domain/errors/authorization-error";
import { ConflictError } from "@/domain/errors/conflict-error";
import { DomainError } from "@/domain/errors/domain-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { ServiceOrderField } from "@/domain/services/service-order-validation";
import { requireAuthenticatedContext } from "@/server/auth/authenticated-context";
import {
  createServiceOrder,
  transitionServiceOrderStatus
} from "@/server/services/service-order-service";

export type ServiceOrderCreateFormValues = {
  reportedIssue: string;
};

export type ServiceOrderCreateFormState = {
  error?: string;
  fieldErrors?: Partial<Record<ServiceOrderField, string>>;
  values?: ServiceOrderCreateFormValues;
};

export type ServiceOrderTransitionFormState = {
  error?: string;
};

function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getServiceOrderCreateFormValues(
  formData: FormData
): ServiceOrderCreateFormValues {
  return {
    reportedIssue: getStringFormValue(formData, "reportedIssue")
  };
}

function handleServiceOrderCreateActionError(
  error: unknown,
  values: ServiceOrderCreateFormValues
): ServiceOrderCreateFormState {
  if (error instanceof ValidationError) {
    return {
      error: error.message,
      fieldErrors: error.fieldErrors as Partial<
        Record<ServiceOrderField, string>
      >,
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

function handleServiceOrderTransitionActionError(
  error: unknown
): ServiceOrderTransitionFormState {
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

export async function createServiceOrderAction(
  equipmentId: string,
  _previousState: ServiceOrderCreateFormState,
  formData: FormData
): Promise<ServiceOrderCreateFormState> {
  const values = getServiceOrderCreateFormValues(formData);
  let serviceOrderId: string | undefined;

  try {
    const context = await requireAuthenticatedContext();
    const serviceOrder = await createServiceOrder(context, {
      equipmentId,
      reportedIssue: values.reportedIssue
    });

    serviceOrderId = serviceOrder.id;
  } catch (error) {
    return handleServiceOrderCreateActionError(error, values);
  }

  if (!serviceOrderId) {
    throw new Error("Service order creation did not return an id.");
  }

  revalidatePath("/app/service-orders");
  revalidatePath(`/app/equipment/${equipmentId}`);
  redirect(`/app/service-orders/${serviceOrderId}`);
}

export async function transitionServiceOrderStatusAction(
  serviceOrderId: string,
  _previousState: ServiceOrderTransitionFormState,
  formData: FormData
): Promise<ServiceOrderTransitionFormState> {
  const targetStatus = getStringFormValue(formData, "targetStatus");

  try {
    const context = await requireAuthenticatedContext();
    await transitionServiceOrderStatus(context, serviceOrderId, targetStatus);
  } catch (error) {
    return handleServiceOrderTransitionActionError(error);
  }

  revalidatePath("/app/service-orders");
  revalidatePath(`/app/service-orders/${serviceOrderId}`);
  redirect(`/app/service-orders/${serviceOrderId}`);
}
