"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { CATEGORY_ORDER } from "@/lib/categories";
import { CATEGORY_META } from "./categoryMeta";
import type { AppCategory } from "@/lib/registry";
import type { ClassifyResponse } from "@/lib/schema";

export function CategoryPicker({
  value,
  onChange,
  rawPrompt,
}: {
  value: AppCategory;
  onChange: (c: AppCategory) => void;
  /** When provided, enables the auto-detect button that classifies this text. */
  rawPrompt?: string;
}) {
  const active = CATEGORY_META[value];
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
        setRouteErr(data.error ?? "Auto-detect failed.");
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
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-muted">Type of task</span>
        {rawPrompt !== undefined && (
          <button
            onClick={autoRoute}
            disabled={!canRoute || routing}
            title="Detect the best type from your prompt"
            className="inline-flex items-center gap-1 text-2xs font-medium text-ember hover:underline disabled:text-faint disabled:no-underline"
          >
            {routing ? (
              <Loader2 size={12} className="animate-spin" aria-hidden />
            ) : (
              <Sparkles size={12} aria-hidden />
            )}
            {routing ? "Detecting…" : "Auto-detect"}
          </button>
        )}
      </div>

      <div role="radiogroup" aria-label="Type of task" className="flex flex-wrap gap-1.5">
        {CATEGORY_ORDER.map((id) => {
          const meta = CATEGORY_META[id];
          const selected = id === value;
          const Icon = meta.icon;
          return (
            <button
              key={id}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(id)}
              className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-all duration-150 ${
                selected
                  ? "border-ember bg-ember/[0.08] text-ink shadow-soft"
                  : "border-hairline bg-surface text-ink-soft hover:border-hairline-strong hover:bg-surface-2"
              }`}
            >
              <Icon
                size={15}
                strokeWidth={2}
                aria-hidden
                className={selected ? "text-ember" : "text-muted group-hover:text-ink-soft"}
              />
              <span className="text-xs font-medium">{meta.label}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-muted">{active.plain}</p>

      {detected && (
        <p className="mt-1.5 text-2xs text-ink-soft">
          Detected <span className="font-medium text-ember">{CATEGORY_META[detected.category].label}</span>{" "}
          <span className="text-faint tabular-nums">({Math.round(detected.confidence * 100)}%)</span>
          {detected.reason && <span className="text-muted"> — {detected.reason}</span>}
        </p>
      )}
      {routeErr && <p className="mt-1.5 text-2xs text-danger">{routeErr}</p>}
    </div>
  );
}
