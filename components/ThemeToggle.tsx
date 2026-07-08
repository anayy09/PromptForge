"use client";

import { Sun, Moon, MonitorSmartphone, type LucideIcon } from "lucide-react";
import { useSettings } from "./providers";
import type { Settings } from "@/lib/storage";

const OPTIONS: { value: Settings["theme"]; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: MonitorSmartphone },
];

export function ThemeToggle() {
  const { settings, update, hydrated } = useSettings();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center rounded-full border border-hairline bg-surface p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = hydrated && settings.theme === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            title={opt.label}
            onClick={() => update({ theme: opt.value })}
            className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${
              active
                ? "bg-ember/15 text-ember"
                : "text-muted hover:text-ink hover:bg-surface-2"
            }`}
          >
            <Icon size={14} aria-hidden strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
