-- Phase 8.2B: assisted password recovery tokens and retention indexes.
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PasswordResetToken_state_check"
      CHECK (NOT ("usedAt" IS NOT NULL AND "revokedAt" IS NOT NULL))
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"
  ON "PasswordResetToken"("tokenHash");

CREATE UNIQUE INDEX "PasswordResetToken_id_organizationId_key"
  ON "PasswordResetToken"("id", "organizationId");

-- Prisma cannot currently express this partial unique index in schema.prisma.
-- It guarantees at most one unconsumed and unrevoked token per target User.
CREATE UNIQUE INDEX "PasswordResetToken_pending_user_key"
  ON "PasswordResetToken"("organizationId", "userId")
  WHERE "usedAt" IS NULL AND "revokedAt" IS NULL;

CREATE INDEX "PasswordResetToken_organizationId_idx"
  ON "PasswordResetToken"("organizationId");

CREATE INDEX "PasswordResetToken_organizationId_userId_idx"
  ON "PasswordResetToken"("organizationId", "userId");

CREATE INDEX "PasswordResetToken_expiresAt_idx"
  ON "PasswordResetToken"("expiresAt");

CREATE INDEX "PasswordResetToken_usedAt_idx"
  ON "PasswordResetToken"("usedAt");

CREATE INDEX "PasswordResetToken_revokedAt_idx"
  ON "PasswordResetToken"("revokedAt");

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "Organization"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_organizationId_fkey"
  FOREIGN KEY ("userId", "organizationId")
  REFERENCES "User"("id", "organizationId")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_createdByUserId_organizationId_fkey"
  FOREIGN KEY ("createdByUserId", "organizationId")
  REFERENCES "User"("id", "organizationId")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- Retention jobs filter closed invitations by their terminal timestamps.
CREATE INDEX "UserInvitation_usedAt_idx" ON "UserInvitation"("usedAt");
CREATE INDEX "UserInvitation_revokedAt_idx" ON "UserInvitation"("revokedAt");
