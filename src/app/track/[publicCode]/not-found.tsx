import { FixFlowBrand } from "@/components/ui/logo";

export default function PublicTrackingNotFound() {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto w-full max-w-3xl">
        <FixFlowBrand />
        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          Ordem de servico nao encontrada.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Confira o codigo informado e tente acessar novamente.
        </p>
      </section>
    </main>
  );
}
