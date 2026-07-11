"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type {
  ServiceOrderCreateFormState,
  ServiceOrderCreateFormValues
} from "./actions";

type ServiceOrderCreateFormAction = (
  previousState: ServiceOrderCreateFormState,
  formData: FormData
) => Promise<ServiceOrderCreateFormState>;

type ServiceOrderFormProps = {
  action: ServiceOrderCreateFormAction;
  cancelHref: string;
};

const emptyValues: ServiceOrderCreateFormValues = {
  reportedIssue: ""
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? "Abrindo..." : "Abrir ordem de servico"}
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

export function ServiceOrderForm({
  action,
  cancelHref
}: ServiceOrderFormProps) {
  const [state, formAction] = useActionState(action, {});
  const values = state.values ?? emptyValues;

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

      <div>
        <label
          htmlFor="reportedIssue"
          className="block text-sm font-medium text-slate-800"
        >
          Problema relatado
        </label>
        <textarea
          id="reportedIssue"
          name="reportedIssue"
          required
          minLength={5}
          maxLength={2000}
          rows={8}
          defaultValue={values.reportedIssue}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <FieldError message={state.fieldErrors?.reportedIssue} />
        <FieldError message={state.fieldErrors?.equipmentId} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton />
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
