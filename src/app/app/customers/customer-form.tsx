"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
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
          className="alert-error"
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
          aria-invalid={Boolean(state.fieldErrors?.name)}
          aria-describedby="name-error"
          type="text"
          required
          minLength={2}
          maxLength={120}
          defaultValue={values.name}
          className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <FieldError id="name-error" message={state.fieldErrors?.name} />
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
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby="email-error"
            type="email"
            maxLength={254}
            defaultValue={values.email}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <FieldError id="email-error" message={state.fieldErrors?.email} />
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
            aria-invalid={Boolean(state.fieldErrors?.phone)}
            aria-describedby="phone-error"
            type="tel"
            required
            minLength={8}
            maxLength={30}
            defaultValue={values.phone}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <FieldError id="phone-error" message={state.fieldErrors?.phone} />
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
          aria-invalid={Boolean(state.fieldErrors?.document)}
          type="text"
          maxLength={50}
          defaultValue={values.document}
          aria-describedby="document-help document-error"
          className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <p id="document-help" className="mt-2 text-sm text-slate-500">
          Opcional.
        </p>
        <FieldError id="document-error" message={state.fieldErrors?.document} />
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
