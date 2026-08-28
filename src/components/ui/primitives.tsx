import type { ReactNode } from "react";
import { cn } from "@/components/ui/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
        <h1 className={cn("page-title", eyebrow && "mt-2")}>{title}</h1>
        {description ? <div className="page-description">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
        <span className="text-xl" aria-hidden="true">·</span>
      </div>
      <h2 className="text-base font-bold text-slate-950 dark:text-slate-50">{title}</h2>
      {description ? <p className="mt-2 max-w-sm text-sm leading-6 muted-text">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Pagination({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="Paginacao" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </nav>
  );
}
