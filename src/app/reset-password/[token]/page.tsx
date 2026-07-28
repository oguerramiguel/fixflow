import { appConfig } from "@/lib/app";
import { PasswordResetForm } from "./password-reset-form";
import { enforceRateLimit } from "@/server/security/rate-limit-service";
import {
  RATE_LIMIT_EXCEEDED_MESSAGE,
  RateLimitExceededError,
  rateLimitOperations
} from "@/server/security/rate-limit-types";
import { getSecurityRequestOrigin } from "@/server/security/request-origin";
import { createPasswordResetSecuritySubject } from "@/server/security/security-identifiers";
import {
  isPasswordResetAvailable,
  PASSWORD_RESET_UNAVAILABLE_MESSAGE
} from "@/server/services/password-reset-service";

type PasswordResetPageProps = {
  params: Promise<{
    token: string;
  }>;
};

async function getPasswordResetPageState(
  token: string
): Promise<"available" | "rate_limited" | "unavailable"> {
  const origin = await getSecurityRequestOrigin();
  const subject = createPasswordResetSecuritySubject(token);

  try {
    await enforceRateLimit({
      operation: rateLimitOperations.passwordResetConsume,
      keyParts: [],
      subjectHash: subject.subjectHash,
      origin
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return "rate_limited";
    }

    throw error;
  }

  return (await isPasswordResetAvailable(token))
    ? "available"
    : "unavailable";
}

export default async function PasswordResetPage({
  params
}: PasswordResetPageProps) {
  const { token } = await params;
  const pageState = await getPasswordResetPageState(token);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          {appConfig.name}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          Redefinir senha
        </h1>

        {pageState === "available" ? (
          <>
            <p className="mt-3 text-base leading-7 text-slate-700">
              Defina uma nova senha. Este link funciona uma unica vez.
            </p>
            <PasswordResetForm token={token} />
          </>
        ) : (
          <p
            role="alert"
            className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {pageState === "rate_limited"
              ? RATE_LIMIT_EXCEEDED_MESSAGE
              : PASSWORD_RESET_UNAVAILABLE_MESSAGE}
          </p>
        )}
      </section>
    </main>
  );
}
