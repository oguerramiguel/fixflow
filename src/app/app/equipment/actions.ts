"use server";

import { redirect } from "next/navigation";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import { NotFoundError } from "@/domain/errors/not-found-error";
import { ValidationError } from "@/domain/errors/validation-error";
import type { EquipmentField } from "@/domain/services/equipment-validation";
import { requireAuthenticatedContext } from "@/server/auth/authenticated-context";
import {
  createEquipment,
  updateEquipment
} from "@/server/services/equipment-service";

export type EquipmentFormValues = {
  customerId: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  accessories: string;
  notes: string;
};

export type EquipmentUpdateFormValues = Omit<
  EquipmentFormValues,
  "customerId"
>;

export type EquipmentFormState = {
  error?: string;
  fieldErrors?: Partial<Record<EquipmentField, string>>;
  values?: Partial<EquipmentFormValues>;
};

function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getEquipmentFormValues(formData: FormData): EquipmentFormValues {
  return {
    customerId: getStringFormValue(formData, "customerId"),
    type: getStringFormValue(formData, "type"),
    brand: getStringFormValue(formData, "brand"),
    model: getStringFormValue(formData, "model"),
    serialNumber: getStringFormValue(formData, "serialNumber"),
    accessories: getStringFormValue(formData, "accessories"),
    notes: getStringFormValue(formData, "notes")
  };
}

function getEquipmentUpdateFormValues(
  formData: FormData
): EquipmentUpdateFormValues {
  return {
    type: getStringFormValue(formData, "type"),
    brand: getStringFormValue(formData, "brand"),
    model: getStringFormValue(formData, "model"),
    serialNumber: getStringFormValue(formData, "serialNumber"),
    accessories: getStringFormValue(formData, "accessories"),
    notes: getStringFormValue(formData, "notes")
  };
}

function handleEquipmentActionError(
  error: unknown,
  values: Partial<EquipmentFormValues>
): EquipmentFormState {
  if (error instanceof ValidationError) {
    return {
      error: error.message,
      fieldErrors: error.fieldErrors as Partial<Record<EquipmentField, string>>,
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

export async function createEquipmentAction(
  _previousState: EquipmentFormState,
  formData: FormData
): Promise<EquipmentFormState> {
  const values = getEquipmentFormValues(formData);
  let equipmentId: string | undefined;

  try {
    const context = await requireAuthenticatedContext();
    const equipment = await createEquipment(context, values);

    equipmentId = equipment.id;
  } catch (error) {
    return handleEquipmentActionError(error, values);
  }

  if (!equipmentId) {
    throw new Error("Equipment creation did not return an id.");
  }

  redirect(`/app/equipment/${equipmentId}`);
}

export async function updateEquipmentAction(
  equipmentId: string,
  _previousState: EquipmentFormState,
  formData: FormData
): Promise<EquipmentFormState> {
  const values = getEquipmentUpdateFormValues(formData);

  try {
    const context = await requireAuthenticatedContext();
    await updateEquipment(context, equipmentId, values);
  } catch (error) {
    return handleEquipmentActionError(error, values);
  }

  redirect(`/app/equipment/${equipmentId}`);
}
