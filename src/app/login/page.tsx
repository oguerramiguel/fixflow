import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { appConfig } from "@/lib/app";
import { getOptionalCurrentUser } from "@/server/auth/authenticated-context";

export default async function LoginPage() {
  const currentUser = await getOptionalCurrentUser();

  if (currentUser) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-md">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-700">
          {appConfig.name}
        </p>
        <h1 className="text-3xl font-bold text-slate-950">
          Acesso interno
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-700">
          Entre com seu email e senha para acessar a area protegida.
        </p>

        <LoginForm />
      </section>
    </main>
  );
}
