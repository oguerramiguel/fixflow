import { PasswordChangeForm } from "./password-change-form";

export default function AccountSettingsPage() {
  return (
    <section>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Configuracoes
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Minha conta</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Altere sua senha usando a credencial atual. A verificacao e feita
          novamente no servidor.
        </p>
      </div>

      <div className="mt-8 max-w-xl rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <PasswordChangeForm />
      </div>
    </section>
  );
}
