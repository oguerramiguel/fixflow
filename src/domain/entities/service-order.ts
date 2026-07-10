export const serviceOrderStatuses = [
  "RECEIVED",
  "IN_DIAGNOSIS",
  "WAITING_FOR_APPROVAL",
  "APPROVED",
  "IN_REPAIR",
  "FINAL_TESTING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED"
] as const;

export type ServiceOrderStatus = (typeof serviceOrderStatuses)[number];
