"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  changeOwnPasswordAction,
  type PasswordChangeActionState
} from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="button-primary w-full sm:w-auto"
    >
      {pending ? "Alterando senha..." : "Alterar senha"}
    </button>
  );
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  error,
  describedBy
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  error?: string;
  describedBy?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        required
        minLength={name === "currentPassword" ? undefined : 12}
        maxLength={64}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [describedBy, error ? errorId : undefined].filter(Boolean).join(" ") ||
          undefined
        }
        className="form-input"
      />
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordChangeForm() {
  const [state, formAction] = useActionState<
    PasswordChangeActionState,
    FormData
  >(changeOwnPasswordAction, {});

  if (state.success) {
    return (
      <div
        role="status"
        className="alert-success p-5"
      >
        <p className="text-sm font-semibold text-emerald-900">
          {state.success}
        </p>
        <Link
          href="/login"
          className="button-primary mt-4"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <PasswordField
        id="current-password"
        name="currentPassword"
        label="Senha atual"
        autoComplete="current-password"
        error={state.fieldErrors?.currentPassword}
      />

      <div>
        <PasswordField
          id="new-password"
          name="newPassword"
          label="Nova senha"
          autoComplete="new-password"
          error={state.fieldErrors?.newPassword}
          describedBy="new-password-help"
        />
        <p id="new-password-help" className="form-hint">
          Use entre 12 e 64 caracteres. A nova senha deve ser diferente da
          atual.
        </p>
      </div>

      <PasswordField
        id="new-password-confirmation"
        name="newPasswordConfirmation"
        label="Confirmar nova senha"
        autoComplete="new-password"
        error={state.fieldErrors?.newPasswordConfirmation}
      />

      <p className="alert-warning leading-6">
        Ao confirmar, todas as suas sessões, inclusive esta, serão encerradas.
      </p>

      {state.error ? (
        <p
          role="alert"
          className="alert-error"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
