"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { CustomerFormState, CustomerFormValues } from "./actions";

type CustomerFormAction = (
  previousState: CustomerFormState,
  formData: FormData
) => Promise<CustomerFormState>;

type CustomerFormProps = {
  action: CustomerFormAction;
  initialValues?: CustomerFormValues;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
};

const emptyValues: CustomerFormValues = {
  name: "",
  email: "",
  phone: "",
  document: ""
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

export function CustomerForm({
  action,
  initialValues = emptyValues,
  submitLabel,
  pendingLabel,
  cancelHref
}: CustomerFormProps) {
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
          htmlFor="name"
          className="block text-sm font-medium text-slate-800"
        >
          Nome
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          defaultValue={values.name}
          className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <FieldError message={state.fieldErrors?.name} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-800"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            maxLength={254}
            defaultValue={values.email}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <FieldError message={state.fieldErrors?.email} />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-slate-800"
          >
            Telefone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            minLength={8}
            maxLength={30}
            defaultValue={values.phone}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <FieldError message={state.fieldErrors?.phone} />
        </div>
      </div>

      <div>
        <label
          htmlFor="document"
          className="block text-sm font-medium text-slate-800"
        >
          Documento
        </label>
        <input
          id="document"
          name="document"
          type="text"
          maxLength={50}
          defaultValue={values.document}
          aria-describedby="document-help"
          className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <p id="document-help" className="mt-2 text-sm text-slate-500">
          Opcional.
        </p>
        <FieldError message={state.fieldErrors?.document} />
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
