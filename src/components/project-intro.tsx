import { appConfig } from "@/lib/app";

export function ProjectIntro() {
  return (
    <section className="w-full max-w-3xl">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-700">
        {appConfig.statusLabel}
      </p>
      <h1 className="text-4xl font-bold text-slate-950 sm:text-5xl">
        {appConfig.name}
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
        {appConfig.description}
      </p>
    </section>
  );
}
