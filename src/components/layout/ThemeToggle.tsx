"use client";

import { useEffect, useState } from "react";

type ThemeChoice = "system" | "light" | "dark";

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

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as ThemeChoice | null) ?? "system";
    setChoice(stored);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function onSystemChange() {
      if ((localStorage.getItem("theme") ?? "system") === "system") {
        applyTheme("system");
      }
    }
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  function select(next: ThemeChoice) {
    setChoice(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-slate-200 p-0.5 dark:border-slate-800">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => select(opt.value)}
          className={`rounded px-2 py-0.5 text-xs ${
            choice === opt.value
              ? "bg-amber-500 text-slate-950 dark:bg-amber-400"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
