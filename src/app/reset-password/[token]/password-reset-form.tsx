"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  completePasswordResetAction,
  type PasswordResetActionState
} from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? "Redefinindo..." : "Redefinir senha"}
    </button>
  );
}

export function PasswordResetForm({ token }: { token: string }) {
  const action = completePasswordResetAction.bind(null, token);
  const [state, formAction] = useActionState<
    PasswordResetActionState,
    FormData
  >(action, {});

  if (state.success) {
    return (
      <div
        role="status"
        className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-5"
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
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-800"
        >
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={64}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby="password-help password-error"
          className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <p id="password-help" className="mt-2 text-sm text-slate-600">
          Use entre 12 e 64 caracteres.
        </p>
        {state.fieldErrors?.password ? (
          <p id="password-error" className="mt-2 text-sm text-red-700">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="passwordConfirmation"
          className="block text-sm font-medium text-slate-800"
        >
          Confirmar nova senha
        </label>
        <input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={64}
          aria-invalid={Boolean(state.fieldErrors?.passwordConfirmation)}
          aria-describedby="password-confirmation-error"
          className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        {state.fieldErrors?.passwordConfirmation ? (
          <p
            id="password-confirmation-error"
            className="mt-2 text-sm text-red-700"
          >
            {state.fieldErrors.passwordConfirmation}
          </p>
        ) : null}
      </div>

      <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        A redefinicao encerrara todas as sessoes existentes desta conta.
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
