import { redirect } from "next/navigation";
import { logoutAction } from "@/app/app/actions";
import { AuthenticationError } from "@/domain/errors/authentication-error";
import { appConfig } from "@/lib/app";
import { requireCurrentUser } from "@/server/auth/authenticated-context";

async function getProtectedUser() {
  try {
    return await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect("/login");
    }

    throw error;
  }
}

export default async function AppPage() {
  const currentUser = await getProtectedUser();

  return (
    <main className="min-h-screen px-6 py-12">
      <section className="mx-auto w-full max-w-3xl">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {appConfig.name}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Ola, {currentUser.name}
            </h1>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              Sair
            </button>
          </form>
        </div>

        <dl className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">
              Organizacao
            </dt>
            <dd className="mt-1 text-lg font-semibold text-slate-950">
              {currentUser.organization.name}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Perfil</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-950">
              {currentUser.role}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Email</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-950">
              {currentUser.email}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Status</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-950">
              Projeto em desenvolvimento.
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
