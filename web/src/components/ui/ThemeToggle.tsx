"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@/components/ui/icons";

const STORAGE_KEY = "tameout-theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function choose(next: boolean) {
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // storage can be blocked (private mode) — the theme still applies for this visit
    }
  }

  // Two-segment switch: the segment that is highlighted is the mode you are in
  // right now (Sun = Light, Moon = Dark). Earlier versions showed ONE icon for
  // the mode you would switch to, which read as "swapped".
  const seg = (active: boolean) =>
    "flex h-7 w-7 items-center justify-center rounded-full transition " +
    (active
      ? "bg-brand-500 text-white shadow-sm"
      : "text-ink-500 hover:text-ink-900");

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-full bg-ink-100 p-0.5"
    >
      <button
        type="button"
        onClick={() => choose(false)}
        aria-pressed={!isDark}
        aria-label="Light mode"
        title="Light mode"
        className={seg(!isDark)}
      >
        <Sun size={15} />
      </button>
      <button
        type="button"
        onClick={() => choose(true)}
        aria-pressed={isDark}
        aria-label="Dark mode"
        title="Dark mode"
        className={seg(isDark)}
      >
        <Moon size={15} />
      </button>
    </div>
  );
}

/** Inline, pre-hydration script — read once in <head> so there's no flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;
