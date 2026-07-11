import {
  isServiceOrderStatus,
  type ServiceOrderStatus
} from "@/domain/entities/service-order";

export const SERVICE_ORDER_REPORTED_ISSUE_MIN_LENGTH = 5;
export const SERVICE_ORDER_REPORTED_ISSUE_MAX_LENGTH = 2000;
export const SERVICE_ORDER_RESOURCE_ID_MAX_LENGTH = 128;

export type ServiceOrderField = "equipmentId" | "reportedIssue" | "status";

export type ServiceOrderCreateInput = {
  equipmentId: string;
  reportedIssue: string;
};

export type ValidatedServiceOrderCreateInput = {
  equipmentId: string;
  reportedIssue: string;
};

export type ServiceOrderValidationResult<TData> =
  | {
      valid: true;
      data: TData;
    }
  | {
      valid: false;
      fieldErrors: Partial<Record<ServiceOrderField, string>>;
    };

const resourceIdPattern = /^[A-Za-z0-9_-]+$/;

function validateResourceId(
  value: string,
  field: "equipmentId",
  label: string,
  fieldErrors: Partial<Record<ServiceOrderField, string>>
): string {
  const resourceId = value.trim();

  if (!resourceId) {
    fieldErrors[field] = `${label} e obrigatorio.`;
  } else if (
    resourceId.length > SERVICE_ORDER_RESOURCE_ID_MAX_LENGTH ||
    !resourceIdPattern.test(resourceId)
  ) {
    fieldErrors[field] = `${label} informado e invalido.`;
  }

  return resourceId;
}

export function validateServiceOrderCreateInput(
  input: ServiceOrderCreateInput
): ServiceOrderValidationResult<ValidatedServiceOrderCreateInput> {
  const fieldErrors: Partial<Record<ServiceOrderField, string>> = {};
  const equipmentId = validateResourceId(
    input.equipmentId,
    "equipmentId",
    "Equipamento",
    fieldErrors
  );
  const reportedIssue = input.reportedIssue.trim();

  if (!reportedIssue) {
    fieldErrors.reportedIssue = "Descreva o problema relatado pelo cliente.";
  } else if (reportedIssue.length < SERVICE_ORDER_REPORTED_ISSUE_MIN_LENGTH) {
    fieldErrors.reportedIssue = `Problema relatado deve ter pelo menos ${SERVICE_ORDER_REPORTED_ISSUE_MIN_LENGTH} caracteres.`;
  } else if (reportedIssue.length > SERVICE_ORDER_REPORTED_ISSUE_MAX_LENGTH) {
    fieldErrors.reportedIssue = `Problema relatado deve ter no maximo ${SERVICE_ORDER_REPORTED_ISSUE_MAX_LENGTH} caracteres.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      fieldErrors
    };
  }

  return {
    valid: true,
    data: {
      equipmentId,
      reportedIssue
    }
  };
}

export function validateServiceOrderStatusInput(
  value: string | undefined
): ServiceOrderValidationResult<ServiceOrderStatus | undefined> {
  const status = value?.trim() ?? "";

  if (!status) {
    return {
      valid: true,
      data: undefined
    };
  }

  if (!isServiceOrderStatus(status)) {
    return {
      valid: false,
      fieldErrors: {
        status: "Status informado e invalido."
      }
    };
  }

  return {
    valid: true,
    data: status
  };
}

export function validateRequiredServiceOrderStatusInput(
  value: string
): ServiceOrderValidationResult<ServiceOrderStatus> {
  const status = value.trim();

  if (!isServiceOrderStatus(status)) {
    return {
      valid: false,
      fieldErrors: {
        status: "Status informado e invalido."
      }
    };
  }

  return {
    valid: true,
    data: status
  };
}
