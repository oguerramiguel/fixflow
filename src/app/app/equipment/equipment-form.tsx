"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
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

function SubmitButton({
  submitLabel,
  pendingLabel
}: {
  submitLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? pendingLabel : submitLabel}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="mt-2 text-sm text-red-700">
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
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
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
          <FieldError message={state.fieldErrors?.type} />
          <FieldError message={state.fieldErrors?.customerId} />
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
            type="text"
            required
            maxLength={100}
            defaultValue={values.brand}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <FieldError message={state.fieldErrors?.brand} />
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
            type="text"
            required
            maxLength={120}
            defaultValue={values.model}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <FieldError message={state.fieldErrors?.model} />
        </div>

        <div>
          <label
            htmlFor="serialNumber"
            className="block text-sm font-medium text-slate-800"
          >
            Numero de serie
          </label>
          <input
            id="serialNumber"
            name="serialNumber"
            type="text"
            maxLength={120}
            defaultValue={values.serialNumber}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <FieldError message={state.fieldErrors?.serialNumber} />
        </div>
      </div>

      <div>
        <label
          htmlFor="accessories"
          className="block text-sm font-medium text-slate-800"
        >
          Acessorios
        </label>
        <textarea
          id="accessories"
          name="accessories"
          maxLength={500}
          defaultValue={values.accessories}
          rows={4}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <FieldError message={state.fieldErrors?.accessories} />
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-slate-800"
        >
          Observacoes
        </label>
        <textarea
          id="notes"
          name="notes"
          maxLength={2000}
          defaultValue={values.notes}
          rows={6}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <FieldError message={state.fieldErrors?.notes} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton submitLabel={submitLabel} pendingLabel={pendingLabel} />
        <Link
          href={cancelHref}
          className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
