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
      ? "button-danger w-full sm:w-auto"
      : "button-primary w-full sm:w-auto";

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
          className="alert-error mb-3"
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
      <p className="text-sm leading-6 muted-text">
        Esta ação registrará sua decisão sobre o orçamento.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <DecisionForm
          action={approveAction}
          label="Aprovar orçamento"
          pendingLabel="Aprovando..."
          variant="approve"
        />
        <DecisionForm
          action={rejectAction}
          label="Rejeitar orçamento"
          pendingLabel="Rejeitando..."
          variant="reject"
        />
      </div>
    </div>
  );
}
