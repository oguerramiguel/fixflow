"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
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
          Descrição
        </label>
        <input
          id="description"
          name="description"
          aria-invalid={Boolean(state.fieldErrors?.description)}
          aria-describedby="description-error"
          type="text"
          required
          minLength={2}
          maxLength={250}
          defaultValue={values.description}
          className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <FieldError id="description-error" message={state.fieldErrors?.description} />
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
            aria-invalid={Boolean(state.fieldErrors?.quantity)}
            aria-describedby="quantity-error"
            type="text"
            inputMode="numeric"
            required
            defaultValue={values.quantity}
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <FieldError id="quantity-error" message={state.fieldErrors?.quantity} />
        </div>

        <div>
          <label
            htmlFor="unitPrice"
            className="block text-sm font-medium text-slate-800"
          >
            Valor unitário
          </label>
          <input
            id="unitPrice"
            name="unitPrice"
            aria-invalid={Boolean(state.fieldErrors?.unitPrice)}
            type="text"
            inputMode="decimal"
            required
            defaultValue={values.unitPrice}
            aria-describedby="unitPrice-help unitPrice-error"
            className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <p id="unitPrice-help" className="mt-2 text-sm text-slate-500">
            Use até duas casas decimais, sem símbolo de moeda. Ex.: 120,50 ou 120.50.
          </p>
          <FieldError id="unitPrice-error" message={state.fieldErrors?.unitPrice} />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
        {cancelHref ? (
          <Link
            href={cancelHref}
            className="button-secondary"
          >
            Cancelar
          </Link>
        ) : null}
      </div>
    </form>
  );
}
