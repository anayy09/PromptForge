"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { CATEGORY_ORDER } from "@/lib/categories";
import { CATEGORY_META } from "./categoryMeta";
import type { AppCategory } from "@/lib/registry";

/**
 * Simple-mode category control. The task type is detected automatically as the
 * user types; this bar just shows the current pick and lets them override it
 * from a plain dropdown. No "rewriter/target/auto-route" vocabulary.
 */
export function SimpleCategoryBar({
  value,
  onChange,
  detecting,
  wasAutoDetected,
}: {
  value: AppCategory;
  onChange: (c: AppCategory) => void;
  detecting: boolean;
  wasAutoDetected: boolean;
}) {
  const meta = CATEGORY_META[value];
  const Icon = meta.icon;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <span>Treating this as</span>
      <span className="relative inline-flex items-center">
        <span className="pointer-events-none absolute left-2.5 inline-flex text-ember">
          <Icon size={14} strokeWidth={2} aria-hidden />
        </span>
        <select
          aria-label="Type of task"
          value={value}
          onChange={(e) => onChange(e.target.value as AppCategory)}
          suppressHydrationWarning
          className="appearance-none rounded-full border border-hairline bg-surface py-1 pl-8 pr-7 text-xs font-medium text-ink transition-colors hover:border-hairline-strong focus:border-ember focus:outline-none"
        >
          {CATEGORY_ORDER.map((id) => (
            <option key={id} value={id}>
              {CATEGORY_META[id].label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          aria-hidden
          className="pointer-events-none absolute right-2.5 text-muted"
        />
      </span>
      {detecting ? (
        <span className="inline-flex items-center gap-1 text-faint">
          <Loader2 size={12} className="animate-spin" aria-hidden />
          detecting…
        </span>
      ) : (
        wasAutoDetected && <span className="text-faint">· picked automatically</span>
      )}
    </div>
  );
}
