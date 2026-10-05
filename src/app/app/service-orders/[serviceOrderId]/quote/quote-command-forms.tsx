"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { QuoteCommandFormState } from "./actions";
import { ConfirmableForm } from "@/components/ui/confirmable-form";

type QuoteCommandFormAction = (
  previousState: QuoteCommandFormState,
  formData: FormData
) => Promise<QuoteCommandFormState>;

type QuoteCommandFormProps = {
  action: QuoteCommandFormAction;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "danger";
  confirmation?: string;
  disabled?: boolean;
};

function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
  disabled = false
}: QuoteCommandFormProps) {
  const { pending } = useFormStatus();
  const className =
    variant === "danger"
      ? "button-danger"
      : variant === "secondary"
        ? "button-secondary"
        : "button-primary";

  return (
    <button type="submit" disabled={pending || disabled} aria-busy={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function QuoteCommandForm({
  action,
  label,
  pendingLabel,
  variant = "primary",
  confirmation,
  disabled
}: QuoteCommandFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <ConfirmableForm action={formAction} confirmation={confirmation}>
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
        disabled={disabled}
      />
    </ConfirmableForm>
  );
}
