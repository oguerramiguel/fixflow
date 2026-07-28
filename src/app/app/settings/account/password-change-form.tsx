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
      className="inline-flex h-11 w-full items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
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
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
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
        className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
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
        className="rounded-lg border border-emerald-200 bg-emerald-50 p-5"
      >
        <p className="text-sm font-semibold text-emerald-900">
          {state.success}
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
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
        <p id="new-password-help" className="mt-2 text-sm text-slate-600">
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

      <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Ao confirmar, todas as suas sessoes, inclusive esta, serao encerradas.
      </p>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
