import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { CheckIcon } from "@/components/ui/icons";
import { FixFlowLogo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getOptionalCurrentUser } from "@/server/auth/authenticated-context";

export default async function LoginPage() {
  const currentUser = await getOptionalCurrentUser();

  if (currentUser) {
    redirect("/app");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white dark:bg-[#0f131c]">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"><ThemeToggle compact /></div>
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)]">
        <section className="flex items-center justify-center px-5 py-16 sm:px-10 lg:px-14">
          <div className="w-full max-w-md">
            <FixFlowLogo href="/login" />
            <div className="mt-12">
              <p className="page-eyebrow">Bem-vindo de volta</p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950 dark:text-slate-50 sm:text-4xl">Acesse sua operação</h1>
              <p className="mt-3 text-base leading-7 muted-text">Entre com suas credenciais para acompanhar clientes, equipamentos e ordens de serviço.</p>
            </div>
            <LoginForm />
            <p className="mt-8 text-center text-xs leading-5 muted-text">Acesso protegido e restrito à equipe da sua organização.</p>
          </div>
        </section>

        <aside className="relative hidden overflow-hidden bg-[#0b2559] p-12 text-white lg:flex lg:flex-col lg:justify-between" aria-label="Apresentação do FixFlow">
          <div className="absolute -right-24 -top-24 size-[420px] rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-24 size-[520px] rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          <div className="relative flex items-center gap-3 text-sm font-semibold text-blue-100"><span className="size-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,.8)]" /> Gestão técnica, do início ao fim</div>
          <div className="relative max-w-xl">
            <h2 className="text-4xl font-bold leading-tight tracking-[-0.045em] xl:text-5xl">Clareza para cada etapa do atendimento.</h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-blue-100/80">Centralize a operação e mantenha toda a equipe alinhada, sem perder o histórico de cada equipamento.</p>
            <ul className="mt-10 grid gap-4 text-sm font-medium text-blue-50">
              {[
                "Ordens e status em um fluxo consistente",
                "Clientes e equipamentos sempre conectados",
                "Orçamentos e histórico em um só lugar"
              ].map((item) => <li key={item} className="flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-white/10"><CheckIcon className="size-4 text-cyan-200" /></span>{item}</li>)}
            </ul>
          </div>
          <p className="relative text-xs text-blue-200/70">FixFlow · Operação organizada, atendimento transparente.</p>
        </aside>
      </div>
    </main>
  );
}
