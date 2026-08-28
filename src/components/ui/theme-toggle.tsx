"use client";

import { MoonIcon, SunIcon } from "@/components/ui/icons";

type Theme = "light" | "dark";

function getAppliedTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  function toggleTheme() {
    const nextTheme: Theme = getAppliedTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem("fixflow-theme", nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={compact ? "icon-button" : "button-ghost w-full justify-start"}
      aria-label="Alternar tema"
      title="Alternar tema"
    >
      <SunIcon className="hidden size-5 dark:block" />
      <MoonIcon className="size-5 dark:hidden" />
      {!compact ? <span>Alternar tema</span> : null}
    </button>
  );
}
