"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import type {
  ServiceOrderCreateFormState,
  ServiceOrderCreateFormValues
} from "./actions";

type ServiceOrderCreateFormAction = (
  previousState: ServiceOrderCreateFormState,
  formData: FormData
) => Promise<ServiceOrderCreateFormState>;

type ServiceOrderFormProps = {
  action: ServiceOrderCreateFormAction;
  cancelHref: string;
};

const emptyValues: ServiceOrderCreateFormValues = {
  reportedIssue: ""
};

function FieldError({ message, id }: { message?: string; id: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" className="mt-2 text-sm text-red-700">
      {message}
    </p>
  );
}

export function ServiceOrderForm({
  action,
  cancelHref
}: ServiceOrderFormProps) {
  const [state, formAction] = useActionState(action, {});
  const values = state.values ?? emptyValues;

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p
          role="alert"
          className="alert-error"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="reportedIssue"
          className="block text-sm font-medium text-slate-800"
        >
          Problema relatado
        </label>
        <textarea
          id="reportedIssue"
          name="reportedIssue"
          required
          minLength={5}
          maxLength={2000}
          rows={8}
          aria-invalid={Boolean(state.fieldErrors?.reportedIssue)}
          aria-describedby="reported-issue-hint reported-issue-error equipment-error"
          placeholder="Ex.: não liga; começou após uma queda; carregador foi entregue junto."
          defaultValue={values.reportedIssue}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <p id="reported-issue-hint" className="form-hint">Descreva o que acontece, quando começou e os acessórios recebidos. Use de 5 a 2.000 caracteres.</p>
        <FieldError id="reported-issue-error" message={state.fieldErrors?.reportedIssue} />
        <FieldError id="equipment-error" message={state.fieldErrors?.equipmentId} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton label="Criar ordem de serviço" pendingLabel="Criando…" />
        <Link
          href={cancelHref}
          className="button-secondary"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
