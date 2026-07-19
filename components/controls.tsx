"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        {hint && <span className="text-2xs text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  /** Secondary text shown right-aligned in the list, e.g. a category. */
  hint?: string;
  /** Optional group header the option renders under. */
  group?: string;
}

/**
 * Custom listbox select. Replaces native <select> so the open menu matches the
 * design system on every OS instead of the browser's built-in dropdown.
 * Keyboard: Enter/Space/ArrowDown opens, arrows move, Enter picks, Esc closes.
 */
export function Select({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = "Select…",
  variant = "field",
  leading,
  menuPlacement = "bottom",
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  placeholder?: string;
  /** "field": block form control. "pill": compact inline chip. */
  variant?: "field" | "pill";
  /** Optional icon rendered before the label in the trigger. */
  leading?: ReactNode;
  /** Where the menu opens; use "top" for selects docked near the viewport bottom. */
  menuPlacement?: "bottom" | "top";
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const i = Math.max(0, options.findIndex((o) => o.value === value));
      setIndex(i);
      requestAnimationFrame(() =>
        listRef.current
          ?.querySelector(`[data-index="${i}"]`)
          ?.scrollIntoView({ block: "nearest" }),
      );
    }
  }, [open, options, value]);

  const move = (delta: number) => {
    setIndex((i) => {
      const next = Math.min(Math.max(i + delta, 0), options.length - 1);
      listRef.current
        ?.querySelector(`[data-index="${next}"]`)
        ?.scrollIntoView({ block: "nearest" });
      return next;
    });
  };

  const pick = (i: number) => {
    const opt = options[i];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  };

  const triggerClass =
    variant === "pill"
      ? "inline-flex w-auto items-center gap-1.5 rounded-full border border-hairline bg-surface py-1 pl-2.5 pr-2 text-xs font-medium text-ink transition-colors hover:border-hairline-strong"
      : "flex w-full items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-hairline-strong";

  let lastGroup: string | undefined;

  return (
    <div ref={rootRef} className={variant === "pill" ? "relative inline-flex" : "relative"}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
          } else if (open) {
            if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
            else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
            else if (e.key === "Enter") { e.preventDefault(); pick(index); }
            else if (e.key === "Tab") setOpen(false);
          }
        }}
        className={`${triggerClass} ${open ? "border-ember" : ""} focus:border-ember focus:outline-none`}
      >
        {leading && <span className="shrink-0 text-ember">{leading}</span>}
        <span className={`min-w-0 flex-1 truncate text-left ${selected ? "" : "text-faint"}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={variant === "pill" ? 13 : 14}
          aria-hidden
          className={`shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute left-0 z-40 max-h-72 w-full min-w-52 animate-pop-in overflow-y-auto rounded-xl border border-hairline bg-raised p-1 shadow-lifted ${
            menuPlacement === "top" ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
          }`}
        >
          {options.map((o, i) => {
            const header = o.group && o.group !== lastGroup ? o.group : null;
            lastGroup = o.group;
            const active = o.value === value;
            return (
              <div key={`${o.value}-${i}`}>
                {header && (
                  <p className="px-2.5 pb-1 pt-2 text-2xs font-medium uppercase tracking-wider text-faint">
                    {header}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-index={i}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => pick(i)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                    i === index ? "bg-surface-2 text-ink" : "text-ink-soft"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-2xs text-faint">{o.hint}</span>}
                  {active && <Check size={13} aria-hidden className="shrink-0 text-ember" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex w-full rounded-full border border-hairline bg-surface p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-full px-2 py-1 text-2xs font-medium transition-colors ${
              active ? "bg-ember/15 text-ember" : "text-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Keyboard-hint chip, e.g. <Kbd>⌘K</Kbd>. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-hairline bg-surface px-1.5 py-0.5 font-mono text-2xs text-muted shadow-[inset_0_-1px_0_oklch(var(--hairline))]">
      {children}
    </kbd>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-left"
    >
      <span
        className={`relative h-4 w-7 shrink-0 rounded-full border transition-colors ${
          checked ? "border-ember bg-ember/30" : "border-hairline-strong bg-surface-2"
        }`}
      >
        <span
          className={`absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all ${
            checked ? "left-3.5 bg-ember" : "left-0.5 bg-muted"
          }`}
        />
      </span>
      <span className="text-xs text-ink-soft">{label}</span>
    </button>
  );
}
