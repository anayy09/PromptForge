"use client";

import { useSettings } from "./providers";
import type { Settings } from "@/lib/storage";

const OPTIONS: { value: Settings["theme"]; label: string; glyph: string }[] = [
  { value: "light", label: "Light", glyph: "☀" },
  { value: "dark", label: "Dark", glyph: "☾" },
  { value: "system", label: "System", glyph: "◐" },
];

export function ThemeToggle() {
  const { settings, update, hydrated } = useSettings();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center rounded border border-hairline bg-surface p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = hydrated && settings.theme === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            title={opt.label}
            onClick={() => update({ theme: opt.value })}
            className={`h-6 w-6 rounded-sm text-xs leading-none transition-colors ${
              active
                ? "bg-ember/15 text-ember"
                : "text-muted hover:text-ink hover:bg-surface-2"
            }`}
          >
            <span aria-hidden>{opt.glyph}</span>
          </button>
        );
      })}
    </div>
  );
}
