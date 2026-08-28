import Link from "next/link";
import { cn } from "@/components/ui/utils";

type LogoProps = {
  compact?: boolean;
  href?: string;
  className?: string;
};

export function FixFlowLogo({ compact = false, href = "/app", className }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-3 rounded-xl", className)}
      aria-label="FixFlow"
    >
      <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
        <svg aria-hidden="true" viewBox="0 0 32 32" className="size-6" fill="none">
          <path d="M8 8h16M8 8v16M8 16h12" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="23" cy="22" r="3" fill="currentColor" />
        </svg>
      </span>
      {!compact ? (
        <span className="text-lg font-bold tracking-[-0.035em] text-slate-950 dark:text-slate-50">
          Fix<span className="text-brand-600 dark:text-brand-400">Flow</span>
        </span>
      ) : null}
    </Link>
  );
}
