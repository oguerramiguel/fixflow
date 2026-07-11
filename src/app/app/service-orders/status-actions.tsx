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
      ? "inline-flex h-10 items-center justify-center rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      : "inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400";

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
    <section className="mt-8">
      <h3 className="text-xl font-bold text-slate-950">Acoes de status</h3>
      {state.error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
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
