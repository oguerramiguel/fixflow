import { PrismaClient, UserRole } from "@prisma/client";
import { normalizeEmail } from "../src/domain/services/email";
import { hashPassword } from "../src/server/auth/password";

const prisma = new PrismaClient();

const requiredEnvironmentVariables = [
  "FIXFLOW_BOOTSTRAP_ORGANIZATION_NAME",
  "FIXFLOW_BOOTSTRAP_ORGANIZATION_SLUG",
  "FIXFLOW_BOOTSTRAP_USER_NAME",
  "FIXFLOW_BOOTSTRAP_USER_EMAIL",
  "FIXFLOW_BOOTSTRAP_USER_PASSWORD"
] as const;

type RequiredEnvironmentVariable =
  (typeof requiredEnvironmentVariables)[number];

function readRequiredEnvironmentVariable(
  name: RequiredEnvironmentVariable
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required to run the development bootstrap.`);
  }

  return value;
}

async function main(): Promise<void> {
  const organizationName = readRequiredEnvironmentVariable(
    "FIXFLOW_BOOTSTRAP_ORGANIZATION_NAME"
  );
  const organizationSlug = readRequiredEnvironmentVariable(
    "FIXFLOW_BOOTSTRAP_ORGANIZATION_SLUG"
  );
  const userName = readRequiredEnvironmentVariable(
    "FIXFLOW_BOOTSTRAP_USER_NAME"
  );
  const userEmail = normalizeEmail(
    readRequiredEnvironmentVariable("FIXFLOW_BOOTSTRAP_USER_EMAIL")
  );
  const userPassword = readRequiredEnvironmentVariable(
    "FIXFLOW_BOOTSTRAP_USER_PASSWORD"
  );
  const passwordHash = await hashPassword(userPassword);

  const organization = await prisma.organization.upsert({
    where: {
      slug: organizationSlug
    },
    update: {
      name: organizationName
    },
    create: {
      name: organizationName,
      slug: organizationSlug
    }
  });

  await prisma.user.upsert({
    where: {
      email: userEmail
    },
    update: {
      organizationId: organization.id,
      name: userName,
      passwordHash,
      role: UserRole.OWNER
    },
    create: {
      organizationId: organization.id,
      name: userName,
      email: userEmail,
      passwordHash,
      role: UserRole.OWNER
    }
  });

  console.log("Development bootstrap user is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
