"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ServiceOrderStatus } from "@/domain/entities/service-order";
import type { ServiceOrderTransitionFormState } from "./actions";

type ServiceOrderTransitionFormAction = (
  previousState: ServiceOrderTransitionFormState,
  formData: FormData
) => Promise<ServiceOrderTransitionFormState>;

export type ServiceOrderStatusAction = {
  targetStatus: ServiceOrderStatus;
  label: string;
  variant: "primary" | "danger";
};

type ServiceOrderStatusActionsProps = {
  action: ServiceOrderTransitionFormAction;
  actions: ServiceOrderStatusAction[];
};

function SubmitButton({
  label,
  variant
}: {
  label: string;
  variant: ServiceOrderStatusAction["variant"];
}) {
  const { pending } = useFormStatus();
  const className =
    variant === "danger"
      ? "button-danger min-h-10"
      : "button-primary min-h-10";

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Atualizando..." : label}
    </button>
  );
}

export function ServiceOrderStatusActions({
  action,
  actions
}: ServiceOrderStatusActionsProps) {
  const [state, formAction] = useActionState(action, {});

  if (actions.length === 0) {
    return null;
  }

  return (
    <section className="surface-card p-5 sm:p-6">
      <h2 className="section-title">Próximas etapas</h2>
      <p className="mt-1 text-sm muted-text">Avance o atendimento conforme o fluxo permitido.</p>
      {state.error ? (
        <p
          role="alert"
          className="alert-error mt-3"
        >
          {state.error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {actions.map((statusAction) => (
          <form key={statusAction.targetStatus} action={formAction}>
            <input
              type="hidden"
              name="targetStatus"
              value={statusAction.targetStatus}
            />
            <SubmitButton
              label={statusAction.label}
              variant={statusAction.variant}
            />
          </form>
        ))}
      </div>
    </section>
  );
}
