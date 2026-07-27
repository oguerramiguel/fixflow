import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: {
      findFirst: mocks.findFirst
    }
  }
}));

import {
  findAuthenticatableUserById,
  findCurrentUserById,
  findUserByEmailForAuthentication
} from "@/server/repositories/auth-user-repository";

describe("auth user repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(null);
  });

  it("loads login data only with an existing organization and explicit account state", async () => {
    await findUserByEmailForAuthentication("owner@example.com");

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: "owner@example.com",
          organization: {
            is: {}
          }
        },
        select: expect.objectContaining({
          passwordHash: true,
          disabledAt: true
        })
      })
    );
  });

  it("requires an active configured user and valid organization for session context", async () => {
    await findAuthenticatableUserById("user-1");

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "user-1",
          disabledAt: null,
          passwordHash: {
            not: null
          },
          organization: {
            is: {}
          }
        }
      })
    );
  });

  it("applies the same active-user predicate to the current user DTO", async () => {
    await findCurrentUserById("user-1");

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "user-1",
          disabledAt: null,
          passwordHash: {
            not: null
          }
        })
      })
    );
  });
});
