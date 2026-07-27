"use client";

import type { UserRole } from "@prisma/client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  changeUserRoleAction,
  disableUserAction,
  reactivateUserAction,
  reissueInvitationAction,
  revokeInvitationAction,
  revokeUserSessionsAction,
  type UserManagementActionState
} from "./actions";
import { InvitationLinkPanel } from "./invitation-link-panel";
import type {
  OrganizationUserStatus,
  UserInvitationStatus
} from "@/server/services/user-management-service";

type UserActionsProps = {
  userId: string;
  role: UserRole;
  status: OrganizationUserStatus;
  invitationStatus?: UserInvitationStatus;
  isCurrentUser: boolean;
};

type BoundUserAction = (
  previousState: UserManagementActionState,
  formData: FormData
) => Promise<UserManagementActionState>;

function SubmitButton({
  label,
  pendingLabel,
  variant = "secondary"
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();
  const className =
    variant === "danger"
      ? "inline-flex min-h-10 items-center justify-center rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      : variant === "primary"
        ? "inline-flex min-h-10 items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
        : "inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function ActionFeedback({ state }: { state: UserManagementActionState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {state.error}
      </p>
    );
  }

  return state.success ? (
    <p
      role="status"
      className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
    >
      {state.success}
    </p>
  ) : null;
}

function RoleForm({
  action,
  currentRole,
  fieldId
}: {
  action: BoundUserAction;
  currentRole: UserRole;
  fieldId: string;
}) {
  const [state, formAction] = useActionState<
    UserManagementActionState,
    FormData
  >(action, {});

  return (
    <div>
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={fieldId} className="sr-only">
          Nova funcao
        </label>
        <select
          id={fieldId}
          name="role"
          defaultValue={currentRole}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        >
          <option value="OWNER">Proprietario</option>
          <option value="ADMIN">Administrador</option>
          <option value="TECHNICIAN">Tecnico</option>
        </select>
        <SubmitButton label="Alterar funcao" pendingLabel="Alterando..." />
      </form>
      <ActionFeedback state={state} />
    </div>
  );
}

function ConfirmedActionForm({
  action,
  confirmation,
  label,
  pendingLabel,
  variant
}: {
  action: BoundUserAction;
  confirmation?: string;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const [state, formAction] = useActionState<
    UserManagementActionState,
    FormData
  >(action, {});

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (confirmation && !window.confirm(confirmation)) {
            event.preventDefault();
          }
        }}
      >
        <SubmitButton
          label={label}
          pendingLabel={pendingLabel}
          variant={variant}
        />
      </form>
      <ActionFeedback state={state} />
      {state.setupPath ? (
        <InvitationLinkPanel
          setupPath={state.setupPath}
          expiresAt={state.expiresAt}
        />
      ) : null}
    </div>
  );
}

export function UserActions({
  userId,
  role,
  status,
  invitationStatus,
  isCurrentUser
}: UserActionsProps) {
  const roleAction = changeUserRoleAction.bind(null, userId);
  const disableAction = disableUserAction.bind(null, userId);
  const reactivateAction = reactivateUserAction.bind(null, userId);
  const sessionsAction = revokeUserSessionsAction.bind(null, userId);
  const invitationAction = revokeInvitationAction.bind(null, userId);
  const reissueAction = reissueInvitationAction.bind(null, userId);
  const canReissueInvitation =
    status === "INVITED" &&
    (invitationStatus === "EXPIRED" || invitationStatus === "REVOKED");

  return (
    <div className="space-y-3">
      {!isCurrentUser ? (
        <RoleForm
          action={roleAction}
          currentRole={role}
          fieldId={`role-${userId}`}
        />
      ) : (
        <p className="text-sm text-slate-600">
          Sua propria funcao nao pode ser alterada aqui.
        </p>
      )}

      <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap">
        {status === "DISABLED" ? (
          <ConfirmedActionForm
            action={reactivateAction}
            label="Reativar"
            pendingLabel="Reativando..."
            variant="primary"
          />
        ) : !isCurrentUser ? (
          <ConfirmedActionForm
            action={disableAction}
            confirmation="Desativar este usuario e revogar todas as sessoes?"
            label="Desativar"
            pendingLabel="Desativando..."
            variant="danger"
          />
        ) : null}

        <ConfirmedActionForm
          action={sessionsAction}
          confirmation={
            isCurrentUser
              ? "Revogar todas as suas sessoes? Voce precisara entrar novamente."
              : "Revogar todas as sessoes deste usuario?"
          }
          label="Revogar sessoes"
          pendingLabel="Revogando..."
        />

        {status === "INVITED" && invitationStatus === "PENDING" ? (
          <ConfirmedActionForm
            action={invitationAction}
            confirmation="Revogar este convite? O link atual deixara de funcionar."
            label="Revogar convite"
            pendingLabel="Revogando..."
            variant="danger"
          />
        ) : null}

        {canReissueInvitation ? (
          <ConfirmedActionForm
            action={reissueAction}
            label="Gerar novo link"
            pendingLabel="Gerando..."
          />
        ) : null}
      </div>
    </div>
  );
}
