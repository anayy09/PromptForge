"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Wand2,
  MessageSquare,
  Library,
  History,
  Settings,
  Sun,
  Moon,
  MonitorSmartphone,
  Palette,
  Rows3,
  Search,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";
import { useSettings } from "./providers";
import { Kbd } from "./controls";
import { ACCENT_PRESETS } from "@/lib/storage";

interface Action {
  id: string;
  group: "Go to" | "Theme" | "Accent" | "Density";
  label: string;
  icon: LucideIcon;
  hint?: string;
  /** Extra terms the filter matches beyond the label. */
  keywords?: string;
  run: () => void;
}

/**
 * Ctrl/Cmd+K command palette. Navigation and appearance in one keyboard
 * surface; a deliberate product affordance, not a modal-for-everything.
 */
export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setIndex(0);
  }, []);

  // Global hotkey. Ignores the shortcut while a native modal/select is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setIndex(0);
      } else if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const actions = useMemo<Action[]>(() => {
    const go = (href: string) => () => {
      if (pathname !== href) router.push(href);
    };
    const nav: Action[] = [
      { id: "go-enhance", group: "Go to", label: "Enhance", icon: Wand2, keywords: "improve prompt forge home", run: go("/") },
      { id: "go-chat", group: "Go to", label: "Chat", icon: MessageSquare, keywords: "assistant talk", run: go("/chat") },
      { id: "go-library", group: "Go to", label: "Library", icon: Library, keywords: "templates structures", run: go("/library") },
      { id: "go-history", group: "Go to", label: "History", icon: History, keywords: "past runs", run: go("/history") },
      { id: "go-settings", group: "Go to", label: "Settings", icon: Settings, keywords: "preferences appearance", run: go("/settings") },
    ];
    const theme: Action[] = [
      { id: "theme-light", group: "Theme", label: "Light theme", icon: Sun, run: () => update({ theme: "light" }) },
      { id: "theme-dark", group: "Theme", label: "Dark theme", icon: Moon, run: () => update({ theme: "dark" }) },
      { id: "theme-system", group: "Theme", label: "Match system theme", icon: MonitorSmartphone, run: () => update({ theme: "system" }) },
    ];
    const accent: Action[] = ACCENT_PRESETS.map((p) => ({
      id: `accent-${p.id}`,
      group: "Accent" as const,
      label: `${p.label} accent`,
      icon: Palette,
      hint: settings.accent === p.id ? "current" : undefined,
      keywords: "color hue",
      run: () => update({ accent: p.id }),
    }));
    const density: Action[] = (
      [
        ["compact", "Compact density"],
        ["comfortable", "Comfortable density"],
        ["relaxed", "Relaxed density"],
      ] as const
    ).map(([id, label]) => ({
      id: `density-${id}`,
      group: "Density" as const,
      label,
      icon: Rows3,
      hint: settings.density === id ? "current" : undefined,
      keywords: "spacing size scale",
      run: () => update({ density: id }),
    }));
    return [...nav, ...theme, ...accent, ...density];
  }, [pathname, router, settings.accent, settings.density, update]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) =>
      `${a.label} ${a.group} ${a.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [actions, query]);

  // Keep the highlighted row visible while arrowing through the list.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  const runAt = (i: number) => {
    const a = filtered[i];
    if (!a) return;
    close();
    a.run();
  };

  let lastGroup: string | null = null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 cursor-default bg-scrim/45"
        onClick={close}
      />
      <div className="relative w-full max-w-lg animate-pop-in overflow-hidden rounded-xl border border-hairline bg-raised shadow-lifted">
        <div className="flex items-center gap-2.5 border-b border-hairline px-4">
          <Search size={15} className="shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runAt(index);
              }
            }}
            placeholder="Where to, or what to change…"
            aria-label="Search commands"
            className="h-12 w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
          />
          <Kbd>esc</Kbd>
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-1.5" role="listbox">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted">
              Nothing matches “{query}”.
            </p>
          )}
          {filtered.map((a, i) => {
            const Icon = a.icon;
            const header = a.group !== lastGroup ? a.group : null;
            lastGroup = a.group;
            return (
              <div key={a.id}>
                {header && (
                  <p className="px-3 pb-1 pt-2.5 text-2xs font-medium uppercase tracking-wider text-faint">
                    {header}
                  </p>
                )}
                <button
                  data-index={i}
                  role="option"
                  aria-selected={i === index}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => runAt(i)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    i === index ? "bg-surface-2 text-ink" : "text-ink-soft"
                  }`}
                >
                  <Icon size={15} strokeWidth={2} aria-hidden className="shrink-0 text-muted" />
                  <span className="flex-1">{a.label}</span>
                  {a.hint && <span className="text-2xs text-ember">{a.hint}</span>}
                  {i === index && (
                    <CornerDownLeft size={13} aria-hidden className="text-faint" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-hairline px-4 py-2 text-2xs text-faint">
          <span className="inline-flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="inline-flex items-center gap-1"><Kbd>⏎</Kbd> select</span>
        </div>
      </div>
    </div>
  );
}
