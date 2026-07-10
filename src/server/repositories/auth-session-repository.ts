import { prisma } from "@/server/db/prisma";

export type AuthSessionRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
};

export type CreateAuthSessionRecordInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export async function createAuthSessionRecord(
  input: CreateAuthSessionRecordInput
): Promise<AuthSessionRecord> {
  return prisma.authSession.create({
    data: input,
    select: {
      id: true,
      userId: true,
      expiresAt: true
    }
  });
}

export async function findAuthSessionByTokenHash(
  tokenHash: string
): Promise<AuthSessionRecord | null> {
  return prisma.authSession.findUnique({
    where: {
      tokenHash
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true
    }
  });
}

export async function deleteAuthSessionByTokenHash(
  tokenHash: string
): Promise<void> {
  await prisma.authSession.deleteMany({
    where: {
      tokenHash
    }
  });
}
