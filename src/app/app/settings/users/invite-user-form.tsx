"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  inviteUserAction,
  type UserManagementActionState
} from "./actions";
import { InvitationLinkPanel } from "./invitation-link-panel";

function InviteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="button-primary"
    >
      {pending ? "Criando convite..." : "Convidar usuário"}
    </button>
  );
}

export function InviteUserForm() {
  const [state, formAction] = useActionState<
    UserManagementActionState,
    FormData
  >(inviteUserAction, {});

  return (
    <div className="surface-card p-5 sm:p-6">
      <h2 className="section-title">Novo convite</h2>
      <p className="mt-2 text-sm leading-6 muted-text">
        A pessoa definirá a própria senha pelo link gerado. Copie o link e
        compartilhe com ela. O envio é manual.
      </p>

      <form action={formAction} className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="invite-name" className="form-label">
            Nome
          </label>
          <input
            id="invite-name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            defaultValue={state.values?.name}
            aria-describedby="invite-name-error"
            className="form-input"
          />
          {state.fieldErrors?.name ? (
            <p id="invite-name-error" className="mt-2 text-sm text-red-700">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="invite-email"
            className="form-label"
          >
            Email
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            defaultValue={state.values?.email}
            aria-describedby="invite-email-error"
            className="form-input"
          />
          {state.fieldErrors?.email ? (
            <p id="invite-email-error" className="mt-2 text-sm text-red-700">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="invite-role"
            className="form-label"
          >
            Função
          </label>
          <select
            id="invite-role"
            name="role"
            required
            defaultValue={state.values?.role ?? "TECHNICIAN"}
            aria-describedby="invite-role-error"
            className="form-input"
          >
            <option value="OWNER">Proprietário</option>
            <option value="ADMIN">Administrador</option>
            <option value="TECHNICIAN">Técnico</option>
          </select>
          {state.fieldErrors?.role ? (
            <p id="invite-role-error" className="mt-2 text-sm text-red-700">
              {state.fieldErrors.role}
            </p>
          ) : null}
        </div>

        <div className="flex items-end">
          <InviteSubmitButton />
        </div>
      </form>

      {state.error ? (
        <p
          role="alert"
          className="alert-error mt-4"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="alert-success mt-4"
        >
          {state.success}
        </p>
      ) : null}

      {state.setupPath ? (
        <InvitationLinkPanel
          setupPath={state.setupPath}
          expiresAt={state.expiresAt}
        />
      ) : null}
    </div>
  );
}
