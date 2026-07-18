"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ACCENT_PRESETS,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/storage";

interface SettingsCtx {
  settings: Settings;
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
  resolvedTheme: "light" | "dark";
}

const Ctx = createContext<SettingsCtx | null>(null);

function applyTheme(theme: Settings["theme"]): "light" | "dark" {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-color-scheme: dark)").matches);
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", dark);
  }
  return dark ? "dark" : "light";
}

/** Appearance settings ride on the root element: accent hue, density, motion. */
function applyAppearance(s: Settings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const hue = ACCENT_PRESETS.find((p) => p.id === s.accent)?.hue ?? 46;
  root.style.setProperty("--accent-h", String(hue));
  if (s.density === "comfortable") root.removeAttribute("data-density");
  else root.setAttribute("data-density", s.density);
  if (s.motion === "reduced") root.setAttribute("data-motion", "reduced");
  else root.removeAttribute("data-motion");
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Load persisted settings once on mount.
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setResolvedTheme(applyTheme(loaded.theme));
    applyAppearance(loaded);
    setHydrated(true);
  }, []);

  // React to OS theme changes while in "system" mode.
  useEffect(() => {
    if (settings.theme !== "system" || typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedTheme(applyTheme("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings.theme]);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      if (patch.theme) setResolvedTheme(applyTheme(patch.theme));
      if (patch.accent || patch.density || patch.motion) applyAppearance(next);
      return next;
    });
  };

  const value = useMemo<SettingsCtx>(
    () => ({ settings, hydrated, update, resolvedTheme }),
    [settings, hydrated, resolvedTheme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings must be used within <Providers>");
  return ctx;
}
