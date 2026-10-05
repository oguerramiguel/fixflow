"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import type {
  EquipmentFormState,
  EquipmentFormValues,
  EquipmentUpdateFormValues
} from "./actions";

type EquipmentFormAction = (
  previousState: EquipmentFormState,
  formData: FormData
) => Promise<EquipmentFormState>;

type EquipmentFormProps = {
  action: EquipmentFormAction;
  mode: "create" | "update";
  customerId?: string;
  customerName?: string;
  initialValues?: Partial<EquipmentFormValues>;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
};

const equipmentTypeOptions = [
  {
    value: "NOTEBOOK",
    label: "Notebook"
  },
  {
    value: "DESKTOP",
    label: "Desktop"
  },
  {
    value: "OTHER",
    label: "Outro"
  }
];

const emptyValues: EquipmentUpdateFormValues = {
  type: "NOTEBOOK",
  brand: "",
  model: "",
  serialNumber: "",
  accessories: "",
  notes: ""
};

function FieldError({ message, id }: { message?: string; id: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" className="mt-2 text-sm text-red-700">
      {message}
    </p>
  );
}

export function EquipmentForm({
  action,
  mode,
  customerId,
  customerName,
  initialValues,
  submitLabel,
  pendingLabel,
  cancelHref
}: EquipmentFormProps) {
  const [state, formAction] = useActionState(action, {});
  const values = {
    ...emptyValues,
    ...initialValues,
    ...state.values
  };

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p
          role="alert"
          className="alert-error"
        >
          {state.error}
        </p>
      ) : null}

      {mode === "create" ? (
        <input type="hidden" name="customerId" value={customerId ?? ""} />
      ) : null}

      {customerName ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Cliente</p>
          <p className="mt-1 text-base font-semibold text-slate-950">
            {customerName}
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-slate-800"
          >
            Tipo
          </label>
          <select
            id="type"
            name="type"
            aria-invalid={Boolean(state.fieldErrors?.type)}
            aria-describedby="type-error"
            required
            defaultValue={values.type}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          >
            {equipmentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError id="type-error" message={state.fieldErrors?.type} />
          <FieldError id="customerId-error" message={state.fieldErrors?.customerId} />
        </div>

        <div>
          <label
            htmlFor="brand"
            className="block text-sm font-medium text-slate-800"
          >
            Marca
          </label>
          <input
            id="brand"
            name="brand"
            aria-invalid={Boolean(state.fieldErrors?.brand)}
            aria-describedby="brand-error"
            type="text"
            required
            maxLength={100}
            defaultValue={values.brand}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <FieldError id="brand-error" message={state.fieldErrors?.brand} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="model"
            className="block text-sm font-medium text-slate-800"
          >
            Modelo
          </label>
          <input
            id="model"
            name="model"
            aria-invalid={Boolean(state.fieldErrors?.model)}
            aria-describedby="model-error"
            type="text"
            required
            maxLength={120}
            defaultValue={values.model}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <FieldError id="model-error" message={state.fieldErrors?.model} />
        </div>

        <div>
          <label
            htmlFor="serialNumber"
            className="block text-sm font-medium text-slate-800"
          >
            Número de série
          </label>
          <input
            id="serialNumber"
            name="serialNumber"
            aria-invalid={Boolean(state.fieldErrors?.serialNumber)}
            aria-describedby="serialNumber-error"
            type="text"
            maxLength={120}
            defaultValue={values.serialNumber}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <FieldError id="serialNumber-error" message={state.fieldErrors?.serialNumber} />
        </div>
      </div>

      <div>
        <label
          htmlFor="accessories"
          className="block text-sm font-medium text-slate-800"
        >
          Acessórios
        </label>
        <textarea
          id="accessories"
          name="accessories"
          aria-invalid={Boolean(state.fieldErrors?.accessories)}
          aria-describedby="accessories-error"
          maxLength={500}
          defaultValue={values.accessories}
          rows={4}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <FieldError id="accessories-error" message={state.fieldErrors?.accessories} />
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-slate-800"
        >
          Observações
        </label>
        <textarea
          id="notes"
          name="notes"
          aria-invalid={Boolean(state.fieldErrors?.notes)}
          aria-describedby="notes-error"
          maxLength={2000}
          defaultValue={values.notes}
          rows={6}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <FieldError id="notes-error" message={state.fieldErrors?.notes} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
        <Link
          href={cancelHref}
          className="button-secondary"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
