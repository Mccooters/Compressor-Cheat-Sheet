"use client";

import { useEffect, useSyncExternalStore } from "react";

type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "theme-change";

function applyTheme(choice: ThemeChoice) {
  const isDark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function getSnapshot(): ThemeChoice {
  return (localStorage.getItem(STORAGE_KEY) as ThemeChoice | null) ?? "system";
}

function getServerSnapshot(): ThemeChoice {
  return "system";
}

// Native "storage" events only fire in other tabs, not the one that made the
// write, so a same-tab click needs its own event to update the toggle's
// highlighted option without a setState-in-effect.
function subscribe(onStoreChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
}

export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function onSystemChange() {
      if ((localStorage.getItem(STORAGE_KEY) ?? "system") === "system") {
        applyTheme("system");
      }
    }
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  function select(next: ThemeChoice) {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-slate-200 p-0.5 dark:border-zinc-800">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => select(opt.value)}
          className={`rounded px-2 py-0.5 text-xs ${
            choice === opt.value
              ? "bg-orange-500 text-slate-950 dark:bg-orange-400"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
