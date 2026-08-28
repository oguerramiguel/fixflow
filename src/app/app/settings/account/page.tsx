import { PasswordChangeForm } from "./password-change-form";
import { PageHeader } from "@/components/ui/primitives";

export default function AccountSettingsPage() {
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Configurações" title="Minha conta" description="Altere sua senha usando a credencial atual. A verificação é feita novamente no servidor." />
      <section className="surface-card max-w-xl p-5 sm:p-7" aria-label="Alteração de senha">
        <div className="mb-6 border-b pb-5"><h2 className="section-title">Segurança da conta</h2><p className="mt-2 text-sm leading-6 muted-text">Escolha uma senha exclusiva e mantenha suas credenciais protegidas.</p></div>
        <PasswordChangeForm />
      </section>
    </div>
  );
}
