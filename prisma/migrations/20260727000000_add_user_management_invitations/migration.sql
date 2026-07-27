-- Phase 8.2A: invited users can exist without a password until account setup.
ALTER TABLE "User"
  ALTER COLUMN "passwordHash" DROP NOT NULL,
  ADD COLUMN "disabledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserInvitation_state_check"
      CHECK (NOT ("usedAt" IS NOT NULL AND "revokedAt" IS NOT NULL))
);

-- CreateIndex
CREATE INDEX "User_organizationId_disabledAt_idx"
  ON "User"("organizationId", "disabledAt");

-- CreateIndex
CREATE INDEX "User_organizationId_role_disabledAt_idx"
  ON "User"("organizationId", "role", "disabledAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvitation_userId_key"
  ON "UserInvitation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvitation_tokenHash_key"
  ON "UserInvitation"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvitation_id_organizationId_key"
  ON "UserInvitation"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvitation_userId_organizationId_key"
  ON "UserInvitation"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "UserInvitation_organizationId_idx"
  ON "UserInvitation"("organizationId");

-- CreateIndex
CREATE INDEX "UserInvitation_expiresAt_idx"
  ON "UserInvitation"("expiresAt");

-- AddForeignKey
ALTER TABLE "UserInvitation"
  ADD CONSTRAINT "UserInvitation_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "Organization"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvitation"
  ADD CONSTRAINT "UserInvitation_userId_organizationId_fkey"
  FOREIGN KEY ("userId", "organizationId")
  REFERENCES "User"("id", "organizationId")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
