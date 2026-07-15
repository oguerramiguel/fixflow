-- CreateTable
CREATE TABLE "RateLimitCounter" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowExpiresAt" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAuditLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "subjectHash" TEXT,
    "originHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitCounter_operation_keyHash_windowStart_key" ON "RateLimitCounter"("operation", "keyHash", "windowStart");

-- CreateIndex
CREATE INDEX "RateLimitCounter_operation_keyHash_idx" ON "RateLimitCounter"("operation", "keyHash");

-- CreateIndex
CREATE INDEX "RateLimitCounter_windowExpiresAt_idx" ON "RateLimitCounter"("windowExpiresAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_createdAt_idx" ON "SecurityAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_eventType_createdAt_idx" ON "SecurityAuditLog"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_organizationId_createdAt_idx" ON "SecurityAuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_userId_createdAt_idx" ON "SecurityAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_subjectHash_idx" ON "SecurityAuditLog"("subjectHash");
