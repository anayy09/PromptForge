"use client";

import { CATEGORIES, CATEGORY_ORDER } from "@/lib/categories";
import type { AppCategory } from "@/lib/registry";

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
}: {
  value: AppCategory;
  onChange: (c: AppCategory) => void;
}) {
  const active = CATEGORIES[value];

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-2xs uppercase tracking-[0.2em] text-muted">Category</span>
        <span className="text-2xs text-faint">{active.targetNote}</span>
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
    </div>
  );
}
