"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { PublicQuoteDecisionFormState } from "./actions";

type PublicQuoteDecisionFormAction = (
  previousState: PublicQuoteDecisionFormState,
  formData: FormData
) => Promise<PublicQuoteDecisionFormState>;

type PublicQuoteDecisionFormProps = {
  approveAction: PublicQuoteDecisionFormAction;
  rejectAction: PublicQuoteDecisionFormAction;
};

function DecisionSubmitButton({
  label,
  pendingLabel,
  variant
}: {
  label: string;
  pendingLabel: string;
  variant: "approve" | "reject";
}) {
  const { pending } = useFormStatus();
  const className =
    variant === "reject"
      ? "inline-flex min-h-11 items-center justify-center rounded-md border border-red-300 bg-white px-5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      : "inline-flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400";

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function DecisionForm({
  action,
  label,
  pendingLabel,
  variant
}: {
  action: PublicQuoteDecisionFormAction;
  label: string;
  pendingLabel: string;
  variant: "approve" | "reject";
}) {
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
      <DecisionSubmitButton
        label={label}
        pendingLabel={pendingLabel}
        variant={variant}
      />
    </form>
  );
}

export function PublicQuoteDecisionForm({
  approveAction,
  rejectAction
}: PublicQuoteDecisionFormProps) {
  return (
    <div>
      <p className="text-sm leading-6 text-slate-600">
        Esta acao registrara sua decisao sobre o orcamento.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <DecisionForm
          action={approveAction}
          label="Aprovar orcamento"
          pendingLabel="Aprovando..."
          variant="approve"
        />
        <DecisionForm
          action={rejectAction}
          label="Rejeitar orcamento"
          pendingLabel="Rejeitando..."
          variant="reject"
        />
      </div>
    </div>
  );
}
