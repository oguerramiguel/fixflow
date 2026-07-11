"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
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

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? "Salvando..." : "Salvar diagnostico"}
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
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-800"
        >
          Diagnostico tecnico
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={4000}
          rows={8}
          defaultValue={values.description}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <FieldError message={state.fieldErrors?.description} />
      </div>

      <div>
        <label
          htmlFor="technicalNotes"
          className="block text-sm font-medium text-slate-800"
        >
          Notas tecnicas
        </label>
        <textarea
          id="technicalNotes"
          name="technicalNotes"
          maxLength={8000}
          rows={8}
          defaultValue={values.technicalNotes}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <p className="mt-2 text-sm text-slate-500">Opcional.</p>
        <FieldError message={state.fieldErrors?.technicalNotes} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton />
        <Link
          href={cancelHref}
          className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
