"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { logoutAction } from "@/app/app/actions";
import {
  AccountIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CustomersIcon,
  DashboardIcon,
  EquipmentIcon,
  LogoutIcon,
  MenuIcon,
  ServiceOrderIcon,
  TeamIcon
} from "@/components/ui/icons";
import { FixFlowLogo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/components/ui/utils";

type AppShellProps = {
  children: ReactNode;
  user: {
    name: string;
    role: string;
    organizationName: string;
    canManageUsers: boolean;
  };
};

const mainItems = [
  { href: "/app", label: "Dashboard", icon: DashboardIcon, exact: true },
  { href: "/app/service-orders", label: "Ordens de serviço", icon: ServiceOrderIcon },
  { href: "/app/customers", label: "Clientes", icon: CustomersIcon },
  { href: "/app/equipment", label: "Equipamentos", icon: EquipmentIcon }
];

const roleLabels: Record<string, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  TECHNICIAN: "Técnico"
};

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setCollapsed(localStorage.getItem("fixflow-sidebar") === "collapsed");
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("fixflow-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  const compact = mobileOpen ? false : collapsed;
  const navContent = (
    <>
      <div className={cn("flex h-20 items-center", compact ? "justify-center px-3" : "justify-between px-5")}>
        <FixFlowLogo compact={compact} />
        <button type="button" className="icon-button hidden size-9 lg:inline-flex" onClick={toggleCollapsed} aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}>
          {compact ? <ChevronRightIcon className="size-4" /> : <ChevronLeftIcon className="size-4" />}
        </button>
        <button type="button" className="icon-button size-9 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
          <CloseIcon className="size-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-4">
        <nav aria-label="Navegação principal" className="space-y-1">
          {!compact ? <p className="px-3 pb-2 pt-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-400">Operação</p> : null}
          {mainItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} title={compact ? item.label : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition", compact && "justify-center", active ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100")} aria-current={active ? "page" : undefined}>
                <Icon className="size-5 shrink-0" />
                {!compact ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <nav aria-label="Configurações" className="mt-auto space-y-1 pt-5">
          {!compact ? <p className="px-3 pb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-400">Configurações</p> : null}
          <Link href="/app/settings/account" onClick={() => setMobileOpen(false)} title={compact ? "Minha conta" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition", compact && "justify-center", isActive("/app/settings/account") ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100")}>
            <AccountIcon className="size-5 shrink-0" />
            {!compact ? <span>Minha conta</span> : null}
          </Link>
          {user.canManageUsers ? (
            <Link href="/app/settings/users" onClick={() => setMobileOpen(false)} title={compact ? "Usuários" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition", compact && "justify-center", isActive("/app/settings/users") ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100")}>
              <TeamIcon className="size-5 shrink-0" />
              {!compact ? <span>Usuários</span> : null}
            </Link>
          ) : null}
          <ThemeToggle compact={compact} />
        </nav>

        <div className={cn("mt-3 border-t pt-4", compact ? "px-0" : "px-2")}>
          {!compact ? (
            <div className="mb-3 min-w-0 px-1">
              <p className="truncate text-sm font-bold text-slate-950 dark:text-slate-100">{user.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{user.organizationName} · {roleLabels[user.role] ?? user.role}</p>
            </div>
          ) : null}
          <form action={logoutAction}>
            <button type="submit" title={compact ? "Sair" : undefined} className={cn("button-ghost w-full", compact ? "justify-center px-0" : "justify-start")}>
              <LogoutIcon className="size-5" />
              {!compact ? <span>Sair</span> : null}
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden border-r bg-white transition-[width] duration-200 dark:bg-[#121924] lg:flex lg:flex-col", collapsed ? "w-[76px]" : "w-[268px]")}>
        {navContent}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />
          <aside className="relative flex h-full w-[min(320px,88vw)] flex-col border-r bg-white shadow-2xl dark:bg-[#121924]">
            {navContent}
          </aside>
        </div>
      ) : null}

      <div className={cn("min-h-screen transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[268px]")}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur-xl dark:bg-[#0f131c]/90 sm:px-6 lg:hidden">
          <FixFlowLogo />
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <button type="button" className="icon-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" aria-expanded={mobileOpen}>
              <MenuIcon className="size-5" />
            </button>
          </div>
        </header>
        <main className="app-content px-4 py-6 sm:px-6 sm:py-8 xl:px-10 xl:py-10">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
