"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/categories";
import type { AppCategory } from "@/lib/registry";
import type { ClassifyResponse } from "@/lib/schema";

// Concrete class maps so Tailwind's JIT sees them (no dynamic string building).
const TONE = {
  ember: {
    on: "border-ember bg-ember/[0.08] text-ink",
    glyph: "text-ember",
    ring: "shadow-[inset_0_0_0_1px_oklch(var(--ember)/0.35)]",
  },
  steel: {
    on: "border-steel bg-steel/[0.08] text-ink",
    glyph: "text-steel",
    ring: "shadow-[inset_0_0_0_1px_oklch(var(--steel)/0.35)]",
  },
} as const;

export function CategoryPicker({
  value,
  onChange,
  rawPrompt,
}: {
  value: AppCategory;
  onChange: (c: AppCategory) => void;
  /** When provided, enables the auto-route button that classifies this text. */
  rawPrompt?: string;
}) {
  const active = CATEGORIES[value];
  const [routing, setRouting] = useState(false);
  const [detected, setDetected] = useState<ClassifyResponse | null>(null);
  const [routeErr, setRouteErr] = useState<string | null>(null);

  const canRoute = (rawPrompt?.trim().length ?? 0) > 0;

  const autoRoute = async () => {
    if (!canRoute || routing) return;
    setRouting(true);
    setRouteErr(null);
    setDetected(null);
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawPrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRouteErr(data.error ?? "Auto-route failed.");
        return;
      }
      const d = data as ClassifyResponse;
      setDetected(d);
      onChange(d.category);
    } catch {
      setRouteErr("Network error.");
    } finally {
      setRouting(false);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-2xs uppercase tracking-[0.2em] text-muted">Category</span>
        <div className="flex items-center gap-3">
          {rawPrompt !== undefined && (
            <button
              onClick={autoRoute}
              disabled={!canRoute || routing}
              title="Detect the best category from your prompt"
              className="text-2xs text-ember underline-offset-2 hover:underline disabled:text-faint disabled:no-underline"
            >
              {routing ? "routing..." : "[~] auto-route"}
            </button>
          )}
          <span className="text-2xs text-faint">{active.targetNote}</span>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Prompt category"
        className="flex flex-wrap gap-1.5"
      >
        {CATEGORY_ORDER.map((id) => {
          const cat = CATEGORIES[id];
          const selected = id === value;
          const tone = TONE[cat.tone];
          return (
            <button
              key={id}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(id)}
              className={`group flex items-center gap-2 rounded border px-3 py-2 text-left transition-all duration-150 ${
                selected
                  ? `${tone.on} ${tone.ring}`
                  : "border-hairline bg-surface text-ink-soft hover:border-hairline-strong hover:bg-surface-2"
              }`}
            >
              <span
                className={`font-mono text-sm font-semibold ${
                  selected ? tone.glyph : "text-muted group-hover:text-ink-soft"
                }`}
              >
                {cat.glyph}
              </span>
              <span className="text-xs font-medium">{cat.label}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted">{active.blurb}</p>

      {detected && (
        <p className="mt-1.5 text-2xs text-ink-soft">
          <span className="bracket">[~]</span> Auto-routed to{" "}
          <span className="text-ember">{CATEGORIES[detected.category].label}</span>{" "}
          <span className="text-faint tabular-nums">
            ({Math.round(detected.confidence * 100)}%)
          </span>
          {detected.reason && <span className="text-muted"> — {detected.reason}</span>}
        </p>
      )}
      {routeErr && <p className="mt-1.5 text-2xs text-danger">{routeErr}</p>}
    </div>
  );
}
