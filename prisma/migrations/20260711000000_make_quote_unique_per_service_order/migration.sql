-- Enforce the Phase 5 MVP invariant: one Quote per ServiceOrder per Organization.
CREATE UNIQUE INDEX "Quote_serviceOrderId_organizationId_key" ON "Quote"("serviceOrderId", "organizationId");
