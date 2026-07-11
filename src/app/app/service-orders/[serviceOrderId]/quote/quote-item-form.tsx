"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { QuoteItemFormState, QuoteItemFormValues } from "./actions";

type QuoteItemFormAction = (
  previousState: QuoteItemFormState,
  formData: FormData
) => Promise<QuoteItemFormState>;

type QuoteItemFormProps = {
  action: QuoteItemFormAction;
  initialValues?: QuoteItemFormValues;
  submitLabel: string;
  pendingLabel: string;
  cancelHref?: string;
};

const emptyValues: QuoteItemFormValues = {
  description: "",
  quantity: "1",
  unitPrice: ""
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

export function QuoteItemForm({
  action,
  initialValues = emptyValues,
  submitLabel,
  pendingLabel,
  cancelHref
}: QuoteItemFormProps) {
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
          Descricao
        </label>
        <input
          id="description"
          name="description"
          type="text"
          required
          minLength={2}
          maxLength={250}
          defaultValue={values.description}
          className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <FieldError message={state.fieldErrors?.description} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="quantity"
            className="block text-sm font-medium text-slate-800"
          >
            Quantidade
          </label>
          <input
            id="quantity"
            name="quantity"
            type="text"
            inputMode="numeric"
            required
            defaultValue={values.quantity}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <FieldError message={state.fieldErrors?.quantity} />
        </div>

        <div>
          <label
            htmlFor="unitPrice"
            className="block text-sm font-medium text-slate-800"
          >
            Valor unitario
          </label>
          <input
            id="unitPrice"
            name="unitPrice"
            type="text"
            inputMode="decimal"
            required
            defaultValue={values.unitPrice}
            aria-describedby="unitPrice-help"
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <p id="unitPrice-help" className="mt-2 text-sm text-slate-500">
            Use ate duas casas decimais.
          </p>
          <FieldError message={state.fieldErrors?.unitPrice} />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton submitLabel={submitLabel} pendingLabel={pendingLabel} />
        {cancelHref ? (
          <Link
            href={cancelHref}
            className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            Cancelar
          </Link>
        ) : null}
      </div>
    </form>
  );
}
