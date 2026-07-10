"use server";

import { redirect } from "next/navigation";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { CustomerField } from "@/domain/services/customer-validation";
import { requireAuthenticatedContext } from "@/server/auth/authenticated-context";
import {
  createCustomer,
  updateCustomer
} from "@/server/services/customer-service";

export type CustomerFormValues = {
  name: string;
  email: string;
  phone: string;
  document: string;
};

export type CustomerFormState = {
  error?: string;
  fieldErrors?: Partial<Record<CustomerField, string>>;
  values?: CustomerFormValues;
};

function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getCustomerFormValues(formData: FormData): CustomerFormValues {
  return {
    name: getStringFormValue(formData, "name"),
    email: getStringFormValue(formData, "email"),
    phone: getStringFormValue(formData, "phone"),
    document: getStringFormValue(formData, "document")
  };
}

function handleCustomerActionError(
  error: unknown,
  values: CustomerFormValues
): CustomerFormState {
  if (error instanceof ValidationError) {
    return {
      error: error.message,
      fieldErrors: error.fieldErrors as Partial<Record<CustomerField, string>>,
      values
    };
  }

  if (error instanceof NotFoundError) {
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

export async function createCustomerAction(
  _previousState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const values = getCustomerFormValues(formData);
  let customerId: string | undefined;

  try {
    const context = await requireAuthenticatedContext();
    const customer = await createCustomer(context, values);

    customerId = customer.id;
  } catch (error) {
    return handleCustomerActionError(error, values);
  }

  if (!customerId) {
    throw new Error("Customer creation did not return an id.");
  }

  redirect(`/app/customers/${customerId}`);
}

export async function updateCustomerAction(
  customerId: string,
  _previousState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const values = getCustomerFormValues(formData);

  try {
    const context = await requireAuthenticatedContext();
    await updateCustomer(context, customerId, values);
  } catch (error) {
    return handleCustomerActionError(error, values);
  }

  redirect(`/app/customers/${customerId}`);
}
