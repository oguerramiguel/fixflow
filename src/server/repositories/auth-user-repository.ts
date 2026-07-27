import type { UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type AuthUserForLogin = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  passwordHash: string | null;
  role: UserRole;
  disabledAt: Date | null;
};

export type AuthenticatedContextUserRecord = {
  id: string;
  organizationId: string;
  role: UserRole;
};

export type CurrentUserRecord = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

export async function findUserByEmailForAuthentication(
  normalizedEmail: string
): Promise<AuthUserForLogin | null> {
  return prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      organization: {
        is: {}
      }
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      disabledAt: true
    }
  });
}

export async function findAuthenticatableUserById(
  userId: string
): Promise<AuthenticatedContextUserRecord | null> {
  return prisma.user.findFirst({
    where: {
      id: userId,
      disabledAt: null,
      passwordHash: {
        not: null
      },
      organization: {
        is: {}
      }
    },
    select: {
      id: true,
      organizationId: true,
      role: true
    }
  });
}

export async function findCurrentUserById(
  userId: string
): Promise<CurrentUserRecord | null> {
  return prisma.user.findFirst({
    where: {
      id: userId,
      disabledAt: null,
      passwordHash: {
        not: null
      },
      organization: {
        is: {}
      }
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      email: true,
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });
}
