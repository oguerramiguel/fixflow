"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { QuoteCommandFormState } from "./actions";

type QuoteCommandFormAction = (
  previousState: QuoteCommandFormState,
  formData: FormData
) => Promise<QuoteCommandFormState>;

type QuoteCommandFormProps = {
  action: QuoteCommandFormAction;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "danger";
};

function SubmitButton({
  label,
  pendingLabel,
  variant = "primary"
}: QuoteCommandFormProps) {
  const { pending } = useFormStatus();
  const className =
    variant === "danger"
      ? "inline-flex h-10 items-center justify-center rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      : variant === "secondary"
        ? "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        : "inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400";

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function QuoteCommandForm({
  action,
  label,
  pendingLabel,
  variant = "primary"
}: QuoteCommandFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction}>
      {state.error ? (
        <p
          role="alert"
          className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}
      <SubmitButton
        action={action}
        label={label}
        pendingLabel={pendingLabel}
        variant={variant}
      />
    </form>
  );
}
