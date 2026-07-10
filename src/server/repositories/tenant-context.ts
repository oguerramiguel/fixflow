export type TenantContext = {
  organizationId: string;
};

export function createTenantContext(organizationId: string): TenantContext {
  const normalizedOrganizationId = organizationId.trim();

  if (!normalizedOrganizationId) {
    throw new Error("organizationId is required to create a tenant context.");
  }

  return {
    organizationId: normalizedOrganizationId
  };
}
