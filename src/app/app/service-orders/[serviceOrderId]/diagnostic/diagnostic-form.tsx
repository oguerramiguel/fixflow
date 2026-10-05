"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import type { DiagnosticFormState, DiagnosticFormValues } from "./actions";

type DiagnosticFormAction = (
  previousState: DiagnosticFormState,
  formData: FormData
) => Promise<DiagnosticFormState>;

type DiagnosticFormProps = {
  action: DiagnosticFormAction;
  initialValues?: DiagnosticFormValues;
  cancelHref: string;
};

const emptyValues: DiagnosticFormValues = {
  description: "",
  technicalNotes: ""
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

export function DiagnosticForm({
  action,
  initialValues = emptyValues,
  cancelHref
}: DiagnosticFormProps) {
  const [state, formAction] = useActionState(action, {});
  const values = state.values ?? initialValues;

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

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-800"
        >
          Diagnóstico técnico
        </label>
        <textarea
          id="description"
          name="description"
          aria-invalid={Boolean(state.fieldErrors?.description)}
          aria-describedby="description-error"
          required
          minLength={10}
          maxLength={4000}
          rows={8}
          defaultValue={values.description}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <FieldError id="description-error" message={state.fieldErrors?.description} />
      </div>

      <div>
        <label
          htmlFor="technicalNotes"
          className="block text-sm font-medium text-slate-800"
        >
          Notas técnicas
        </label>
        <textarea
          id="technicalNotes"
          name="technicalNotes"
          aria-invalid={Boolean(state.fieldErrors?.technicalNotes)}
          aria-describedby="technicalNotes-error"
          maxLength={8000}
          rows={8}
          defaultValue={values.technicalNotes}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <p className="mt-2 text-sm text-slate-500">Opcional.</p>
        <FieldError id="technicalNotes-error" message={state.fieldErrors?.technicalNotes} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton label="Salvar diagnóstico" />
        <Link
          href={cancelHref}
          className="button-secondary"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
